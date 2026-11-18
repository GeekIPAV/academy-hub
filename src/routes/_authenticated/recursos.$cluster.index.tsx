import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { parseCluster, clusterComponentId, slugifyCluster } from "@/lib/cluster-utils";
import { hasCentroRecursosAccess } from "@/lib/centro-recursos-access";
import { escondeTemasVazios, temaSemConteudo } from "@/lib/recursos-temas-visiveis";
import { Loader2, ImageIcon, Lock, BookOpen, FolderOpen, ChevronRight } from "lucide-react";
import { TEMA_FORMATOS, temaFormato } from "@/lib/tema-formatos";
import { cn } from "@/lib/utils";
import { CoverUploader } from "@/components/CoverUploader";
import { CoverImage } from "@/components/CoverImage";
import { useHasBadgeForCluster } from "@/hooks/use-badge-access";

export const Route = createFileRoute("/_authenticated/recursos/$cluster/")({
  head: ({ params }) => ({
    meta: [{ title: `${params.cluster} | Centro de recursos` }],
  }),
  component: ClusterTemas,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl py-16 text-center text-muted-foreground">
      Cluster não encontrado.
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl py-16 text-center text-destructive">
      {error instanceof Error ? error.message : "Não foi possível carregar os recursos."}
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
  hidden_sections: string[] | null;
  tema_recursos: { count: number }[] | null;
}

function ClusterTemas() {
  const { cluster: clusterSlug } = Route.useParams();
  const { isComponentVisible, isAdmin, activeRoles } = useApp();
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
  const canAccess = isAdmin || hasCentroRecursosAccess(activeRoles) || allowedByRole || hasBadge;

  const temasQuery = useQuery({
    queryKey: ["temas", cluster?.name],
    enabled: !!cluster && canAccess,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temas_momentos")
        .select(
          "id, cluster, bloco, title, description, intro, context, objectives, processo_u, cover_url, cover_position, cover_scale, order_index, bloco_order, hidden_sections, tema_recursos(count), plano_sessao_blocos(count)",
        )
        .eq("cluster", cluster!.name)
        .order("bloco_order", { ascending: true })
        .order("order_index", { ascending: true });
      if (error) throw error;
      type Row = TemaRow & {
        intro: string | null;
        context: string | null;
        objectives: string | null;
        processo_u: string | null;
        tema_recursos: { count: number }[] | null;
        plano_sessao_blocos: { count: number }[] | null;
      };
      return ((data ?? []) as unknown as Row[]).map((t) => ({
        ...t,
        vazio: temaSemConteudo({
          ...t,
          recursosCount: t.tema_recursos?.[0]?.count ?? 0,
          blocosCount: t.plano_sessao_blocos?.[0]?.count ?? 0,
        }),
      }));
    },
  });

  const esconderVazios = !isAdmin && escondeTemasVazios(activeRoles);
  const temas = (temasQuery.data ?? []).filter((t) => !(esconderVazios && t.vazio));

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
  // Sessões aparecem como cartões com fotografia; conteúdos e pastas de
  // documentos aparecem à parte, como cartões compactos.
  const sessoes = filtered.filter((t) => temaFormato(t.hidden_sections) === "sessao");
  const materiais = filtered.filter((t) => temaFormato(t.hidden_sections) !== "sessao");

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
          <div className="space-y-8">
            {materiais.length > 0 && (
              <div className="space-y-3">
                {sessoes.length > 0 && (
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Conteúdos e documentos
                  </h3>
                )}
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {materiais.map((t) => (
                    <MaterialCard key={t.id} tema={t} clusterSlug={cluster.slug} />
                  ))}
                </div>
              </div>
            )}
            {sessoes.length > 0 && (
              <div className="space-y-3">
                {materiais.length > 0 && (
                  <h3 className="text-xs font-medium text-muted-foreground">Sessões</h3>
                )}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {sessoes.map((t) => (
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
              </div>
            )}
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

function recursoCount(tema: TemaRow) {
  return tema.tema_recursos?.[0]?.count ?? 0;
}

/** Cartão compacto para temas do tipo "Conteúdo" e "Pasta de documentos". */
function MaterialCard({ tema, clusterSlug }: { tema: TemaRow; clusterSlug: string }) {
  const formato = temaFormato(tema.hidden_sections);
  const Icon = formato === "documentos" ? FolderOpen : BookOpen;
  const count = recursoCount(tema);
  return (
    <Link
      to="/recursos/$cluster/$temaId"
      params={{ cluster: clusterSlug, temaId: tema.id }}
      className="group flex min-w-0 items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {tema.cover_url ? (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
          <CoverImage src={tema.cover_url} position={tema.cover_position} scale={tema.cover_scale} />
        </div>
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-tight text-secondary">{tema.title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {TEMA_FORMATOS[formato].label}
          {count > 0 && ` · ${count} ${count === 1 ? "recurso" : "recursos"}`}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
    </Link>
  );
}
