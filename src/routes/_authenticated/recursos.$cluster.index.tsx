import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { parseCluster, clusterComponentId, slugifyCluster } from "@/lib/cluster-utils";
import { Loader2, ImageIcon, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CoverUploader } from "@/components/CoverUploader";
import { CoverImage } from "@/components/CoverImage";
import { useHasBadgeForCluster } from "@/hooks/use-badge-access";

export const Route = createFileRoute("/_authenticated/recursos/$cluster/")({
  head: ({ params }) => ({
    meta: [{ title: `${params.cluster} — Centro de Recursos` }],
  }),
  component: ClusterTemas,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl py-16 text-center text-muted-foreground">
      Cluster não encontrado.
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl py-16 text-center text-destructive">
      {error.message}
    </div>
  ),
});

interface TemaRow {
  id: string;
  cluster: string;
  bloco: string | null;
  title: string;
  description: string | null;
  cover_url: string | null;
  cover_position: string | null;
  cover_scale: number | null;
  order_index: number;
  bloco_order: number;
}

function ClusterTemas() {
  const { cluster: clusterSlug } = Route.useParams();
  const { isComponentVisible, isAdmin } = useApp();
  const [filter, setFilter] = useState<string>("__all");
  const qc = useQueryClient();

  const clusterQuery = useQuery({
    queryKey: ["cluster-by-slug", clusterSlug],
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
      const match = Array.from(set).find((c) => slugifyCluster(c) === clusterSlug);
      if (!match) throw notFound();
      return parseCluster(match);
    },
  });

  const cluster = clusterQuery.data;
  const allowedByRole = cluster
    ? isComponentVisible("/recursos", clusterComponentId(cluster.slug))
    : true;
  const hasBadge = useHasBadgeForCluster(cluster?.name ?? "");
  const canAccess = isAdmin || allowedByRole || hasBadge;

  const temasQuery = useQuery({
    queryKey: ["temas", cluster?.name],
    enabled: !!cluster && canAccess,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temas_momentos")
        .select("id, cluster, bloco, title, description, cover_url, cover_position, cover_scale, order_index, bloco_order")
        .eq("cluster", cluster!.name)
        .order("bloco_order", { ascending: true })
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TemaRow[];
    },
  });

  const temas = temasQuery.data ?? [];

  const blocos = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const t of temas) {
      const b = t.bloco?.trim();
      if (b && !seen.has(b)) {
        seen.add(b);
        list.push(b);
      }
    }
    return list;
  }, [temas]);

  const filtered = filter === "__all" ? temas : temas.filter((t) => (t.bloco ?? "") === filter);

  if (clusterQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!cluster) return null;

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <Lock className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">{cluster.title}</h1>
        <p className="mt-4 text-muted-foreground">
          Precisas de concluir a formação correspondente para aceder aos recursos
          deste cluster. Quando obtiveres o badge, esta área será desbloqueada.
        </p>
        <Link to="/recursos" className="mt-6 inline-block text-sm text-secondary underline">
          Voltar ao Centro de Recursos
        </Link>
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="border-b pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-secondary">
          {cluster.title}
        </h1>
        {cluster.subtitle && (
          <p className="mt-1 text-base text-muted-foreground">{cluster.subtitle}</p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          Explora os temas e momentos deste percurso formativo.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Temas e momentos
          </h2>
          {blocos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={filter === "__all"} onClick={() => setFilter("__all")}>
                Todos
              </FilterChip>
              {blocos.map((b) => (
                <FilterChip key={b} active={filter === b} onClick={() => setFilter(b)}>
                  {b}
                </FilterChip>
              ))}
            </div>
          )}
        </div>

        {temasQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Sem temas para mostrar.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((t) => (
              <TemaCard
                key={t.id}
                tema={t}
                clusterSlug={cluster.slug}
                isAdmin={isAdmin}
                onSetCover={async (patch) => {
                  const { error } = await supabase
                    .from("temas_momentos")
                    .update(patch)
                    .eq("id", t.id);
                  if (error) throw error;
                  qc.invalidateQueries({ queryKey: ["temas", cluster.name] });
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-secondary bg-secondary/5 text-secondary"
          : "border-border bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function TemaCard({
  tema,
  clusterSlug,
  isAdmin,
  onSetCover,
}: {
  tema: TemaRow;
  clusterSlug: string;
  isAdmin: boolean;
  onSetCover: (
    patch: { cover_url?: string | null; cover_position?: string; cover_scale?: number },
  ) => Promise<void>;
}) {
  return (
    <Link
      to="/recursos/$cluster/$temaId"
      params={{ cluster: clusterSlug, temaId: tema.id }}
      className="group block overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary/10 via-muted to-primary/5">
        {tema.cover_url ? (
          <CoverImage
            src={tema.cover_url}
            position={tema.cover_position}
            scale={tema.cover_scale}
            className="transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        {isAdmin && (
          <CoverUploader
            folder="temas"
            id={tema.id}
            currentUrl={tema.cover_url}
            position={tema.cover_position}
            scale={tema.cover_scale}
            aspectRatio={4 / 3}
            onUploaded={(url) => onSetCover({ cover_url: url })}
            onCleared={() => onSetCover({ cover_url: null })}
            onAdjusted={(p, s) => onSetCover({ cover_position: p, cover_scale: s })}
          />
        )}
      </div>
      <div className="space-y-1 p-3">
        {tema.bloco && (
          <p className="text-[10px] font-medium uppercase tracking-wide text-secondary/70">
            {tema.bloco}
          </p>
        )}
        <h3 className="text-sm font-semibold leading-tight text-secondary">{tema.title}</h3>
      </div>
    </Link>
  );
}
