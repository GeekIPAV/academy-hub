import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { renameCluster } from "@/lib/clusters.functions";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { parseCluster, clusterComponentId } from "@/lib/cluster-utils";
import { hasCentroRecursosAccess } from "@/lib/centro-recursos-access";
import { useUserBadgeClusterSlugs } from "@/hooks/use-badge-access";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ClusterCoverRow {
  cluster_name: string;
  description: string | null;
}

export const Route = createFileRoute("/_authenticated/recursos/")({
  head: () => ({ meta: [{ title: "Centro de recursos | Academia de Líderes Ubuntu" }] }),
  component: ResourcesIndex,
});

function ResourcesIndex() {
  const { isComponentVisible, isAdmin, activeRoles } = useApp();
  const roleAccess = hasCentroRecursosAccess(activeRoles);
  const badgeSlugs = useUserBadgeClusterSlugs();
  const qc = useQueryClient();
  const renameFn = useServerFn(renameCluster);

  const clustersQuery = useQuery({
    queryKey: ["clusters-parsed"],
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

  const saveProperties = async (
    clusterName: string,
    next: { name: string; description: string | null },
  ) => {
    let finalName = clusterName;
    try {
      if (next.name !== clusterName) {
        const res = await renameFn({ data: { from: clusterName, to: next.name } });
        finalName = res.name;
      }
      await setDescription(finalName, next.description);
      if (finalName !== clusterName) {
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["clusters-parsed"] }),
          qc.invalidateQueries({ queryKey: ["clusters", "v2"] }),
          qc.invalidateQueries({ queryKey: ["cluster-by-slug"] }),
          qc.invalidateQueries({ queryKey: ["temas"] }),
        ]);
      }
      toast.success("Propriedades guardadas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível guardar.");
      throw e;
    }
  };

  const clusters = clustersQuery.data ?? [];
  const covers = coversQuery.data ?? new Map<string, ClusterCoverRow>();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ComponentAccessMatrix pagePath="/recursos" />

      <PageHeader
        eyebrow="Aprender"
        title="Centro de recursos"
        description="Materiais pedagógicos organizados por cluster. Escolhe um cluster para explorares os temas e os recursos."
      />

      {clustersQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : clusters.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Ainda não existem clusters configurados nos programas.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {clusters.map((c) => {
            const row = covers.get(c.name);
            return (
              <ClusterCard
                key={c.slug}
                cluster={c}
                description={row?.description ?? null}
                allowed={isAdmin || roleAccess || isComponentVisible("/recursos", clusterComponentId(c.slug)) || badgeSlugs.has(c.slug)}
                isAdmin={isAdmin}
                onSaveProperties={(next) => saveProperties(c.name, next)}
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
  onSaveProperties,
}: {
  cluster: ReturnType<typeof parseCluster>;
  description: string | null;
  allowed: boolean;
  isAdmin: boolean;
  onSaveProperties: (next: { name: string; description: string | null }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(description ?? "");
  const [titleDraft, setTitleDraft] = useState(cluster.title);
  const [subtitleDraft, setSubtitleDraft] = useState(cluster.subtitle ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(description ?? "");
  }, [description]);

  useEffect(() => {
    setTitleDraft(cluster.title);
    setSubtitleDraft(cluster.subtitle ?? "");
  }, [cluster.title, cluster.subtitle]);

  const save = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const title = titleDraft.trim();
    if (!title) {
      toast.error("O nome não pode ficar vazio.");
      return;
    }
    const subtitle = subtitleDraft.trim();
    // O nome guardado continua a ser "Título - Subtítulo".
    const name = subtitle ? `${title} - ${subtitle}` : title;
    setSaving(true);
    try {
      await onSaveProperties({ name, description: draft.trim() ? draft.trim() : null });
      setEditing(false);
    } catch {
      // erro já mostrado
    } finally {
      setSaving(false);
    }
  };

  const cancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft(description ?? "");
    setTitleDraft(cluster.title);
    setSubtitleDraft(cluster.subtitle ?? "");
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
        "group relative flex flex-col rounded-xl border bg-card p-5 transition",
        editing ? "min-h-0" : "aspect-[3/4]",
        allowed
          ? "shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          : "cursor-not-allowed border-dashed bg-muted/40",
      )}
    >
      <div className={cn("flex-1 space-y-1", editing && "hidden")}>
        <h3
          className={cn(
            "break-words font-bold leading-tight text-xl sm:text-2xl",
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
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder="Nome da formação"
              aria-label="Nome da formação"
              className="h-8 text-sm"
              maxLength={160}
            />
            <Input
              value={subtitleDraft}
              onChange={(e) => setSubtitleDraft(e.target.value)}
              placeholder="Subtítulo (opcional)"
              aria-label="Subtítulo"
              className="h-8 text-xs"
              maxLength={90}
            />
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

      {isAdmin && !editing && (
        <button
          type="button"
          onClick={startEdit}
          className="absolute right-2 top-2 rounded-md bg-background/80 p-1 text-muted-foreground opacity-0 shadow-sm transition hover:text-foreground group-hover:opacity-100"
          aria-label="Editar propriedades"
          title="Editar nome e descrição"
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
