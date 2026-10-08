import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BookOpen, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCaderno } from "@/lib/elearning-caderno.functions";
import type { CursoDetalhe } from "@/lib/elearning.functions";

export function CourseGuide({ data, compact = false }: { data: CursoDetalhe; compact?: boolean }) {
  const fn = useServerFn(getCaderno);
  const { data: notebook, error } = useQuery({ queryKey: ["elearning", "caderno", data.curso.id], queryFn: () => fn({ data: { cursoId: data.curso.id } }), enabled: !!data.curso.inscricao });
  const entries = notebook?.modulos.flatMap((m) => m.entradas) ?? [];
  const total = data.modulos.flatMap((m) => m.passos).filter((p) => p.tipo === "reflexao").length;
  const a = data.curso.apresentacao;
  if (!a.como_funciona.length && !a.sequencia.length && !total) return null;
  return <section id={compact ? undefined : "como-funciona"} className={`grid min-w-0 scroll-mt-[var(--course-top)] gap-5 ${compact ? "" : "xl:grid-cols-[minmax(0,1fr)_300px]"}`}>
    <div className="min-w-0 space-y-4"><h2 className="text-lg font-semibold">Como funciona esta formação</h2>
      <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-3"}`}>{a.como_funciona.map((c, i) => <div key={i} className={`rounded-lg p-4 ${["bg-learning-reflection", "bg-learning-check", "bg-learning-case"][i % 3]}`}><p className="font-semibold">{c.titulo}</p><p className="mt-2 text-sm leading-6">{c.descricao}</p></div>)}</div>
      <ol className="flex flex-wrap items-center gap-2 text-xs">{a.sequencia.map((s, i) => <li key={i} className="flex items-center gap-2"><span className={`rounded-md px-3 py-2 ${i === a.sequencia.length - 1 && s === "Abre o módulo seguinte" ? "bg-notebook text-notebook-foreground" : "border bg-card"}`}>{s}</span>{i < a.sequencia.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}</li>)}</ol>
    </div>
    <div className="rounded-lg bg-notebook p-5 text-notebook-foreground"><BookOpen className="h-7 w-7" /><h2 className="mt-4 text-lg text-notebook-foreground">Caderno de Percurso</h2><p className="mt-3 text-sm leading-6">Um espaço seu. As respostas aos momentos «Parar e refletir» ficam guardadas aqui, sem classificação nem comentário. Pode descarregá-lo e trazê-lo para o encontro de integração.</p><p className="mt-5 text-xs">{error ? "Entradas indisponíveis" : `${entries.filter((e) => e.resposta).length} entradas`} · {total} perguntas-chave ao longo do percurso</p>
      {data.curso.inscricao && <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" asChild className="text-foreground"><Link to="/elearning/$cursoId/caderno" params={{ cursoId: data.curso.id }}><BookOpen className="mr-1 h-4 w-4" />Abrir caderno</Link></Button><Button variant="outline" asChild className="text-foreground"><Link to="/elearning/$cursoId/caderno" params={{ cursoId: data.curso.id }} search={{}} hash="pdf"><Printer className="mr-1 h-4 w-4" />Descarregar PDF</Link></Button></div>}
    </div>
  </section>;
}