import { Link } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TIPO_PASSO } from "@/components/elearning/shared";
import type { CursoDetalhe, ModuloResumo } from "@/lib/elearning.functions";

export function FormationPath({ data }: { data: CursoDetalhe }) {
  const currentId = data.curso.inscricao?.proximo_passo_id;
  const current = data.modulos.find((m) => m.passos.some((p) => p.id === currentId)) ?? data.modulos.find((m) => m.passos.length) ?? data.modulos[0];
  if (!current) return <p className="text-sm text-muted-foreground">Ainda sem conteúdos.</p>;
  const indice = data.modulos.indexOf(current);
  const remaining = data.modulos.filter((m) => m.id !== current.id);
  const currentDone = current.passos.length > 0 && current.passos.every((p) => p.estado === "concluido");
  const smallContent = (m: ModuloResumo) => {
    const n = data.modulos.indexOf(m);
    const required = m.passos.filter((p) => p.obrigatorio);
    const done = m.passos.length > 0 && (required.length ? required : m.passos).every((p) => p.estado === "concluido");
    const locked = m.passos.length > 0 && m.passos.every((p) => p.estado === "bloqueado");
    const first = m.passos.find((p) => p.estado !== "bloqueado");
    return <><div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>Módulo {n + 1}</span>{done ? <Check className="h-4 w-4 text-secondary" /> : locked || !m.passos.length ? <Lock className="h-4 w-4" /> : null}</div><h3 className="mt-2 font-semibold text-secondary">{m.title}</h3>{m.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{m.description.replace(/<[^>]*>/g, " ")}</p>}<p className="mt-3 text-xs font-medium text-muted-foreground">{!m.passos.length ? "Em breve" : done ? "✓ Concluído" : locked ? m.passos[0]?.bloqueio_motivo : "Disponível"}</p>{first && !done && <Button variant="link" asChild className="mt-1 h-auto px-0"><Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId: data.curso.id, passoId: first.id }}>Abrir módulo</Link></Button>}</>;
  };
  return <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
    <section className="min-w-0 rounded-xl border border-primary/60 bg-card p-5 shadow-sm sm:p-6 xl:row-span-2">
      <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Módulo {indice + 1}</p><Badge variant="outline">{currentDone ? "Concluído" : data.curso.inscricao?.iniciado ? "Em curso" : "Por começar"}</Badge></div>
      <h3 className="mt-2 text-xl font-bold text-secondary">{current.title}</h3>
      {current.pergunta_fundo && <p className="mt-2 text-sm text-muted-foreground">Pergunta de fundo: <strong className="text-foreground">{current.pergunta_fundo}</strong></p>}
      <ol className="mt-5 space-y-2">{current.passos.map((p, i) => {
        const active = p.id === currentId; const done = p.estado === "concluido"; const locked = p.estado === "bloqueado";
        return <li key={p.id} className={`flex min-w-0 items-center gap-3 rounded-lg border p-3 ${active ? "border-primary/60 bg-primary/5" : locked ? "border-dashed" : ""}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs ${active ? "bg-primary text-primary-foreground" : done ? "bg-secondary text-secondary-foreground" : "border bg-muted text-muted-foreground"}`}>{done ? <Check className="h-4 w-4" /> : i + 1}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Momento {i + 1} — {p.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{TIPO_PASSO[p.tipo]}{p.duracao_min ? ` · ~${p.duracao_min} min` : ""}{locked && p.bloqueio_motivo ? ` · ${p.bloqueio_motivo}` : ""}</p></div>{locked ? <Lock className="h-4 w-4 shrink-0 text-muted-foreground" /> : <Button asChild variant={active ? "default" : "ghost"} size="sm" className="shrink-0 px-2"><Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId: data.curso.id, passoId: p.id }}>{active ? p.estado === "em_curso" ? "Continuar" : "Começar" : "Ver"}</Link></Button>}</li>;
      })}</ol>
    </section>
    {remaining.length > 0 && <div className="hidden min-w-0 content-start gap-4 xl:grid xl:grid-cols-2">{remaining.map((m) => <section key={m.id} className="min-w-0 rounded-xl border bg-card p-4 shadow-sm">{smallContent(m)}</section>)}</div>}
    {remaining.length > 0 && <Accordion type="multiple" className="space-y-2 xl:hidden">{remaining.map((m) => <AccordionItem key={m.id} value={m.id} className="rounded-xl border bg-card px-4 shadow-sm"><AccordionTrigger className="text-left text-sm hover:no-underline">Módulo {data.modulos.indexOf(m) + 1} — {m.title}</AccordionTrigger><AccordionContent>{smallContent(m)}</AccordionContent></AccordionItem>)}</Accordion>}
  </div>;
}
