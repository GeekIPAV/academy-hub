import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getPaginaAvaliacao } from "@/lib/paginas-avaliacao.functions";
import { loadAvaliacaoDoc, type AvaliacaoPage } from "@/lib/avaliacao-types";
import { findSection, parseAvaliacao } from "@/lib/avaliacao-sections";
import { AvaliacaoBlocks } from "@/components/avaliacao/AvaliacaoBlocks";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/cultura-ubuntu/avaliacao/$slug/$section")({
  head: () => ({
    meta: [
      { title: "Secção de avaliação de impacto — Cultura Ubuntu" },
      { name: "description", content: "Metodologia, indicadores ou perguntas de um recurso de avaliação de impacto da Cultura Ubuntu." },
      { property: "og:title", content: "Secção de avaliação de impacto — Cultura Ubuntu" },
      { property: "og:description", content: "Consulta em detalhe esta secção do recurso de avaliação." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AvaliacaoSectionPage,
});

function AvaliacaoSectionPage() {
  const { slug, section } = Route.useParams();
  const fetchPage = useServerFn(getPaginaAvaliacao);
  const { data: page, isLoading } = useQuery<AvaliacaoPage | null>({
    queryKey: ["pagina-avaliacao", slug],
    queryFn: async () => (await fetchPage({ data: { slug } })) as AvaliacaoPage | null,
  });
  const structure = useMemo(() => parseAvaliacao(loadAvaliacaoDoc(page?.blocks)), [page?.blocks]);
  const content = useMemo(() => findSection(structure, section), [structure, section]);

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const back = (
    <Button asChild variant="ghost" className="-ml-3">
      <Link to="/cultura-ubuntu/avaliacao/$slug" params={{ slug }}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao recurso</Link>
    </Button>
  );

  if (!page || !content || content.blocks.length === 0) {
    return <div className="mx-auto max-w-3xl space-y-4 py-16 text-center"><p className="text-sm text-destructive">Secção não encontrada.</p>{back}</div>;
  }

  return (
    <article className="mx-auto max-w-4xl space-y-8">
      {back}
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{page.title}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-secondary">{content.title}</h1>
      </header>
      <AvaliacaoBlocks blocks={content.blocks} />
    </article>
  );
}
