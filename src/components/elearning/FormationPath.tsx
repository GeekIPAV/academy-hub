import { Link } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TIPO_PASSO } from "@/components/elearning/shared";
import type { CursoDetalhe, ModuloResumo } from "@/lib/elearning.functions";

type Estado = { done: boolean; locked: boolean; first: ModuloResumo["passos"][number] | undefined };

function estadoModulo(m: ModuloResumo): Estado {
  const required = m.passos.filter((p) => p.obrigatorio);
  const done = m.passos.length > 0 && (required.length ? required : m.passos).every((p) => p.estado === "concluido");
  const locked = m.passos.length > 0 && m.passos.every((p) => p.estado === "bloqueado");
  const first = m.passos.find((p) => p.estado !== "bloqueado");
  return { done, locked, first };
}

/** Percurso completo num só cartão: módulo atual aberto e restantes módulos como linhas recolhíveis. */
export function FormationPath({ data }: { data: CursoDetalhe }) {
  const currentId = data.curso.inscricao?.proximo_passo_id;
  const current = data.modulos.find((m) => m.passos.some((p) => p.id === currentId)) ?? data.modulos.find((m) => m.passos.length) ?? data.modulos[0];
  if (!current) return <p className="text-sm text-muted-foreground">Ainda sem conteúdos.</p>;
  const indice = data.modulos.indexOf(current);
  const remaining = data.modulos.filter((m) => m.id !== current.id);
  const currentDone = current.passos.length > 0 && current.passos.every((p) => p.estado === "concluido");

  return <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
    <div className="flex min-w-0 items-center justify-between gap-3 border-b bg-muted/40 px-5 py-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Módulo {indice + 1}</p>
        <h3 className="mt-1 truncate text-base font-bold text-secondary">{current.title}</h3>
      </div>
      <Badge variant="outline" className="shrink-0">{currentDone ? "Concluído" : data.curso.inscricao?.iniciado ? "Em curso" : "Por começar"}</Badge>
    </div>

    {current.pergunta_fundo && <p className="border-b px-5 py-3 text-sm text-muted-foreground">Pergunta de fundo: <strong className="font-semibold text-foreground">{current.pergunta_fundo}</strong></p>}

    <ol className="space-y-1 p-2">
      {current.passos.map((p, i) => {
        const active = p.id === currentId;
        const done = p.estado === "concluido";
        const locked = p.estado === "bloqueado";
        return <li key={p.id} className={`flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 ${active ? "bg-primary/5" : "hover:bg-muted/50"}`}>
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : done ? "bg-secondary text-secondary-foreground" : "border bg-muted text-muted-foreground"}`}>{done ? <Check className="h-4 w-4" /> : i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className={`line-clamp-2 text-sm leading-snug ${active ? "font-semibold" : "font-medium"} ${locked ? "text-muted-foreground" : ""}`}>Momento {i + 1} — {p.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{TIPO_PASSO[p.tipo]}{p.duracao_min ? ` · ~${p.duracao_min} min` : ""}{locked && p.bloqueio_motivo ? ` · ${p.bloqueio_motivo}` : ""}</p>
          </div>
          {locked ? <Lock className="h-4 w-4 shrink-0 text-muted-foreground" /> : <Button asChild variant={active ? "outline" : "ghost"} size="sm" className="shrink-0 px-2"><Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId: data.curso.id, passoId: p.id }}>{active ? p.estado === "em_curso" ? "Continuar" : "Começar" : "Ver"}</Link></Button>}
        </li>;
      })}
    </ol>

    {remaining.length > 0 && <div className="border-t p-2">
      <Accordion type="multiple" className="space-y-1">
        {remaining.map((m) => {
          const n = data.modulos.indexOf(m);
          const { done, locked, first } = estadoModulo(m);
          const label = !m.passos.length ? "Em breve" : done ? "Concluído" : locked ? "Bloqueado" : "Disponível";
          const motivo = !m.passos.length ? "Em breve" : done ? "Concluíste este módulo." : locked ? m.passos[0]?.bloqueio_motivo : "Podes começar quando quiseres.";
          return <AccordionItem key={m.id} value={m.id} className="rounded-lg border-0">
            <AccordionTrigger className="rounded-lg px-3 py-2.5 text-left hover:bg-muted/50 hover:no-underline">
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded text-[10px] font-bold ${done ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>{done ? <Check className="h-3.5 w-3.5" /> : locked ? <Lock className="h-3 w-3" /> : n + 1}</span>
                <span className="min-w-0 flex-1 text-sm leading-snug font-medium text-foreground">Módulo {n + 1} — {m.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              {m.description && <p className="text-sm text-muted-foreground">{m.description.replace(/<[^>]*>/g, " ")}</p>}
              <p className="mt-2 text-xs text-muted-foreground">{motivo}</p>
              {first && !done && <Button variant="link" asChild className="mt-1 h-auto px-0"><Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId: data.curso.id, passoId: first.id }}>Abrir módulo</Link></Button>}
            </AccordionContent>
          </AccordionItem>;
        })}
      </Accordion>
    </div>}
  </div>;
}
