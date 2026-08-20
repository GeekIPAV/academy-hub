import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { GraduationCap, ChevronRight, ChevronDown } from "lucide-react";
import { getMeusProgramas } from "@/lib/meus-programas.functions";
import { parseCluster } from "@/lib/cluster-utils";
import { WidgetRoadmap } from "@/components/WidgetRoadmap";

export function WidgetMeusProgramas({ showRoadmap = true }: { showRoadmap?: boolean }) {
  const fetchFn = useServerFn(getMeusProgramas);
  const { data, isLoading } = useQuery({
    queryKey: ["meus-programas"],
    queryFn: () => fetchFn(),
  });
  const [selected, setSelected] = useState<string | null>(null);

  // Com um único programa não há ambiguidade: abre logo.
  useEffect(() => {
    if (data && data.length === 1) setSelected(data[0].cohort_id);
  }, [data]);

  if (isLoading || !data) return null;
  // Sem programas: mantém a pré-visualização de admin do percurso.
  if (data.length === 0) return showRoadmap ? <WidgetRoadmap /> : null;

  const selectedPrograma = data.find((p) => p.cohort_id === selected) ?? null;
  const labelOf = (p: (typeof data)[number]) => {
    const display = p.cluster_name ? parseCluster(p.cluster_name) : null;
    return display?.subtitle
      ? `${display.title} · ${display.subtitle}`
      : (display?.title ?? p.program_title ?? "Programa");
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="meus-programas-title">
        <div className="mb-3 flex items-center gap-3">
          <h2
            id="meus-programas-title"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Os Meus Programas
          </h2>
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
          {data.length > 1 && (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              Clica para ver o percurso
            </span>
          )}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.map((p) => {
            const isOpen = selected === p.cohort_id;
            const Chevron = isOpen ? ChevronDown : ChevronRight;
            return (
              <li key={p.cohort_id}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setSelected(isOpen && data.length > 1 ? null : p.cohort_id)}
                  className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isOpen ? "border-primary/60 ring-1 ring-primary/20" : "border-border"
                  }`}
                >
                  <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary"
                    aria-hidden="true"
                  >
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium leading-tight text-foreground">
                    {labelOf(p)}
                  </span>
                  <Chevron
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {showRoadmap && selectedPrograma && (
        <WidgetRoadmap
          key={selectedPrograma.cohort_id}
          cohortId={selectedPrograma.cohort_id}
          programLabel={data.length > 1 ? labelOf(selectedPrograma) : null}
        />
      )}
    </div>
  );
}
