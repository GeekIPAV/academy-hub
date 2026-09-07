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
        <div>
          <h2 id="overview-title" className="text-xl font-semibold text-secondary">Visão geral</h2>
          <p className="text-sm text-muted-foreground">Compara o foco de cada recurso e abre-o diretamente a partir da tabela.</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <p className="py-8 text-sm text-destructive">Não foi possível carregar os recursos.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-muted/60">
                <tr>{["Recurso", "Destinatários", "Objetivo", "Metodologias", "Indicadores", ""].map((header, i) => <th key={i} className="px-4 py-3 font-semibold text-secondary">{header}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((page, index) => {
                  const row = AVALIACAO_OVERVIEW[index];
                  return (
                    <tr key={page.id} className="border-t align-top transition hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link to="/cultura-ubuntu/avaliacao/$slug" params={{ slug: page.slug }} className="group flex items-start gap-3">
                          <span className="hidden h-14 w-20 shrink-0 overflow-hidden rounded-md bg-primary/10 sm:block">
                            {page.cover_url ? (
                              <CoverImage src={page.cover_url} alt="" position={page.cover_position} scale={page.cover_scale} className="transition duration-300 group-hover:scale-[1.05]" />
                            ) : (
                              <span className="flex h-full items-center justify-center"><ClipboardCheck className="h-6 w-6 text-primary/60" /></span>
                            )}
                          </span>
                          <span>
                            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-primary">Recurso {page.sort_order}</span>
                            <span className="block font-semibold leading-6 text-secondary group-hover:underline">{page.title}</span>
                          </span>
                        </Link>
                      </td>
                      {(row ? row.slice(1) : ["—", "—", "—", "—"]).map((cell, i) => <td key={i} className="px-4 py-3 leading-6 text-muted-foreground">{cell}</td>)}
                      <td className="px-4 py-3">
                        <Link to="/cultura-ubuntu/avaliacao/$slug" params={{ slug: page.slug }} className="group inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-primary">
                          Abrir <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
