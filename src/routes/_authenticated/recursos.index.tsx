import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { parseCluster, clusterComponentId } from "@/lib/cluster-utils";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";
import { Loader2, Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/recursos/")({
  head: () => ({ meta: [{ title: "Centro de Recursos — Academia Ubuntu" }] }),
  component: ResourcesIndex,
});

function ResourcesIndex() {
  const { isComponentVisible } = useApp();

  const clustersQuery = useQuery({
    queryKey: ["clusters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programas")
        .select("cluster")
        .not("cluster", "is", null);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r) => {
        const c = (r as { cluster: string | null }).cluster;
        if (c && c.trim()) set.add(c.trim());
      });
      return Array.from(set)
        .sort((a, b) => a.localeCompare(b, "pt"))
        .map(parseCluster);
    },
  });

  const clusters = clustersQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ComponentAccessMatrix pagePath="/recursos" />

      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-primary">
          Centro de Recursos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Materiais pedagógicos organizados por cluster. Seleciona um cluster
          para explorares os temas e respetivos recursos.
        </p>
      </header>

      {clustersQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : clusters.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Ainda não existem clusters configurados nos programas.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {clusters.map((c) => (
            <ClusterCard
              key={c.slug}
              cluster={c}
              allowed={isComponentVisible("/recursos", clusterComponentId(c.slug))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClusterCard({
  cluster,
  allowed,
}: {
  cluster: ReturnType<typeof parseCluster>;
  allowed: boolean;
}) {
  const card = (
    <div
      className={cn(
        "group relative flex aspect-[3/4] flex-col justify-between rounded-xl border p-5 transition",
        allowed
          ? "bg-card shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          : "cursor-not-allowed border-dashed bg-muted/40 text-muted-foreground",
      )}
    >
      <div className="space-y-1">
        <h3
          className={cn(
            "text-lg font-semibold leading-tight",
            allowed ? "text-primary" : "text-muted-foreground",
          )}
        >
          {cluster.title}
        </h3>
        {cluster.subtitle && (
          <p className="text-xs font-medium text-muted-foreground">
            {cluster.subtitle}
          </p>
        )}
      </div>
      {!allowed && (
        <div className="flex items-center gap-1.5 text-xs">
          <Lock className="h-3.5 w-3.5" /> Bloqueado
        </div>
      )}
    </div>
  );

  if (!allowed) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div aria-disabled className="select-none">
              {card}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Não tens acesso a este cluster.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link
      to="/recursos/$cluster"
      params={{ cluster: cluster.slug }}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
    >
      {card}
    </Link>
  );
}
