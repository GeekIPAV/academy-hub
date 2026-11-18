import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { parseCluster, clusterComponentId, slugifyCluster } from "@/lib/cluster-utils";
import { hasCentroRecursosAccess } from "@/lib/centro-recursos-access";
import { escondeTemasVazios, temaSemConteudo } from "@/lib/recursos-temas-visiveis";
import { Loader2, Lock, BookOpen, FolderOpen, ChevronRight, CalendarDays } from "lucide-react";
import { sigla, textoSimples } from "@/lib/recursos-ui";
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
  intro?: string | null;
  tema_recursos: { count: number }[] | null;
  plano_sessao_blocos?: { count: number }[] | null;
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

  // Agrupar por bloco, mantendo a ordem definida na gestão.
  const grupos = useMemo(() => {
    const out: { bloco: string; temas: typeof filtered }[] = [];
    for (const t of filtered) {
      const b = t.bloco?.trim() || "Outros temas";
      const last = out[out.length - 1];
      if (last && last.bloco === b) last.temas.push(t);
      else out.push({ bloco: b, temas: [t] });
    }
    return out;
  }, [filtered]);

  const totalRecursos = temas.reduce((n, t) => n + recursoCount(t), 0);

  const descricaoQuery = useQuery({
    queryKey: ["cluster-covers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cluster_covers")
        .select("cluster_name, description, cover_url, cover_position, cover_scale");
      if (error) throw error;
      const map = new Map<string, { description: string | null }>();
      ((data ?? []) as { cluster_name: string; description: string | null }[]).forEach((r) =>
        map.set(r.cluster_name, r),
      );
      return map;
    },
  });
  const descricao = cluster ? descricaoQuery.data?.get(cluster.name)?.description ?? null : null;

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
    <div className="mx-auto min-w-0 max-w-6xl space-y-8">
      <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to="/recursos" className="hover:text-secondary">
          Centro de recursos
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-secondary">{cluster.title}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-6 border-b pb-7">
        <div className="min-w-0 max-w-3xl flex-1 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-secondary sm:text-4xl">
            {cluster.title}
          </h1>
          {cluster.subtitle && <p className="text-lg text-muted-foreground">{cluster.subtitle}</p>}
          <p className="pt-1 text-sm leading-relaxed text-foreground/75">
            {descricao || "Explora os temas e momentos deste percurso formativo."}
          </p>
        </div>
        {!temasQuery.isLoading && temas.length > 0 && (
          <dl className="grid shrink-0 grid-cols-2 gap-3">
            <div className="min-w-[7rem] rounded-xl border bg-card px-4 py-3">
              <dt className="text-xs text-muted-foreground">Temas</dt>
              <dd className="text-2xl font-bold text-secondary">{temas.length}</dd>
            </div>
            <div className="min-w-[7rem] rounded-xl border bg-card px-4 py-3">
              <dt className="text-xs text-muted-foreground">Recursos</dt>
              <dd className="text-2xl font-bold text-secondary">{totalRecursos}</dd>
            </div>
          </dl>
        )}
      </header>

      <section className="space-y-6">
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
          <div className="space-y-10">
            {grupos.map((g, gi) => (
              <div key={`${g.bloco}-${gi}`} className="space-y-4">
                {(grupos.length > 1 || blocos.length > 0) && (
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-secondary">{g.bloco}</h3>
                    <span className="text-xs text-muted-foreground">
                      {g.temas.length} {g.temas.length === 1 ? "tema" : "temas"}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className="grid min-w-0 grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {g.temas.map((t) => (
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
  const formato = temaFormato(tema.hidden_sections);
  const nRecursos = recursoCount(tema);
  const nBlocos = tema.plano_sessao_blocos?.[0]?.count ?? 0;
  const intro = textoSimples(tema.intro ?? tema.description);
  const Icon = formato === "documentos" ? FolderOpen : formato === "conteudo" ? BookOpen : CalendarDays;
  return (
    <Link
      to="/recursos/$cluster/$temaId"
      params={{ cluster: clusterSlug, temaId: tema.id }}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div
        className={cn(
          "relative aspect-[4/3] w-full overflow-hidden",
          formato === "documentos" ? "bg-primary/10" : "bg-secondary/[0.07]",
        )}
      >
        {tema.cover_url ? (
          <CoverImage
            src={tema.cover_url}
            position={tema.cover_position}
            scale={tema.cover_scale}
            className="transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2.5">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background text-lg font-bold text-secondary shadow-sm">
              {sigla(tema.title)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              {TEMA_FORMATOS[formato].label}
            </span>
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
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {tema.bloco && (
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {tema.bloco}
          </p>
        )}
        <h3 className="text-base font-semibold leading-snug text-secondary">{tema.title}</h3>
        {intro && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{intro}</p>}
        {(nBlocos > 0 || nRecursos > 0) && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
            {nBlocos > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/70">
                Plano de sessão
              </span>
            )}
            {nRecursos > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/70">
                {nRecursos} {nRecursos === 1 ? "recurso" : "recursos"}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function recursoCount(tema: TemaRow) {
  return tema.tema_recursos?.[0]?.count ?? 0;
}
