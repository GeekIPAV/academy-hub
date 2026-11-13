import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, ListChecks, Settings2, Table2 } from "lucide-react";
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
import { listAcoesFull, type AcaoRow } from "@/lib/admin-acoes-gestao.functions";
import { AcoesDataTable } from "@/components/admin/acoes/AcoesDataTable";
import {
  AcoesCalendar,
  DEFAULT_CARD_FIELDS,
  type CardFieldsConfig,
} from "@/components/admin/acoes/AcoesCalendar";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { resumoAvaliacoesAcoes } from "@/lib/avaliacao-acoes.functions";
import { INSCRICOES_ABERTAS } from "@/lib/acoes-opcoes";
import { RouteGate } from "@/components/RouteGate";

export const Route = createFileRoute("/admin/acoes/")({
  head: () => ({ meta: [{ title: "Ações | Gestão" }] }),
  component: () => (
    <RouteGate path="/admin/acoes">
      <AdminAcoesPage />
    </RouteGate>
  ),
});


type ViewMode = "table" | "calendar";
type FiltroRapido = "todas" | "proximas" | "abertas" | "por_confirmar" | "sem_avaliacao";

function hojeISO(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}
type SortKey = "start_date_desc" | "start_date_asc" | "title_asc";

function AdminAcoesPage() {
  const fetchAcoes = useServerFn(listAcoesFull);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-acoes-full"],
    queryFn: () => fetchAcoes(),
  });
  const acoes = (data ?? []) as AcaoRow[];


  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [formato, setFormato] = useState<string>("__all");
  const [regStatus, setRegStatus] = useState<string>("__all");
  const [sortKey, setSortKey] = useState<SortKey>("start_date_desc");
  const [cardFields, setCardFields] = useState<CardFieldsConfig>(DEFAULT_CARD_FIELDS);
  const [rapido, setRapido] = useState<FiltroRapido>("todas");
  const [programa, setPrograma] = useState<string>("__all");
  const navigate = useNavigate();
  const abrir = (id: string) => navigate({ to: "/admin/acoes/$id", params: { id } });
  const fetchResumo = useServerFn(resumoAvaliacoesAcoes);
  const { data: resumoAval } = useQuery({
    queryKey: ["admin-acoes-resumo-avaliacoes"],
    queryFn: () => fetchResumo(),
    retry: false,
  });

  const formatos = useMemo(
    () => Array.from(new Set(acoes.map((a) => a.formato).filter(Boolean) as string[])).sort(),
    [acoes],
  );
  const statuses = useMemo(
    () =>
      Array.from(new Set(acoes.map((a) => a.registration_status).filter(Boolean) as string[])).sort(),
    [acoes],
  );

  const programas = useMemo(
    () => Array.from(new Set(acoes.map((a) => a.programa_title).filter(Boolean) as string[])).sort(),
    [acoes],
  );

  const passaRapido = (a: AcaoRow, f: FiltroRapido) => {
    if (f === "proximas") {
      const d = a.start_date ?? "";
      return d >= hojeISO() && d <= hojeISO(30);
    }
    if (f === "abertas") return a.registration_status === INSCRICOES_ABERTAS;
    if (f === "por_confirmar") {
      const s = (a.status ?? "").toLowerCase();
      return !s.startsWith("confirm") && !s.startsWith("cancel") && !s.startsWith("realiz") && !s.startsWith("conclu");
    }
    if (f === "sem_avaliacao") {
      const s = (a.status ?? "").toLowerCase();
      return !!resumoAval && !resumoAval[a.id] && !s.startsWith("cancel");
    }
    return true;
  };
  const contagens = useMemo(() => {
    const ids: FiltroRapido[] = ["todas", "proximas", "abertas", "por_confirmar", "sem_avaliacao"];
    return Object.fromEntries(ids.map((f) => [f, acoes.filter((a) => passaRapido(a, f)).length])) as Record<FiltroRapido, number>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acoes, resumoAval]);

  const filtered = useMemo(() => {
    let out = acoes.filter((a) => passaRapido(a, rapido));
    if (programa !== "__all") out = out.filter((a) => a.programa_title === programa);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (a) =>
          (a.title ?? "").toLowerCase().includes(q) ||
          (a.programa_title ?? "").toLowerCase().includes(q) ||
          (a.entidade_nome ?? "").toLowerCase().includes(q),
      );
    }
    if (formato !== "__all") out = out.filter((a) => a.formato === formato);
    if (regStatus !== "__all") out = out.filter((a) => a.registration_status === regStatus);
    out = [...out].sort((a, b) => {
      if (sortKey === "title_asc") return (a.title ?? "").localeCompare(b.title ?? "");
      const ad = a.start_date ?? "";
      const bd = b.start_date ?? "";
      return sortKey === "start_date_asc" ? ad.localeCompare(bd) : bd.localeCompare(ad);
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acoes, search, formato, regStatus, sortKey, rapido, programa, resumoAval]);




  const rapidos: { id: FiltroRapido; label: string }[] = [
    { id: "todas", label: "Todas" },
    { id: "proximas", label: "Próximos 30 dias" },
    { id: "abertas", label: "Inscrições abertas" },
    { id: "por_confirmar", label: "Por confirmar" },
    { id: "sem_avaliacao", label: "Sem avaliação" },
  ];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Programas e ações"
        title="Ações"
        description="Todas as ações dos programas num só sítio: estado, inscrições e avaliações. Abre uma ação para a editar."
        actions={
          <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Vista">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
              className={`h-8 ${view === "table" ? "bg-card text-secondary shadow-sm hover:bg-card" : "text-muted-foreground"}`}
            >
              <Table2 className="mr-1.5 h-4 w-4" /> Tabela
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={view === "calendar"}
              onClick={() => setView("calendar")}
              className={`h-8 ${view === "calendar" ? "bg-card text-secondary shadow-sm hover:bg-card" : "text-muted-foreground"}`}
            >
              <CalendarDays className="mr-1.5 h-4 w-4" /> Calendário
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros rápidos">
        {rapidos.map((r) => {
          const on = rapido === r.id;
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={on}
              onClick={() => setRapido(r.id)}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                on ? "border-secondary bg-secondary text-white" : "bg-card text-secondary hover:border-secondary"
              }`}
            >
              {r.label}
              <span className={`rounded-full px-2 text-xs ${on ? "bg-white/20" : "bg-muted"}`}>
                {r.id === "sem_avaliacao" && !resumoAval ? "…" : contagens[r.id]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-1 items-end gap-3 border-b p-4 sm:grid-cols-2 xl:flex xl:flex-wrap">
          <div className="min-w-0 sm:col-span-2 xl:min-w-[220px] xl:flex-1">
            <Label htmlFor="acoes-q" className="mb-1.5 block text-[13px] font-medium text-secondary">Pesquisar</Label>
            <Input
              id="acoes-q"
              placeholder="Título, programa ou organização"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <FiltroSelect id="acoes-programa" label="Programa" value={programa} onChange={setPrograma} opcoes={programas} largura="xl:w-[200px]" />
          <FiltroSelect id="acoes-formato" label="Formato" value={formato} onChange={setFormato} opcoes={formatos} largura="xl:w-[150px]" />
          <FiltroSelect id="acoes-inscricoes" label="Inscrições" value={regStatus} onChange={setRegStatus} opcoes={statuses} largura="xl:w-[150px]" />
          <div>
            <Label htmlFor="acoes-ordem" className="mb-1.5 block text-[13px] font-medium text-secondary">Ordenar</Label>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger id="acoes-ordem" className="w-full xl:w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start_date_desc">Data, mais recente</SelectItem>
                <SelectItem value="start_date_asc">Data, mais antiga</SelectItem>
                <SelectItem value="title_asc">Título, A a Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {view === "calendar" && (
            <div className="xl:ml-auto">
              <CardConfigPopover value={cardFields} onChange={setCardFields} />
            </div>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="m-4 h-96" />
        ) : view === "table" ? (
          <AcoesDataTable data={filtered} onOpen={abrir} resumoAvaliacoes={resumoAval} />
        ) : (
          <div className="p-4">
            <AcoesCalendar data={filtered} cardFields={cardFields} onOpen={abrir} />
          </div>
        )}
        {!isLoading && (
          <p className="border-t px-4 py-3 text-sm text-muted-foreground">
            {filtered.length} de {acoes.length} ações
          </p>
        )}
      </div>
    </PageShell>
  );
}

function FiltroSelect({
  id,
  label,
  value,
  onChange,
  opcoes,
  largura,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  opcoes: string[];
  largura: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-secondary">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className={`w-full ${largura}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">Todos</SelectItem>
          {opcoes.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
        <Button variant="outline">
          <Settings2 className="mr-1.5 h-4 w-4" /> Configurar cartões
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
