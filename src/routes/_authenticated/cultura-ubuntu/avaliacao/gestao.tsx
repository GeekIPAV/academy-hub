import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPaginasAvaliacao, reorderPaginasAvaliacao, updatePaginaAvaliacao } from "@/lib/paginas-avaliacao.functions";
import { PaginaAvaliacaoEditor } from "@/components/admin/PaginaAvaliacaoEditor";
import { loadAvaliacaoDoc, type AvaliacaoPage, type PageDoc } from "@/lib/avaliacao-types";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/_authenticated/cultura-ubuntu/avaliacao/gestao")({
  head: () => ({ meta: [{ title: "Gerir recursos de avaliação — Cultura Ubuntu" }, { name: "description", content: "Gere e ordena os recursos de avaliação da Cultura Ubuntu." }, { property: "og:title", content: "Gerir recursos de avaliação — Cultura Ubuntu" }, { property: "og:description", content: "Gere os conteúdos de avaliação da Cultura Ubuntu." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: GestaoAvaliacao,
});

function GestaoAvaliacao() {
  const { activeRoles } = useApp();
  const allowed = activeRoles.includes("Admin") || activeRoles.includes("Equipa IPAV");
  const fetchPages = useServerFn(listPaginasAvaliacao);
  const reorder = useServerFn(reorderPaginasAvaliacao);
  const update = useServerFn(updatePaginaAvaliacao);
  const queryClient = useQueryClient();
  const { data: pages = [], isLoading } = useQuery({ queryKey: ["paginas-avaliacao"], queryFn: () => fetchPages() });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = pages.find((page) => page.id === selectedId) ?? pages[0] ?? null;
  const [draft, setDraft] = useState<PageDoc | null>(null);
  const [title, setTitle] = useState("");
  const sorted = [...pages].sort((a, b) => a.sort_order - b.sort_order);
  const saveMutation = useMutation({ mutationFn: () => selected ? update({ data: { id: selected.id, title, blocks: draft ?? loadAvaliacaoDoc(selected.blocks), cover_url: selected.cover_url, cover_position: selected.cover_position ?? undefined, cover_scale: selected.cover_scale ?? undefined } }) : Promise.resolve(), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["paginas-avaliacao"] }); } });
  const choose = (page: AvaliacaoPage) => { setSelectedId(page.id); setTitle(page.title); setDraft(loadAvaliacaoDoc(page.blocks)); };
  if (!allowed) return <div className="mx-auto max-w-xl py-16 text-center"><h1 className="text-xl font-semibold">Acesso restrito</h1><p className="mt-2 text-sm text-muted-foreground">Esta área está reservada à equipa IPAV.</p></div>;
  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  return <div className="mx-auto max-w-6xl space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><Button asChild variant="ghost" className="-ml-3"><Link to="/cultura-ubuntu/avaliacao"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos recursos</Link></Button><h1 className="mt-2 text-3xl font-semibold tracking-tight text-secondary">Gestão de recursos de avaliação</h1></div></div><div className="grid gap-6 lg:grid-cols-[280px_1fr]"><aside className="space-y-2"><p className="text-sm font-semibold text-secondary">Ordem dos recursos</p>{sorted.map((page, index) => <div key={page.id} className={`rounded-md border p-3 ${selected?.id === page.id ? "border-primary bg-primary/5" : "bg-card"}`}><button type="button" className="w-full text-left" onClick={() => choose(page)}><span className="text-xs font-semibold uppercase tracking-wider text-primary">Recurso {page.sort_order}</span><span className="mt-1 block text-sm font-medium leading-5 text-secondary">{page.title}</span></button><div className="mt-3 flex gap-1"><Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={async () => { await reorder({ data: { firstId: sorted[index - 1].id, secondId: page.id } }); queryClient.invalidateQueries({ queryKey: ["paginas-avaliacao"] }); }} aria-label="Mover para cima"><ArrowUp className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === sorted.length - 1} onClick={async () => { await reorder({ data: { firstId: page.id, secondId: sorted[index + 1].id } }); queryClient.invalidateQueries({ queryKey: ["paginas-avaliacao"] }); }} aria-label="Mover para baixo"><ArrowDown className="h-3.5 w-3.5" /></Button></div></div>)}</aside><section className="min-w-0 rounded-lg border bg-card p-5"><p className="mb-2 text-sm font-semibold text-secondary">Conteúdo</p>{selected ? <>{!draft && choose(selected)}<Input value={title || selected.title} onChange={(event) => setTitle(event.target.value)} className="mb-4 text-lg font-semibold" aria-label="Título do recurso" />{draft && <PaginaAvaliacaoEditor value={draft} onChange={setDraft} />}<div className="mt-5 flex justify-end"><Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !draft}><Save className="mr-2 h-4 w-4" />{saveMutation.isPending ? "A guardar…" : "Guardar alterações"}</Button></div></> : <p className="text-sm text-muted-foreground">Ainda não existem recursos.</p>}</section></div></div>;
}
