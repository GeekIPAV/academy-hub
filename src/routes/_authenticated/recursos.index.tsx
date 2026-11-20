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
import { ArrowRight, Loader2, Lock, Pencil, Check, X } from "lucide-react";
import { CoverImage } from "@/components/CoverImage";
import { CoverUploader } from "@/components/CoverUploader";
import { sigla } from "@/lib/recursos-ui";
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
import { seo, titulo } from "@/lib/seo";

interface ClusterCoverRow {
  cluster_name: string;
  description: string | null;
  cover_url: string | null;
  cover_position: string | null;
  cover_scale: number | null;
}

type CoverPatch = { cover_url?: string | null; cover_position?: string; cover_scale?: number };

export const Route = createFileRoute("/_authenticated/recursos/")({
  head: () => ({
    meta: seo({
      title: titulo("Centro de recursos"),
      description: "Planos de sessão, materiais e recursos pedagógicos Ubuntu organizados por cluster e tema.",
      privada: true,
    }),
  }),
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
        .select("cluster_name, description, cover_url, cover_position, cover_scale");
      if (error) throw error;
      const map = new Map<string, ClusterCoverRow>();
      ((data ?? []) as ClusterCoverRow[]).forEach((r) => {
        map.set(r.cluster_name, r);
      });
      return map;
    },
  });

  // Número de temas por formação (só conta os que a pessoa pode ver).
  const temasCountQuery = useQuery({
    queryKey: ["temas-count-por-cluster"],
    queryFn: async () => {
      const { data, error } = await supabase.from("temas_momentos").select("cluster");
      if (error) throw error;
      const map = new Map<string, number>();
      ((data ?? []) as { cluster: string }[]).forEach((r) => {
        map.set(r.cluster, (map.get(r.cluster) ?? 0) + 1);
      });
      return map;
    },
  });

  const setCover = async (clusterName: string, patch: CoverPatch) => {
    const { error } = await supabase
      .from("cluster_covers")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert({ cluster_name: clusterName, ...patch, updated_at: new Date().toISOString() } as any);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["cluster-covers"] });
  };

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
        description="Materiais pedagógicos organizados por formação. Escolhe uma formação para explorares os temas e os recursos."
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
        <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {clusters.map((c) => {
            const row = covers.get(c.name);
            return (
              <ClusterCard
                key={c.slug}
                cluster={c}
                description={row?.description ?? null}
                cover={row ?? null}
                temasCount={temasCountQuery.data?.get(c.name) ?? null}
                onSetCover={(patch) => setCover(c.name, patch)}
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
  cover,
  temasCount,
  onSetCover,
  allowed,
  isAdmin,
  onSaveProperties,
}: {
  cluster: ReturnType<typeof parseCluster>;
  description: string | null;
  cover: ClusterCoverRow | null;
  temasCount: number | null;
  onSetCover: (patch: CoverPatch) => Promise<void>;
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
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition",
        allowed
          ? "shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          : "cursor-not-allowed border-dashed bg-muted/40",
      )}
    >
      <div
        className={cn(
          "relative aspect-[16/10] w-full overflow-hidden",
          allowed ? "bg-secondary/[0.06]" : "bg-muted",
        )}
      >
        {cover?.cover_url ? (
          <CoverImage
            src={cover.cover_url}
            position={cover.cover_position}
            scale={cover.cover_scale}
            className={cn("transition group-hover:scale-[1.02]", !allowed && "opacity-50 grayscale")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {allowed ? (
              <span className="text-5xl font-bold tracking-tight text-secondary/20">
                {sigla(cluster.title)}
              </span>
            ) : (
              <Lock className="h-10 w-10 text-muted-foreground/50" />
            )}
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">
          Formação
        </span>
        {isAdmin && !editing && (
          <CoverUploader
            folder="clusters"
            id={cluster.slug}
            currentUrl={cover?.cover_url ?? null}
            position={cover?.cover_position}
            scale={cover?.cover_scale}
            aspectRatio={16 / 10}
            onUploaded={(url) => onSetCover({ cover_url: url })}
            onCleared={() => onSetCover({ cover_url: null })}
            onAdjusted={(p, sc) => onSetCover({ cover_position: p, cover_scale: sc })}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5">
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
              <Button type="button" size="sm" variant="ghost" onClick={cancel} disabled={saving}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h3
                className={cn(
                  "break-words text-xl font-bold leading-tight tracking-tight",
                  allowed ? "text-secondary" : "text-muted-foreground",
                )}
              >
                {cluster.title}
              </h3>
              {cluster.subtitle && (
                <p className="text-sm text-muted-foreground">{cluster.subtitle}</p>
              )}
            </div>
            {description ? (
              <p
                className={cn(
                  "line-clamp-3 text-sm leading-relaxed",
                  allowed ? "text-foreground/75" : "text-muted-foreground/70",
                )}
              >
                {description}
              </p>
            ) : isAdmin ? (
              <button
                type="button"
                onClick={startEdit}
                className="self-start text-xs italic text-muted-foreground/60 hover:text-muted-foreground"
              >
                Adicionar descrição…
              </button>
            ) : null}
            <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
              {allowed ? (
                <>
                  <span>
                    {temasCount != null
                      ? `${temasCount} ${temasCount === 1 ? "tema" : "temas"}`
                      : ""}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-secondary">
                    Abrir
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Disponível quando recebes o badge desta formação
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {isAdmin && !editing && (
        <button
          type="button"
          onClick={startEdit}
          className="absolute right-2 top-2 z-10 rounded-md bg-background/90 p-1.5 text-muted-foreground opacity-0 shadow-sm transition hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
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
          <TooltipContent>Não tens acesso a esta formação.</TooltipContent>
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
      className="block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {card}
    </Link>
  );
}
