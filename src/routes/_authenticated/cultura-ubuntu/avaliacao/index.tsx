import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ClipboardCheck, Loader2 } from "lucide-react";
import { listPaginasAvaliacao } from "@/lib/paginas-avaliacao.functions";
import { AVALIACAO_OVERVIEW } from "@/lib/avaliacao-content";
import { parseAvaliacao } from "@/lib/avaliacao-sections";
import { loadAvaliacaoDoc } from "@/lib/avaliacao-types";
import { CoverImage } from "@/components/CoverImage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/cultura-ubuntu/avaliacao/")({
  head: () => ({
    meta: [
      { title: "Avaliação de Impacto — Cultura Ubuntu" },
      { name: "description", content: "Cinco avaliações de impacto da Cultura Ubuntu: metodologias, referenciais, indicadores e perguntas." },
      { property: "og:title", content: "Avaliação de Impacto — Cultura Ubuntu" },
      { property: "og:description", content: "Explora as cinco avaliações de impacto da Cultura Ubuntu." },
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
  const rows = useMemo(
    () => [...pages].sort((a, b) => a.sort_order - b.sort_order).map((page) => ({ page, referenciais: parseAvaliacao(loadAvaliacaoDoc(page.blocks)).referenciais })),
    [pages],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Cultura Ubuntu</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-secondary">Avaliação de Impacto</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Aqui encontras cinco avaliações complementares que ajudam a compreender o impacto da metodologia Ubuntu — nas pessoas, nas relações e na comunidade.
            Cada avaliação indica os referenciais em que se apoia e organiza-se em três partes: as metodologias de recolha, os indicadores a observar e as perguntas
            que podes usar em questionários, entrevistas ou momentos de reflexão. Escolhe a avaliação que se aproxima do que queres compreender e abre-a para ver o detalhe.
          </p>
        </div>
        <Button asChild variant="outline"><Link to="/cultura-ubuntu/avaliacao/gestao"><ClipboardCheck className="mr-2 h-4 w-4" /> Gerir recursos</Link></Button>
      </header>

      <section aria-labelledby="overview-title" className="space-y-3">
        <div>
          <h2 id="overview-title" className="text-xl font-semibold text-secondary">Visão geral</h2>
          <p className="text-sm text-muted-foreground">Compara o foco de cada avaliação e abre-a diretamente a partir da tabela.</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <p className="py-8 text-sm text-destructive">Não foi possível carregar as avaliações.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-muted/60">
                <tr>{["Avaliação", "Destinatários", "Objetivo", "Metodologias", "Indicadores", "Referenciais", ""].map((header, i) => <th key={i} className="px-4 py-3 font-semibold text-secondary">{header}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map(({ page, referenciais }, index) => {
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
                            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-primary">Avaliação {page.sort_order}</span>
                            <span className="block font-semibold leading-6 text-secondary group-hover:underline">{page.title}</span>
                          </span>
                        </Link>
                      </td>
                      {(row ? row.slice(1) : ["—", "—", "—", "—"]).map((cell, i) => <td key={i} className="px-4 py-3 leading-6 text-muted-foreground">{cell}</td>)}
                      <td className="px-4 py-3">
                        {referenciais.length > 0 ? (
                          <ul className="space-y-1">
                            {referenciais.slice(0, 3).map((item, i) => <li key={i} className="leading-5 text-muted-foreground">{item.length > 80 ? `${item.slice(0, 80).trimEnd()}…` : item}</li>)}
                            {referenciais.length > 3 && <li className="text-xs text-primary">+{referenciais.length - 3} referenciais</li>}
                          </ul>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
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
