import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourseLayout } from "@/components/elearning/CourseLayoutContext";
import { getCaderno } from "@/lib/elearning-caderno.functions";
import { sanitizeRichHtml } from "@/lib/sanitize-html";

export const Route = createFileRoute("/_authenticated/elearning/$cursoId/caderno")({
  head: () => ({ meta: [
    { title: "O meu Caderno de Percurso — Escola Ubuntu Online" },
    { name: "description", content: "Reflexões pessoais e privadas ao longo da formação Ubuntu." },
    { property: "og:title", content: "Caderno de Percurso — Escola Ubuntu Online" },
    { property: "og:description", content: "Reflexões pessoais ao longo da formação Ubuntu." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: CadernoPage,
});

function CadernoPage() {
  const { cursoId } = Route.useParams();
  const { data: course } = useCourseLayout();
  const fn = useServerFn(getCaderno);
  const { data, isLoading, error } = useQuery({ queryKey: ["elearning", "caderno", cursoId], queryFn: () => fn({ data: { cursoId } }) });
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data || error) return <p className="text-sm text-destructive">{(error as Error)?.message ?? "Não foi possível abrir o Caderno."}</p>;
  const entradas = data.modulos.flatMap((m) => m.entradas);
  return <article className="course-notebook mx-auto max-w-4xl space-y-8 pb-8">
    <header className="space-y-3 border-b pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="flex items-center gap-2 text-2xl"><BookOpen className="h-6 w-6" />Caderno de Percurso</h1><Button variant="outline" className="notebook-no-print" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Descarregar PDF</Button></div>
      <p className="text-sm text-muted-foreground">{data.nome}{data.nome ? " · " : ""}{data.curso}</p>
      <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("pt-PT")} · {entradas.filter((e) => e.resposta).length} entradas · {entradas.length} perguntas-chave</p>
      <p className="notebook-no-print text-sm text-muted-foreground">Um espaço seu. As suas reflexões são privadas, sem classificação nem comentário.</p>
    </header>
    {data.modulos.filter((m) => m.entradas.length).map((m) => <section key={m.id} className="space-y-5"><h2 className="text-xl">Módulo {m.indice} — {m.title}</h2>{m.entradas.map((e) => {
      const passo = course.modulos.flatMap((item) => item.passos).find((p) => p.id === e.passoId);
      return <div key={e.passoId} className={`notebook-entry border-l-2 pl-4 ${e.resposta ? "border-primary" : "notebook-unanswered border-border text-muted-foreground"}`}>
        <h3 className="text-base">{e.title}</h3>
        <div className="rich-text mt-2 text-sm" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(e.pergunta) }} />
        {e.resposta ? <><div className="rich-text mt-4 rounded-md bg-learning-paper p-4 text-sm" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(e.resposta) }} />{e.data && <p className="mt-2 text-xs text-muted-foreground">{new Date(e.data).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}</p>}</> : <p className="mt-3 text-sm">Ainda sem resposta. {passo?.estado !== "bloqueado" ? <Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId, passoId: e.passoId }} className="text-primary underline">Abrir momento</Link> : <span>{passo.bloqueio_motivo}</span>}</p>}
      </div>;
    })}</section>)}
    {!entradas.length && <p className="text-sm text-muted-foreground">Este curso ainda não tem perguntas de reflexão.</p>}
  </article>;
}