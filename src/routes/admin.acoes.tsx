import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, ListChecks, Settings2, ShieldAlert, Table2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useApp } from "@/lib/app-context";
import { listAcoesFull, type AcaoRow } from "@/lib/admin-acoes-gestao.functions";
import { AcoesDataTable } from "@/components/admin/acoes/AcoesDataTable";
import {
  AcoesCalendar,
  DEFAULT_CARD_FIELDS,
  type CardFieldsConfig,
} from "@/components/admin/acoes/AcoesCalendar";
import { AcaoDetailDrawer } from "@/components/admin/acoes/AcaoDetailDrawer";

export const Route = createFileRoute("/admin/acoes")({
  head: () => ({ meta: [{ title: "Gestão de Ações — Admin" }] }),
  component: AdminAcoesPage,
});

type ViewMode = "table" | "calendar";
type SortKey = "action_date_desc" | "action_date_asc" | "title_asc";

function AdminAcoesPage() {
  const { isAdmin } = useApp();
  const fetchAcoes = useServerFn(listAcoesFull);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-acoes-full"],
    queryFn: () => fetchAcoes(),
    enabled: isAdmin,
  });
  const acoes = (data ?? []) as AcaoRow[];

  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("__all");
  const [regStatus, setRegStatus] = useState<string>("__all");
  const [sortKey, setSortKey] = useState<SortKey>("action_date_desc");
  const [cardFields, setCardFields] = useState<CardFieldsConfig>(DEFAULT_CARD_FIELDS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(acoes.map((a) => a.category).filter(Boolean) as string[])).sort(),
    [acoes],
  );
  const statuses = useMemo(
    () =>
      Array.from(new Set(acoes.map((a) => a.registration_status).filter(Boolean) as string[])).sort(),
    [acoes],
  );

  const filtered = useMemo(() => {
    let out = acoes;
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (a) =>
          (a.title ?? "").toLowerCase().includes(q) ||
          (a.programa_title ?? "").toLowerCase().includes(q) ||
          (a.entidade_nome ?? "").toLowerCase().includes(q),
      );
    }
    if (category !== "__all") out = out.filter((a) => a.category === category);
    if (regStatus !== "__all") out = out.filter((a) => a.registration_status === regStatus);
    out = [...out].sort((a, b) => {
      if (sortKey === "title_asc") return (a.title ?? "").localeCompare(b.title ?? "");
      const ad = a.action_date ?? "";
      const bd = b.action_date ?? "";
      return sortKey === "action_date_asc" ? ad.localeCompare(bd) : bd.localeCompare(ad);
    });
    return out;
  }, [acoes, search, category, regStatus, sortKey]);

  const selected = useMemo(
    () => acoes.find((a) => a.id === selectedId) ?? null,
    [acoes, selectedId],
  );

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta área é exclusiva para administradores.
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ListChecks className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-semibold tracking-tight">Gestão de Ações</h1>
          <p className="text-sm text-muted-foreground">
            Vista de tabela e calendário com filtros globais.
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Label className="mb-1 block text-xs uppercase text-muted-foreground">Pesquisar</Label>
            <Input
              placeholder="Título, programa, entidade…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase text-muted-foreground">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase text-muted-foreground">Inscrições</Label>
            <Select value={regStatus} onValueChange={setRegStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                {statuses.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase text-muted-foreground">Ordenar</Label>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="action_date_desc">Data (mais recente)</SelectItem>
                <SelectItem value="action_date_asc">Data (mais antiga)</SelectItem>
                <SelectItem value="title_asc">Título A→Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {view === "calendar" && <CardConfigPopover value={cardFields} onChange={setCardFields} />}
            <div className="inline-flex rounded-md border bg-background p-1">
              <Button
                type="button"
                variant={view === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("table")}
                className="h-7"
              >
                <Table2 className="mr-1 h-3.5 w-3.5" /> Tabela
              </Button>
              <Button
                type="button"
                variant={view === "calendar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("calendar")}
                className="h-7"
              >
                <CalendarDays className="mr-1 h-3.5 w-3.5" /> Calendário
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : view === "table" ? (
        <AcoesDataTable data={filtered} onOpen={setSelectedId} />
      ) : (
        <AcoesCalendar data={filtered} cardFields={cardFields} onOpen={setSelectedId} />
      )}

      <AcaoDetailDrawer
        acao={selected}
        open={!!selectedId}
        onOpenChange={(o) => !o && setSelectedId(null)}
      />
    </div>
  );
}

function CardConfigPopover({
  value,
  onChange,
}: {
  value: CardFieldsConfig;
  onChange: (v: CardFieldsConfig) => void;
}) {
  const options: { key: keyof CardFieldsConfig; label: string }[] = [
    { key: "showDate", label: "Data" },
    { key: "showCategory", label: "Categoria" },
    { key: "showStatus", label: "Estado de inscrições" },
    { key: "showCapacity", label: "Capacidade" },
    { key: "showPrograma", label: "Programa" },
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7">
          <Settings2 className="mr-1 h-3.5 w-3.5" /> Configurar Cartões
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <p className="mb-2 text-sm font-medium">Propriedades visíveis</p>
        <div className="space-y-2">
          {options.map((o) => (
            <label key={o.key} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={value[o.key]}
                onCheckedChange={(c) => onChange({ ...value, [o.key]: !!c })}
              />
              {o.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
