import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, LayoutGrid, Loader2, MapPin } from "lucide-react";
import { listAcoesPublicas, type AcaoPublicaRow } from "@/lib/actions.functions";
import { CoverImage } from "@/components/CoverImage";
import { RouteGate } from "@/components/RouteGate";
import { AcoesCalendar, DEFAULT_CARD_FIELDS } from "@/components/admin/acoes/AcoesCalendar";
import type { AcaoRow } from "@/lib/admin-acoes-gestao.functions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/acoes")({
  head: () => ({
    meta: [
      { title: "Ações — Academia de Líderes Ubuntu" },
      {
        name: "description",
        content:
          "Galeria de ações e eventos da Academia de Líderes Ubuntu com inscrições abertas, em vista de cartões ou calendário.",
      },
      { property: "og:title", content: "Ações — Academia de Líderes Ubuntu" },
      {
        property: "og:description",
        content: "Consulta e inscreve-te nas ações com inscrições abertas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RouteGate path="/acoes">
      <AcoesPublicPage />
    </RouteGate>
  ),
});

const ALL = "__all";

function formatDate(d: string | null) {
  if (!d) return null;
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function AcoesPublicPage() {
  const fetchFn = useServerFn(listAcoesPublicas);
  const navigate = useNavigate();
  const [view, setView] = useState<"galeria" | "calendario">("galeria");
  const [produto, setProduto] = useState(ALL);
  const [formato, setFormato] = useState(ALL);
  const [local, setLocal] = useState(ALL);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["acoes-publicas"],
    queryFn: () => fetchFn() as Promise<AcaoPublicaRow[]>,
  });

  const options = useMemo(() => {
    const uniq = (vals: (string | null)[]) =>
      Array.from(new Set(vals.filter((v): v is string => !!v && v.trim() !== ""))).sort((a, b) =>
        a.localeCompare(b, "pt"),
      );
    return {
      produtos: uniq(data.map((a) => a.produto)),
      formatos: uniq(data.map((a) => a.formato)),
      locais: uniq(data.map((a) => a.localizacao)),
    };
  }, [data]);

  const filtered = useMemo(
    () =>
      data.filter(
        (a) =>
          (produto === ALL || a.produto === produto) &&
          (formato === ALL || a.formato === formato) &&
          (local === ALL || a.localizacao === local),
      ),
    [data, produto, formato, local],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-secondary">Ações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Eventos e formações da comunidade Ubuntu. Escolhe uma ação para saberes mais e
            inscreveres-te.
          </p>
        </div>
        <div className="flex rounded-md border p-0.5">
          <Button
            type="button"
            size="sm"
            variant={view === "galeria" ? "secondary" : "ghost"}
            onClick={() => setView("galeria")}
          >
            <LayoutGrid className="mr-1.5 h-4 w-4" /> Galeria
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "calendario" ? "secondary" : "ghost"}
            onClick={() => setView("calendario")}
          >
            <CalendarDays className="mr-1.5 h-4 w-4" /> Calendário
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="Produto"
          value={produto}
          onChange={setProduto}
          options={options.produtos}
        />
        <FilterSelect
          label="Formato"
          value={formato}
          onChange={setFormato}
          options={options.formatos}
        />
        <FilterSelect label="Localização" value={local} onChange={setLocal} options={options.locais} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-destructive">
          Erro a carregar ações: {(error as Error).message}
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Não existem ações com inscrições abertas de momento.
        </p>
      ) : view === "calendario" ? (
        <AcoesCalendar
          data={filtered as unknown as AcaoRow[]}
          cardFields={{ ...DEFAULT_CARD_FIELDS, showPrograma: true }}
          onOpen={(id) => navigate({ to: "/evento/$id", params: { id } })}
        />
      ) : (
        <GaleriaAcoes acoes={filtered} />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  if (options.length === 0) return null;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[190px] text-sm">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label}: todos</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "open" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "open"
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function GaleriaAcoes({ acoes }: { acoes: AcaoPublicaRow[] }) {
  const grouped = useMemo(() => {
    const byProgram = new Map<string, AcaoPublicaRow[]>();
    const withoutProgram: AcaoPublicaRow[] = [];
    for (const a of acoes) {
      const title = a.programa_title?.trim();
      if (title) {
        if (!byProgram.has(title)) byProgram.set(title, []);
        byProgram.get(title)!.push(a);
      } else {
        withoutProgram.push(a);
      }
    }
    return { sections: Array.from(byProgram.entries()), withoutProgram };
  }, [acoes]);

  return (
    <div className="space-y-8">
      {grouped.sections.map(([title, items]) => (
        <section key={title}>
          <h2 className="mb-3 text-lg font-semibold tracking-tight text-secondary">{title}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <AcaoCard key={a.id} acao={a} />
            ))}
          </div>
        </section>
      ))}
      {grouped.withoutProgram.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {grouped.withoutProgram.map((a) => (
            <AcaoCard key={a.id} acao={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AcaoCard({ acao }: { acao: AcaoPublicaRow }) {
  const aberto = (acao.registration_status ?? "").trim().toLowerCase() === "aberto";
  return (
    <Link
      to="/evento/$id"
      params={{ id: acao.id }}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
        {acao.cover_url ? (
          <CoverImage
            src={acao.cover_url}
            alt={acao.title ?? ""}
            position={acao.cover_position}
            scale={acao.cover_scale}
            className="transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Sem imagem
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-semibold leading-tight text-secondary">
          {acao.title ?? "(sem título)"}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {acao.produto && <Pill>{acao.produto}</Pill>}
          {acao.formato && <Pill>{acao.formato}</Pill>}
          <Pill tone={aberto ? "open" : "muted"}>
            {aberto ? "Inscrições abertas" : "Inscrições em breve"}
          </Pill>
        </div>
        <div className="mt-auto space-y-1 pt-1 text-xs text-muted-foreground">
          {acao.start_date && (
            <p className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(acao.start_date)}
            </p>
          )}
          {acao.localizacao && (
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {acao.localizacao}
            </p>
          )}
          {acao.programa_title && <p className="truncate">{acao.programa_title}</p>}
        </div>
      </div>
    </Link>
  );
}
