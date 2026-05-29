import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { parseCluster, clusterComponentId } from "@/lib/cluster-utils";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";
import { Loader2, Lock, ImageIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CoverUploader } from "@/components/CoverUploader";

export const Route = createFileRoute("/_authenticated/recursos/")({
  head: () => ({ meta: [{ title: "Centro de Recursos — Academia Ubuntu" }] }),
  component: ResourcesIndex,
});

function ResourcesIndex() {
  const { isComponentVisible, isAdmin } = useApp();
  const qc = useQueryClient();

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

  const coversQuery = useQuery({
    queryKey: ["cluster-covers"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("cluster_covers")
        .select("cluster_name, cover_url");
      if (error) throw error;
      const map = new Map<string, string>();
      ((data ?? []) as { cluster_name: string; cover_url: string | null }[]).forEach((r) => {
        if (r.cover_url) map.set(r.cluster_name, r.cover_url);
      });
      return map;
    },
  });

  const setCover = async (clusterName: string, url: string | null) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("cluster_covers")
      .upsert({ cluster_name: clusterName, cover_url: url, updated_at: new Date().toISOString() });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["cluster-covers"] });
  };

  const clusters = clustersQuery.data ?? [];
  const covers = coversQuery.data ?? new Map<string, string>();

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
              coverUrl={covers.get(c.name) ?? null}
              allowed={isComponentVisible("/recursos", clusterComponentId(c.slug))}
              isAdmin={isAdmin}
              onSetCover={(url) => setCover(c.name, url)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClusterCard({
  cluster,
  coverUrl,
  allowed,
  isAdmin,
  onSetCover,
}: {
  cluster: ReturnType<typeof parseCluster>;
  coverUrl: string | null;
  allowed: boolean;
  isAdmin: boolean;
  onSetCover: (url: string | null) => Promise<void>;
}) {
  const card = (
    <div
      className={cn(
        "group relative flex aspect-[3/4] flex-col overflow-hidden rounded-xl border transition",
        allowed
          ? "bg-card shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          : "cursor-not-allowed border-dashed bg-muted/40 text-muted-foreground",
      )}
    >
      <div className="relative flex-1 overflow-hidden bg-gradient-to-br from-primary/10 via-muted to-primary/5">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className={cn(
              "h-full w-full object-cover transition group-hover:scale-[1.02]",
              !allowed && "opacity-40 grayscale",
            )}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        {isAdmin && (
          <CoverUploader
            folder="clusters"
            id={cluster.slug}
            currentUrl={coverUrl}
            onUploaded={(url) => onSetCover(url)}
            onCleared={() => onSetCover(null)}
          />
        )}
      </div>
      <div className="space-y-1 p-3">
        <h3
          className={cn(
            "text-base font-semibold leading-tight",
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
        {!allowed && (
          <div className="flex items-center gap-1.5 pt-1 text-xs">
            <Lock className="h-3.5 w-3.5" /> Bloqueado
          </div>
        )}
      </div>
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
          <TooltipContent>Não tens acesso a este cluster.</TooltipContent>
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
