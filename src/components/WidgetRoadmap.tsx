import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Briefcase,
  Sparkles,
  HeartHandshake,
  Award,
  Loader2,
} from "lucide-react";
import { getRoadmap, type RoadmapItem, type RoadmapPhase } from "@/lib/roadmap.functions";

const ICONS: Record<RoadmapPhase, React.ComponentType<{ className?: string }>> = {
  FTC: GraduationCap,
  FTP: Briefcase,
  SU: Sparkles,
  SF: HeartHandshake,
  FORMADOR: Award,
};

const SHORT: Record<RoadmapPhase, string> = {
  FTC: "FTC",
  FTP: "FTP",
  SU: "SU",
  SF: "SF",
  FORMADOR: "Formador",
};

function statusBadge(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("aberto")) return { label: "Aberto", variant: "default" as const };
  if (s.includes("agendad")) return { label: "Agendado", variant: "secondary" as const };
  if (s.includes("fechad")) return { label: "Fechado", variant: "outline" as const };
  return { label: status ?? "—", variant: "secondary" as const };
}

type NodeState = "done" | "active" | "pending";

function unwrap(r: unknown): { items: RoadmapItem[]; preview: boolean } {
  const candidate =
    (r as { items?: RoadmapItem[] } | null)?.items !== undefined
      ? (r as { items: RoadmapItem[]; preview?: boolean })
      : ((r as { data?: unknown } | null)?.data as
          | { items: RoadmapItem[]; preview?: boolean }
          | undefined) ??
        ((r as { result?: unknown } | null)?.result as
          | { items: RoadmapItem[]; preview?: boolean }
          | undefined);
  return {
    items: Array.isArray(candidate?.items) ? candidate.items : [],
    preview: candidate?.preview === true,
  };
}

export function WidgetRoadmap({
  cohortId,
  programLabel,
}: {
  cohortId?: string;
  programLabel?: string | null;
} = {}) {
  const fetchRoadmap = useServerFn(getRoadmap);
  const [items, setItems] = useState<RoadmapItem[] | null>(null);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setItems(null);
    fetchRoadmap({ data: { cohortId } } as never)
      .then((r: unknown) => {
        if (!mounted) return;
        const { items: arr, preview: isPreview } = unwrap(r);
        setItems(arr);
        setPreview(isPreview);
      })
      .catch((e: Error) => mounted && setError(e.message));
    return () => {
      mounted = false;
    };
  }, [fetchRoadmap, cohortId]);

  if (error) return null;
  if (items && items.length === 0) return null;


  const nodeState = (item: RoadmapItem): NodeState => {
    if (item.achieved) return "done";
    if (item.action) return "active";
    return "pending";
  };

  const doneCount = items ? items.filter((i) => nodeState(i) !== "pending").length : 0;
  const progress =
    items && items.length > 1 ? Math.max(0, (doneCount - 1) / (items.length - 1)) * 100 : 0;

  return (
    <section aria-labelledby="percurso-title">
      <div className="mb-3 flex items-center gap-2">
        <h2
          id="percurso-title"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          O Meu Percurso
        </h2>
        {programLabel && (
          <span className="min-w-0 truncate text-xs text-muted-foreground/80">
            · {programLabel}
          </span>
        )}
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        {preview && (
          <Badge variant="outline" className="shrink-0 text-[11px] font-medium">
            Pré-visualização — não estás inscrito
          </Badge>
        )}
      </div>


      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
        {!items ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="sr-only">A carregar percurso</span>
          </div>
        ) : (
          <ol className="relative flex flex-col gap-6 sm:flex-row sm:gap-2">
            {/* Linha de progresso (desktop) */}
            <div
              className="pointer-events-none absolute left-[10%] right-[10%] top-6 hidden h-1 rounded-full bg-muted sm:block"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            {items.map((item, idx) => {
              const Icon = ICONS[item.phase];
              const state = nodeState(item);
              const isFormadorPhase = item.phase === "FORMADOR";
              const badge = isFormadorPhase
                ? item.achieved
                  ? { label: "Atingido", variant: "default" as const }
                  : { label: "Por atingir", variant: "outline" as const }
                : !item.action
                  ? { label: "A aguardar agendamento", variant: "outline" as const }
                  : statusBadge(item.action.registration_status);

              const circle =
                state === "done"
                  ? "bg-primary text-primary-foreground border-primary"
                  : state === "active"
                    ? "bg-card text-secondary border-primary"
                    : "bg-muted text-muted-foreground border-border";

              const content = (
                <div className="flex items-start gap-4 sm:block">
                  {/* Linha vertical (mobile) */}
                  {idx < items.length - 1 && (
                    <span
                      className="absolute left-6 top-12 h-[calc(100%+0.5rem)] w-px bg-border sm:hidden"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${circle} sm:mx-auto`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1 sm:mt-3 sm:text-center">
                    <p className="text-xs font-bold uppercase tracking-wide text-secondary">
                      {SHORT[item.phase]}
                    </p>
                    {item.label !== SHORT[item.phase] && (
                      <p className="mt-0.5 text-sm font-medium leading-snug text-foreground">
                        {item.label}
                      </p>
                    )}
                    {item.action?.title && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.action.title}
                      </p>
                    )}
                    <Badge variant={badge.variant} className="mt-2 text-[11px]">
                      {badge.label}
                    </Badge>
                  </div>
                </div>
              );

              return (
                <li
                  key={item.phase}
                  className={`relative flex-1 ${state === "pending" ? "opacity-60" : ""}`}
                >
                  {item.action ? (
                    <Link
                      to="/actions/$id"
                      params={{ id: item.action.id }}
                      className="block rounded-2xl p-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="p-1">{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
