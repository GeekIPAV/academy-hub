import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, MessageSquare, Printer } from "lucide-react";
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
  const hash = useRouterState({ select: (state) => state.location.hash });
  const printed = useRef(false);
  useEffect(() => {
    if (!data || hash !== "pdf" || printed.current) return;
    const timer = window.setTimeout(() => { printed.current = true; window.print(); }, 400);
    return () => window.clearTimeout(timer);
  }, [data, hash]);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data || error) return <p className="text-sm text-destructive">{(error as Error)?.message ?? "Não foi possível abrir o Caderno."}</p>;
  const entradas = data.modulos.flatMap((m) => m.entradas);
  return <article className="course-notebook w-full min-w-0 space-y-6 pb-8">
    <header className="space-y-2">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-secondary"><BookOpen className="h-6 w-6" />Caderno de Percurso</h1>
      <p className="text-sm text-muted-foreground">{data.nome}{data.nome ? " · " : ""}{data.curso}</p>
      <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("pt-PT")} · {entradas.filter((e) => e.resposta).length} entradas · {entradas.length} perguntas-chave</p>
      <p className="notebook-no-print text-sm text-muted-foreground">Um espaço seu. As suas reflexões não são classificadas; apenas a Equipa IPAV as pode ler e comentar.</p>
    </header>
    {data.modulos.filter((m) => m.entradas.length).map((m) => <section key={m.id} className="min-w-0 space-y-4"><h2 className="text-xl font-bold text-secondary">Módulo {m.indice} — {m.title}</h2><div className="notebook-entries grid w-full min-w-0 grid-cols-1 items-start gap-5">{m.entradas.map((e) => {
      const passo = course.modulos.flatMap((item) => item.passos).find((p) => p.id === e.passoId);
      return <div key={e.passoId} className={`notebook-entry min-w-0 break-words rounded-xl border border-l-2 bg-card p-5 shadow-sm ${e.resposta ? "border-l-secondary" : "notebook-unanswered border-border text-muted-foreground"}`}>
        <h3 className="text-base font-semibold">{e.title}</h3>
        <div className="rich-text mt-2 text-sm" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(e.pergunta) }} />
        {e.resposta ? <><div className="rich-text mt-3 rounded-lg border bg-muted/40 p-4 text-sm" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(e.resposta) }} />{e.data && <p className="mt-2 text-xs text-muted-foreground">{new Date(e.data).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}</p>}
          {e.comentario && <div className="notebook-comment mt-4 rounded-lg border border-l-4 border-l-primary bg-primary/[0.05] p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><MessageSquare className="h-3.5 w-3.5" />Comentário da Equipa IPAV</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{e.comentario.texto}</p>
            <p className="mt-2 text-xs text-muted-foreground">{e.comentario.autor}{e.comentario.em ? ` · ${new Date(e.comentario.em).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}` : ""}</p>
          </div>}</> : <p className="mt-3 text-sm">Ainda sem resposta. {passo && passo.estado !== "bloqueado" ? <Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId, passoId: e.passoId }} className="text-primary underline">Abrir momento</Link> : <span>{passo?.bloqueio_motivo}</span>}</p>}
      </div>;
    })}</div></section>)}
    {!entradas.length && <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">Este curso ainda não tem perguntas de reflexão.</p>}
  </article>;
}