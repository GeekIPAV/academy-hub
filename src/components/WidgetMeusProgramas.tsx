import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Os Meus Programas</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {data.map((p) => {
            const display = p.cluster_name ? parseCluster(p.cluster_name) : null;
            return (
              <li key={p.cohort_id} className="flex items-center gap-3 px-6 py-3">
                <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
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
      </CardContent>
    </Card>
  );
}

