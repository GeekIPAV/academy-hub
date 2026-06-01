import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { parseCluster, clusterComponentId } from "@/lib/cluster-utils";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";
import { Loader2, Lock, Pencil, Check, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ClusterCoverRow {
  cluster_name: string;
  description: string | null;
}

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
      const { data, error } = await supabase
        .from("cluster_covers")
        .select("cluster_name, description");
      if (error) throw error;
      const map = new Map<string, ClusterCoverRow>();
      ((data ?? []) as ClusterCoverRow[]).forEach((r) => {
        map.set(r.cluster_name, r);
      });
      return map;
    },
  });

  const setDescription = async (clusterName: string, description: string | null) => {
    const { error } = await supabase
      .from("cluster_covers")
      .upsert({
        cluster_name: clusterName,
        description,
        updated_at: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["cluster-covers"] });
  };

  const clusters = clustersQuery.data ?? [];
  const covers = coversQuery.data ?? new Map<string, ClusterCoverRow>();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ComponentAccessMatrix pagePath="/recursos" />

      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-secondary">
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
          {clusters.map((c) => {
            const row = covers.get(c.name);
            return (
              <ClusterCard
                key={c.slug}
                cluster={c}
                description={row?.description ?? null}
                allowed={isComponentVisible("/recursos", clusterComponentId(c.slug))}
                isAdmin={isAdmin}
                onSaveDescription={(d) => setDescription(c.name, d)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClusterCard({
  cluster,
  description,
  allowed,
  isAdmin,
  onSaveDescription,
}: {
  cluster: ReturnType<typeof parseCluster>;
  description: string | null;
  allowed: boolean;
  isAdmin: boolean;
  onSaveDescription: (description: string | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(description ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(description ?? "");
  }, [description]);

  const save = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    try {
      await onSaveDescription(draft.trim() ? draft.trim() : null);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const cancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft(description ?? "");
    setEditing(false);
  };

  const startEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditing(true);
  };

  const card = (
    <div
      className={cn(
        "group relative flex aspect-[3/4] flex-col rounded-xl border bg-card p-5 transition",
        allowed
          ? "shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          : "cursor-not-allowed border-dashed bg-muted/40",
      )}
    >
      <div className="flex-1 space-y-1">
        <h3
          className={cn(
            "font-bold leading-tight text-2xl",
            allowed ? "text-secondary" : "text-muted-foreground",
          )}
        >
          {cluster.title}
        </h3>
        {cluster.subtitle && (
          <p
            className={cn(
              "text-sm font-medium",
              allowed ? "text-muted-foreground" : "text-muted-foreground/70",
            )}
          >
            {cluster.subtitle}
          </p>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onClick={(e) => e.preventDefault()}
              placeholder="Pequena descrição visível no cartão…"
              rows={3}
              className="text-xs"
              maxLength={240}
            />
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={cancel}
                disabled={saving}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={save}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {description ? (
              <p
                className={cn(
                  "text-xs leading-relaxed",
                  allowed ? "text-foreground/80" : "text-muted-foreground/70",
                )}
              >
                {description}
              </p>
            ) : isAdmin ? (
              <button
                type="button"
                onClick={startEdit}
                className="text-xs italic text-muted-foreground/60 hover:text-muted-foreground"
              >
                Adicionar descrição…
              </button>
            ) : null}
            {!allowed && (
              <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Bloqueado
              </div>
            )}
          </>
        )}
      </div>

      {isAdmin && !editing && description && (
        <button
          type="button"
          onClick={startEdit}
          className="absolute right-2 top-2 rounded-md bg-background/80 p-1 text-muted-foreground opacity-0 shadow-sm transition hover:text-foreground group-hover:opacity-100"
          aria-label="Editar descrição"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
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
          <TooltipContent>Não tens acesso a este cluster.</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (editing) {
    return <div className="block">{card}</div>;
  }

  return (
    <Link
      to="/recursos/$cluster"
      params={{ cluster: cluster.slug }}
      className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {card}
    </Link>
  );
}
