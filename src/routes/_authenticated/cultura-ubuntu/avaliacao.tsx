import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ClipboardCheck, Loader2 } from "lucide-react";
import { listPaginasAvaliacao } from "@/lib/paginas-avaliacao.functions";
import { AVALIACAO_OVERVIEW } from "@/lib/avaliacao-content";
import { CoverImage } from "@/components/CoverImage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/cultura-ubuntu/avaliacao")({
  head: () => ({
    meta: [
      { title: "Recursos de avaliação — Cultura Ubuntu" },
      { name: "description", content: "Recursos de avaliação da Cultura Ubuntu para acompanhar processos de transformação." },
      { property: "og:title", content: "Recursos de avaliação — Cultura Ubuntu" },
      { property: "og:description", content: "Explora os recursos de avaliação da Cultura Ubuntu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AvaliacaoGallery,
});

function AvaliacaoGallery() {
  const fetchPages = useServerFn(listPaginasAvaliacao);
  const { data: pages = [], isLoading, error } = useQuery({
    queryKey: ["paginas-avaliacao"],
    queryFn: () => fetchPages(),
  });
  const rows = useMemo(() => [...pages].sort((a, b) => a.sort_order - b.sort_order), [pages]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Cultura Ubuntu</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-secondary">Recursos de avaliação</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Instrumentos e referências para observar processos de crescimento, participação e transformação.</p>
        </div>
        <Button asChild variant="outline"><Link to="/cultura-ubuntu/avaliacao/gestao"><ClipboardCheck className="mr-2 h-4 w-4" /> Gerir recursos</Link></Button>
      </header>

      <section aria-labelledby="overview-title" className="space-y-3">
        <div><h2 id="overview-title" className="text-xl font-semibold text-secondary">Visão geral</h2><p className="text-sm text-muted-foreground">Compara rapidamente o foco e os indicadores de cada recurso.</p></div>
        <div className="overflow-x-auto rounded-lg border bg-card"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-muted/60"><tr>{["Recurso", "Destinatários", "Objetivo", "Metodologias", "Indicadores"].map((header) => <th key={header} className="px-4 py-3 font-semibold text-secondary">{header}</th>)}</tr></thead><tbody>{AVALIACAO_OVERVIEW.map((row) => <tr key={row[0]} className="border-t align-top"><td className="px-4 py-3 font-medium text-secondary">{row[0]}</td>{row.slice(1).map((cell, index) => <td key={index} className="px-4 py-3 leading-6 text-muted-foreground">{cell}</td>)}</tr>)}</tbody></table></div>
      </section>

      <section aria-labelledby="resources-title" className="space-y-4"><div><h2 id="resources-title" className="text-xl font-semibold text-secondary">Explorar recursos</h2></div>{isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : error ? <p className="py-8 text-sm text-destructive">Não foi possível carregar os recursos.</p> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{rows.map((page) => <Link key={page.id} to="/cultura-ubuntu/avaliacao/$slug" params={{ slug: page.slug }} className="group overflow-hidden rounded-lg border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="aspect-[4/3] overflow-hidden bg-primary/10">{page.cover_url ? <CoverImage src={page.cover_url} alt="" position={page.cover_position} scale={page.cover_scale} className="transition duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center"><ClipboardCheck className="h-12 w-12 text-primary/60" /></div>}</div><div className="flex items-start justify-between gap-3 p-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Recurso {page.sort_order}</p><h3 className="font-semibold leading-6 text-secondary">{page.title}</h3></div><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary transition group-hover:translate-x-1" /></div></Link>)}</div>}</section>
    </div>
  );
}
