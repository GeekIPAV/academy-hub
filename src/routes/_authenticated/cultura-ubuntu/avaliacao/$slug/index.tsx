import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, BookMarked, ClipboardList, Compass, Loader2, MessageCircleQuestion } from "lucide-react";
import { getPaginaAvaliacao } from "@/lib/paginas-avaliacao.functions";
import { loadAvaliacaoDoc, type AvaliacaoPage } from "@/lib/avaliacao-types";
import { parseAvaliacao } from "@/lib/avaliacao-sections";
import { AvaliacaoBlocks } from "@/components/avaliacao/AvaliacaoBlocks";
import { CoverImage } from "@/components/CoverImage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/cultura-ubuntu/avaliacao/$slug/")({
  head: () => ({
    meta: [
      { title: "Recurso de avaliação de impacto — Cultura Ubuntu" },
      { name: "description", content: "Metodologias, referenciais e indicadores de um recurso de avaliação de impacto da Cultura Ubuntu." },
      { property: "og:title", content: "Recurso de avaliação de impacto — Cultura Ubuntu" },
      { property: "og:description", content: "Consulta metodologias, referenciais e indicadores deste recurso de avaliação." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AvaliacaoDocument,
});

function AvaliacaoDocument() {
  const { slug } = Route.useParams();
  const fetchPage = useServerFn(getPaginaAvaliacao);
  const { data: page, isLoading, error } = useQuery<AvaliacaoPage | null>({
    queryKey: ["pagina-avaliacao", slug],
    queryFn: async () => (await fetchPage({ data: { slug } })) as AvaliacaoPage | null,
  });
  const structure = useMemo(() => parseAvaliacao(loadAvaliacaoDoc(page?.blocks)), [page?.blocks]);

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !page) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <p className="text-sm text-destructive">Recurso de avaliação não encontrado.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/cultura-ubuntu/avaliacao"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar à avaliação de impacto</Link></Button>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-5xl space-y-10">
      <Button asChild variant="ghost" className="-ml-3"><Link to="/cultura-ubuntu/avaliacao"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar à avaliação de impacto</Link></Button>

      <header className="space-y-4">
        {page.cover_url && (
          <div className="aspect-[4/3] max-h-[320px] overflow-hidden rounded-lg bg-muted">
            <CoverImage src={page.cover_url} alt="" position={page.cover_position} scale={page.cover_scale} />
          </div>
        )}
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Avaliação {page.sort_order}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-secondary">{page.title}</h1>
      </header>

      {structure.referenciais.length > 0 && (
        <section className="rounded-lg border border-primary/25 bg-primary/5 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-primary"><BookMarked className="h-4 w-4" /> Referenciais</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {structure.referenciais.map((item, index) => (
              <li key={index} className="flex gap-2 text-sm leading-6 text-secondary"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{item}</li>
            ))}
          </ul>
        </section>
      )}

      {structure.intro.length > 0 && <AvaliacaoBlocks blocks={structure.intro} />}

      {structure.metodologias.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-secondary">Metodologias</h2>
            <p className="text-sm text-muted-foreground">Abre cada metodologia para ver a descrição completa.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {structure.metodologias.map((item, index) => (
              <Link
                key={item.key}
                to="/cultura-ubuntu/avaliacao/$slug/$section"
                params={{ slug, section: item.key }}
                className="group flex h-full flex-col justify-between rounded-lg border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm"
              >
                <div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Compass className="h-4 w-4" /></span>
                  <span className="mt-3 block text-xs font-semibold uppercase tracking-[0.14em] text-primary">Metodologia {index + 1}</span>
                  <span className="mt-1 block font-semibold leading-6 text-secondary">{item.title}</span>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">Abrir <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {structure.indicadores.length > 0 && (
          <SectionCard slug={slug} section="indicadores" title="Indicadores" description="Dimensões e sinais a observar nesta avaliação." icon={<ClipboardList className="h-4 w-4" />} />
        )}
        {structure.perguntas.length > 0 && (
          <SectionCard slug={slug} section="perguntas" title="Perguntas" description="Perguntas orientadoras para questionários e reflexão." icon={<MessageCircleQuestion className="h-4 w-4" />} />
        )}
      </section>
    </article>
  );
}

function SectionCard({ slug, section, title, description, icon }: { slug: string; section: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <Link
      to="/cultura-ubuntu/avaliacao/$slug/$section"
      params={{ slug, section }}
      className="group flex items-start gap-4 rounded-lg border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
      <span className="min-w-0">
        <span className="block font-semibold text-secondary">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">{description}</span>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">Abrir <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
      </span>
    </Link>
  );
}
