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
  if (!current) return null;
  const indice = data.modulos.indexOf(current);
  const remaining = data.modulos.filter((m) => m.id !== current.id);
  const smallContent = (m: ModuloResumo) => {
    const n = data.modulos.indexOf(m);
    const required = m.passos.filter((p) => p.obrigatorio);
    const done = required.length > 0 && required.every((p) => p.estado === "concluido");
    const locked = m.passos.length > 0 && m.passos.every((p) => p.estado === "bloqueado");
    const first = m.passos.find((p) => p.estado !== "bloqueado");
    return <><div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>Módulo {n + 1}</span>{done ? <Check className="h-4 w-4 text-primary" /> : locked || !m.passos.length ? <Lock className="h-4 w-4" /> : null}</div><h3 className="mt-3 text-xl">{m.title}</h3>{m.description && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{m.description.replace(/<[^>]*>/g, " ")}</p>}<p className="mt-5 text-xs font-medium text-muted-foreground">{!m.passos.length ? "Em breve" : done ? "✓ Concluído" : locked ? m.passos[0]?.bloqueio_motivo : "Disponível"}</p>{first && <Button variant="link" asChild className="mt-2 h-auto px-0"><Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId: data.curso.id, passoId: first.id }}>Abrir módulo</Link></Button>}</>;
  };
  return <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
    <section className="min-w-0 rounded-lg border-2 border-primary bg-learning-paper p-5 sm:p-7"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">Módulo {indice + 1}</p><Badge variant="outline">{current.passos.every((p) => p.estado === "concluido") && current.passos.length ? "Concluído" : data.curso.inscricao?.iniciado ? "Em curso" : "Por começar"}</Badge></div><h2 className="mt-4 text-2xl sm:text-3xl">{current.title}</h2>{current.pergunta_fundo && <p className="mt-4 text-sm leading-6 text-muted-foreground">Pergunta de fundo: <strong className="text-foreground">{current.pergunta_fundo}</strong></p>}
      <ol className="mt-6 space-y-3">{current.passos.map((p, i) => {
        const active = p.id === currentId; const done = p.estado === "concluido"; const locked = p.estado === "bloqueado";
        return <li key={p.id} className={`flex min-w-0 items-center gap-3 rounded-lg border p-3 ${active ? "border-primary bg-primary/5" : locked ? "border-dashed bg-card" : "bg-card"}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs ${active || done ? "bg-primary text-primary-foreground" : "border bg-muted text-muted-foreground"}`}>{done ? <Check className="h-4 w-4" /> : i + 1}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Momento {i + 1} — {p.title}</p><p className="mt-1 text-xs text-muted-foreground">{TIPO_PASSO[p.tipo]}{p.duracao_min ? ` · ~${p.duracao_min} min` : ""}</p>{locked && <p className="mt-1 text-xs text-muted-foreground">{p.bloqueio_motivo}</p>}</div>{locked ? <Lock className="h-4 w-4 shrink-0 text-muted-foreground" /> : <Button asChild variant={active ? "default" : "ghost"} size="sm" className="shrink-0 px-2"><Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId: data.curso.id, passoId: p.id }}>{active ? p.estado === "em_curso" ? "Continuar" : "Começar" : "Ver"}</Link></Button>}</li>;
      })}</ol>
    </section>
    <div className="hidden min-w-0 gap-4 lg:grid lg:grid-cols-2">{remaining.map((m) => <section key={m.id} className="min-w-0 rounded-lg border bg-card p-5">{smallContent(m)}</section>)}</div>
    <Accordion type="multiple" className="space-y-3 lg:hidden">{remaining.map((m) => <AccordionItem key={m.id} value={m.id} className="rounded-lg border bg-card px-4"><AccordionTrigger className="text-left text-sm hover:no-underline">Módulo {data.modulos.indexOf(m) + 1} — {m.title}</AccordionTrigger><AccordionContent>{smallContent(m)}</AccordionContent></AccordionItem>)}</Accordion>
  </div>;
}