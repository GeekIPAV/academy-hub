import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, CheckCircle2, Lightbulb, MessageCircleHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCaderno } from "@/lib/elearning-caderno.functions";
import type { CursoDetalhe } from "@/lib/elearning.functions";

const ICONS = [MessageCircleHeart, CheckCircle2, Lightbulb];

/** Lista compacta dos tipos de momento + sequência, em estilo neutro da plataforma. */
export function ComoFuncionaList({ data }: { data: CursoDetalhe }) {
  const a = data.curso.apresentacao;
  if (!a.como_funciona.length && !a.sequencia.length) return <p className="text-sm text-muted-foreground">Sem informação adicional para este curso.</p>;
  return <div className="space-y-4">
    {a.como_funciona.length > 0 && <ul className="space-y-3">{a.como_funciona.map((c, i) => { const Icon = ICONS[i % 3]; return <li key={i} className="flex gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-secondary" /><div className="min-w-0"><p className="text-sm font-semibold">{c.titulo}</p><p className="text-sm text-muted-foreground">{c.descricao}</p></div></li>; })}</ul>}
    {a.sequencia.length > 0 && <div><p className="text-xs font-medium text-muted-foreground">Cada módulo segue a mesma sequência</p><ol className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">{a.sequencia.map((s, i) => <li key={i} className="flex items-center gap-1.5"><span className="rounded-md border bg-muted/50 px-2 py-1">{s}</span>{i < a.sequencia.length - 1 && <span aria-hidden className="text-muted-foreground">→</span>}</li>)}</ol></div>}
  </div>;
}

/** Cartão lateral do Caderno de Percurso, no estilo normal de cartão. */
export function CadernoCard({ data }: { data: CursoDetalhe }) {
  const fn = useServerFn(getCaderno);
  const { data: notebook, error } = useQuery({ queryKey: ["elearning", "caderno", data.curso.id], queryFn: () => fn({ data: { cursoId: data.curso.id } }), enabled: !!data.curso.inscricao });
  const total = data.modulos.flatMap((m) => m.passos).filter((p) => p.tipo === "reflexao").length;
  if (!total) return null;
  const n = notebook?.modulos.flatMap((m) => m.entradas).filter((e) => e.resposta).length ?? 0;
  return <div className="rounded-xl border bg-card p-5 shadow-sm">
    <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-secondary" /><h3 className="font-semibold text-secondary">Caderno de Percurso</h3></div>
    <p className="mt-2 text-sm text-muted-foreground">As tuas reflexões «Parar e refletir», privadas e sem classificação.</p>
    <p className="mt-3 text-xs text-muted-foreground">{error ? "Entradas indisponíveis" : `${n} entradas`} · {total} perguntas-chave</p>
    {data.curso.inscricao && <Button variant="outline" size="sm" asChild className="mt-4 w-full"><Link to="/elearning/$cursoId/caderno" params={{ cursoId: data.curso.id }}>Abrir caderno</Link></Button>}
  </div>;
}
