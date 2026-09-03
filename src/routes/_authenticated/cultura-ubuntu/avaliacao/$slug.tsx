import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getPaginaAvaliacao } from "@/lib/paginas-avaliacao.functions";
import { loadAvaliacaoDoc, type AvaliacaoPage } from "@/lib/avaliacao-types";
import { renderRichText } from "@/components/admin/PaginaAvaliacaoEditor";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { CoverImage } from "@/components/CoverImage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/cultura-ubuntu/avaliacao/$slug")({
  head: () => ({ meta: [{ title: "Recurso de avaliação — Cultura Ubuntu" }, { name: "description", content: "Recurso de avaliação da Cultura Ubuntu." }, { property: "og:title", content: "Recurso de avaliação — Cultura Ubuntu" }, { property: "og:description", content: "Consulta um recurso de avaliação da Cultura Ubuntu." }, { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" }] }),
  component: AvaliacaoDocument,
});

function AvaliacaoDocument() {
  const { slug } = Route.useParams();
  const fetchPage = useServerFn(getPaginaAvaliacao);
  const { data: page, isLoading, error } = useQuery<AvaliacaoPage | null>({ queryKey: ["pagina-avaliacao", slug], queryFn: async () => (await fetchPage({ data: { slug } })) as AvaliacaoPage | null });
  const doc = useMemo(() => loadAvaliacaoDoc(page?.blocks), [page?.blocks]);

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !page) return <div className="mx-auto max-w-3xl py-16 text-center"><p className="text-sm text-destructive">Recurso de avaliação não encontrado.</p><Button asChild variant="outline" className="mt-4"><Link to="/cultura-ubuntu/avaliacao"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos recursos</Link></Button></div>;

  return <article className="mx-auto max-w-4xl space-y-8"><Button asChild variant="ghost" className="-ml-3"><Link to="/cultura-ubuntu/avaliacao"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos recursos</Link></Button><header className="space-y-4">{page.cover_url && <div className="aspect-[4/3] max-h-[360px] overflow-hidden rounded-lg bg-muted"><CoverImage src={page.cover_url} alt="" position={page.cover_position} scale={page.cover_scale} /></div>}<p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Recurso {page.sort_order}</p><h1 className="text-3xl font-semibold tracking-tight text-secondary">{page.title}</h1></header><div className="space-y-5">{doc.blocks.map((block) => block.type === "table" ? <div key={block.id} className="overflow-x-auto rounded-lg border bg-card"><table className="min-w-[640px] w-full text-left text-sm"><thead className="bg-muted/60"><tr>{(block.headers ?? []).map((header, index) => <th key={index} className="px-4 py-3 font-semibold text-secondary">{header}</th>)}</tr></thead><tbody>{(block.rows ?? []).map((row, rowIndex) => <tr key={rowIndex} className="border-t align-top">{(block.headers ?? []).map((_, colIndex) => <td key={colIndex} className="px-4 py-3 leading-6 text-muted-foreground">{row[colIndex] ?? ""}</td>)}</tr>)}</tbody></table></div> : block.type === "image" && block.url ? <img key={block.id} src={block.url} alt={block.alt ?? ""} className="max-h-[520px] w-full rounded-lg object-contain" /> : <div key={block.id} className="rich-text rounded-sm" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(renderRichText(block.content)) }} />)}</div></article>;
}
