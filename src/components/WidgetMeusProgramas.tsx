import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { GraduationCap } from "lucide-react";
import { getMeusProgramas } from "@/lib/meus-programas.functions";
import { parseCluster } from "@/lib/cluster-utils";

export function WidgetMeusProgramas() {
  const fetchFn = useServerFn(getMeusProgramas);
  const { data, isLoading } = useQuery({
    queryKey: ["meus-programas"],
    queryFn: () => fetchFn(),
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <section aria-labelledby="meus-programas-title">
      <div className="mb-3 flex items-center gap-3">
        <h2 id="meus-programas-title" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Os Meus Programas
        </h2>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {data.map((p) => {
          const display = p.cluster_name ? parseCluster(p.cluster_name) : null;
          return (
            <li
              key={p.cohort_id}
              className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary"
                aria-hidden="true"
              >
                <GraduationCap className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {display?.title ?? p.program_title ?? "Programa"}
                </p>
                {(display?.subtitle || p.program_title) && (
                  <p className="truncate text-xs text-muted-foreground">
                    {display?.subtitle ?? p.program_title}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
