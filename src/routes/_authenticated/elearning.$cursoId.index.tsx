import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Award, CalendarDays, CheckCircle2, Clock, Download, FileCheck2, Layers3, Linkedin, UserRound, Users } from "lucide-react";
import { RouteGate } from "@/components/RouteGate";
import { CourseGuide } from "@/components/elearning/CourseGuide";
import { useCourseLayout } from "@/components/elearning/CourseLayoutContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EstadoIcon, formatarDuracao, PassoTipoIcon, TIPO_PASSO } from "@/components/elearning/shared";
import { getCurso } from "@/lib/elearning.functions";
import { sanitizeRichHtml } from "@/lib/sanitize-html";

export const Route = createFileRoute("/_authenticated/elearning/$cursoId/")({
  head: () => ({ meta: [
    { title: "Curso — Escola Ubuntu Online" },
    { name: "description", content: "Detalhes, módulos e inscrição no curso da Escola Ubuntu Online." },
    { property: "og:title", content: "Curso — Escola Ubuntu Online" },
    { property: "og:description", content: "Detalhes, módulos e inscrição no curso." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <RouteGate path="/elearning"><CursoPage /></RouteGate>,
});

function fmt(d: string | null) {
  return d ? new Date(`${d}T00:00:00`).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" }) : "Data a definir";
}

function CursoPage() {
  const { cursoId } = Route.useParams();
  const { data, turmaId: turma, setTurmaId: setTurma } = useCourseLayout();
  const { curso, modulos } = data;
  const atual = modulos.find((m) => m.passos.some((p) => p.id === curso.inscricao?.proximo_passo_id))?.id ?? modulos[0]?.id;
  const concluido = curso.inscricao?.estado === "concluido";
  const inscrito = !!curso.inscricao;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24 sm:pb-0">
      <Link to="/elearning" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar aos cursos</Link>
      <div className="grid gap-8 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0 space-y-8">
          {curso.inscricao && !concluido && <ContinuarBloco />}
          {inscrito && <CourseGuide data={data} />}
          {!inscrito && <section>
             {(curso.cluster_name || curso.acreditacao_ref) && <div className="flex max-w-full flex-wrap gap-2">{curso.cluster_name && <Badge variant="outline" className="max-w-full whitespace-normal">{curso.cluster_name}</Badge>}{curso.acreditacao_ref && <Badge variant="outline" className="max-w-full whitespace-normal">Acreditação {curso.acreditacao_ref}</Badge>}</div>}
             {curso.description && <div className="rich-text mt-4 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(curso.description) }} />}
          </section>}

          {!curso.inscricao && curso.modalidade === "turma" && <section className="space-y-3"><div><h2 className="text-lg font-semibold">Escolhe a tua turma</h2><p className="text-sm text-muted-foreground">Seleciona uma turma com inscrições abertas e vagas disponíveis.</p></div>{curso.turmas_abertas.length ? <div className="grid gap-3 sm:grid-cols-2">{curso.turmas_abertas.map((t) => { const restantes = t.vagas == null ? null : Math.max(0, t.vagas - t.inscritos); const selected = turma === t.id; return <button key={t.id} type="button" onClick={() => setTurma(t.id)} className={`text-left border p-4 transition-colors ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-muted/50"}`}><div className="flex items-start justify-between gap-2"><p className="font-semibold">{t.nome}</p>{selected && <CheckCircle2 className="h-5 w-5 text-primary" />}</div><div className="mt-3 space-y-1.5 text-xs text-muted-foreground"><p className="flex gap-2"><CalendarDays className="h-4 w-4" />{fmt(t.data_inicio)} — {fmt(t.data_fim)}</p><p className="flex gap-2"><Users className="h-4 w-4" />{restantes == null ? "Sem limite de vagas" : `${restantes} vaga${restantes === 1 ? "" : "s"} disponível${restantes === 1 ? "" : "is"}`}</p>{t.formador && <p className="flex gap-2"><UserRound className="h-4 w-4" />{t.formador}</p>}</div></button>; })}</div> : <Card className="p-4 text-sm text-muted-foreground">De momento não há turmas com inscrições abertas.</Card>}</section>}

          {concluido && <Celebracao data={data} />}

          {!inscrito && <><PercursoSection a={curso.apresentacao} /><ComoFuncionaSection a={curso.apresentacao} /></>}
          <section className="space-y-3"><div><h2 className="text-lg font-semibold">Conteúdos do curso</h2><p className="text-sm text-muted-foreground">Acompanha o teu progresso módulo a módulo.</p></div>{modulos.length === 0 ? <p className="text-sm text-muted-foreground">Ainda sem conteúdos.</p> : <Accordion type="multiple" defaultValue={atual ? [atual] : []} className="space-y-2">{modulos.map((m, i) => { if (!m.passos.length) return <div key={m.id} className="flex items-center justify-between gap-3 border border-dashed bg-card px-4 py-4"><p className="min-w-0 font-semibold text-muted-foreground">{i + 1}. {m.title}</p><Badge variant="secondary" className="shrink-0">Em breve</Badge></div>; const feitos = m.passos.filter((p) => p.estado === "concluido").length; const minutos = m.passos.reduce((n, p) => n + (p.duracao_min ?? 0), 0); return <AccordionItem key={m.id} value={m.id} className="border bg-card px-4"><AccordionTrigger className="gap-3 hover:no-underline"><div className="min-w-0 flex-1 text-left"><p className="font-semibold">{i + 1}. {m.title}</p><p className="mt-1 text-xs font-normal text-muted-foreground">{feitos}/{m.passos.length} momentos · {formatarDuracao(minutos)}{m.abre_em ? ` · Abre a ${fmt(m.abre_em)}` : ""}</p><Progress value={m.passos.length ? feitos / m.passos.length * 100 : 0} className="mt-2 h-1" /></div></AccordionTrigger><AccordionContent>{m.pergunta_fundo && <div className="mb-3 border-l-2 border-primary bg-primary/5 px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Pergunta de fundo</p><p className="mt-1 text-sm font-medium">{m.pergunta_fundo}</p></div>}<ul className="space-y-1 pb-2">{m.passos.map((p, momentIndex) => { const motivo = p.estado === "bloqueado" ? p.bloqueio_motivo ?? "Momento indisponível" : null; const inner = <><PassoTipoIcon tipo={p.tipo} className="h-4 w-4 text-muted-foreground" /><span className="min-w-0 flex-1"><span className="block truncate">Momento {momentIndex + 1} — {p.title}</span>{motivo && <span className="block text-xs text-muted-foreground">{motivo}</span>}</span>{p.duracao_min ? <span className="text-xs text-muted-foreground">{p.duracao_min} min</span> : null}<EstadoIcon estado={p.estado} /></>; return <li key={p.id}>{p.estado === "bloqueado" ? <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">{inner}</div> : <Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId, passoId: p.id }} className="flex items-center gap-2 px-2 py-2 text-sm hover:bg-muted">{inner}</Link>}</li>; })}</ul></AccordionContent></AccordionItem>; })}</Accordion>}</section>
          {inscrito && <SobreFormacao description={curso.description} a={curso.apresentacao} />}
        </main>

        <aside className="hidden 2xl:block"><Card className="sticky top-[calc(var(--course-top)+1rem)] space-y-5 p-5">{curso.inscricao && <div><div className="mb-2 flex justify-between text-sm"><span>Progresso</span><strong>{curso.inscricao.pct}%</strong></div><Progress value={curso.inscricao.pct} /></div>}<dl className="space-y-3 text-sm"><Stat icon={Clock} label="Duração" value={formatarDuracao(curso.total_minutos)} /><Stat icon={Layers3} label="Conteúdos" value={`${curso.total_modulos} módulos · ${curso.total_passos} momentos${curso.modulos_em_breve ? ` · ${curso.modulos_em_breve} em breve` : ""}`} />{data.turma && <><Stat icon={CalendarDays} label={data.turma.nome} value={`${fmt(data.turma.data_inicio)} — ${fmt(data.turma.data_fim)}`} />{data.turma.formador && <Stat icon={UserRound} label="Formador" value={data.turma.formador} />}</>}</dl>{curso.badge_final && <div className="flex items-center gap-3 border-t pt-4">{curso.badge_final.cover_url ? <img src={curso.badge_final.cover_url} alt="" className="h-12 w-12 rounded-full object-cover" /> : <Award className="h-10 w-10 text-primary" />}<div className="text-sm"><p className="text-xs text-muted-foreground">Badge ao concluir</p><p className="font-medium">{curso.badge_final.title}</p></div></div>}{curso.tem_certificado && <p className="flex items-center gap-2 border-t pt-4 text-sm"><FileCheck2 className="h-5 w-5 text-primary" /> Certificado digital incluído</p>}</Card></aside>
      </div>
    </div>
  );
}

function ContinuarBloco() {
  const { cursoId } = Route.useParams();
  const { data, formationStepId } = useCourseLayout();
  const momentos = data.modulos.flatMap((m, i) => m.passos.map((p) => ({ ...p, modulo: m, indice: i + 1 })));
  const proximo = momentos.find((p) => p.id === data.curso.inscricao?.proximo_passo_id) ?? momentos.find((p) => p.id === formationStepId);
  const emBreve = data.curso.modulos_em_breve > 0;
  if (!data.curso.inscricao?.proximo_passo_id) {
    if (!emBreve || !passos.length) return null;
    return <Card className="border-l-4 border-l-primary p-5"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Estás em dia</p><p className="mt-1 font-semibold">Concluíste todos os módulos disponíveis</p><p className="mt-1 text-sm text-muted-foreground">Os restantes módulos estarão disponíveis em breve. Vamos avisar-te por email e na plataforma.</p></Card>;
  }
  if (!proximo) return null;
  const iniciado = data.curso.inscricao.iniciado;
  return <Card className="grid gap-4 border-l-4 border-l-primary p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-primary">{iniciado ? "Continuar onde paraste" : "Pronto para começar"}</p><p className="mt-1 text-sm text-muted-foreground">Módulo {proximo.indice} · {proximo.modulo.title}</p><p className="mt-1 flex items-center gap-2 font-semibold"><PassoTipoIcon tipo={proximo.tipo} className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{proximo.title}</span>{proximo.duracao_min ? <span className="shrink-0 text-xs font-normal text-muted-foreground">{proximo.duracao_min} min</span> : null}</p></div><Button asChild className="min-h-11"><Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId, passoId: proximo.id }}>{iniciado ? "Continuar" : "Começar"}</Link></Button></Card>;
}

function SobreFormacao({ description, a }: { description: string | null; a: Apresentacao }) {
  const has = !!description || a.percurso.length || a.como_funciona.length || a.sequencia.length;
  if (!has) return null;
  return <Accordion type="single" collapsible className="border bg-card px-4"><AccordionItem value="sobre" className="border-0"><AccordionTrigger className="hover:no-underline"><span className="text-lg font-semibold">Sobre esta formação</span></AccordionTrigger><AccordionContent className="space-y-8 pb-5">{description && <div className="rich-text text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(description) }} />}<PercursoSection a={a} /></AccordionContent></AccordionItem></Accordion>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) { return <div className="flex gap-3"><Icon className="mt-0.5 h-4 w-4 text-primary" /><div><dt className="text-xs text-muted-foreground">{label}</dt><dd>{value}</dd></div></div>; }

function Celebracao({ data }: { data: Awaited<ReturnType<typeof getCurso>> }) {
  const cert = data.certificado;
  const linkedIn = cert ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cert.verificacao_url)}` : null;
  return <section className="border border-primary/30 bg-primary/5 p-5 text-center sm:p-7"><CheckCircle2 className="mx-auto h-10 w-10 text-primary" /><h2 className="mt-3 text-xl font-semibold">Parabéns, concluíste o curso!</h2>{data.curso.badge_final && <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-3">{data.curso.badge_final.cover_url ? <img src={data.curso.badge_final.cover_url} alt="" className="h-20 w-20 rounded-full object-cover" /> : <Award className="h-16 w-16 text-primary" />}<div className="min-w-0 text-left"><p className="text-xs text-muted-foreground">Badge obtido</p><p className="break-words font-semibold">{data.curso.badge_final.title}</p></div></div>}<div className="mt-5 flex flex-col flex-wrap justify-center gap-2 sm:flex-row">{cert && <><Button asChild><a href={cert.url} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />Descarregar certificado</a></Button><Button variant="outline" asChild><a href={cert.verificacao_url} target="_blank" rel="noreferrer">Verificar certificado</a></Button>{linkedIn && <Button variant="outline" asChild><a href={linkedIn} target="_blank" rel="noreferrer"><Linkedin className="mr-2 h-4 w-4" />Partilhar</a></Button>}</>}</div><Button asChild variant="link" className="mt-3"><Link to="/elearning">Descobrir outros cursos</Link></Button></section>;
}


type Apresentacao = { percurso: { titulo: string; descricao: string; estado: "concluido" | "atual" | "seguinte" | "aplicacao" }[]; como_funciona: { titulo: string; descricao: string }[]; sequencia: string[] };
const ESTADO_LABEL = { concluido: "Concluído", atual: "Está aqui", seguinte: "A seguir", aplicacao: "Aplicação" } as const;
function PercursoSection({ a }: { a: Apresentacao }) {
  if (!a.percurso.length) return null;
  return <section className="space-y-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Onde estás no percurso</p><h2 className="text-lg font-semibold">Esta formação é uma etapa do caminho</h2></div><ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{a.percurso.map((e, i) => { const atual = e.estado === "atual"; const feito = e.estado === "concluido"; return <li key={i} className={`relative border p-4 ${atual ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"}`}><div className="flex items-center gap-2"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${feito || atual ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{feito ? <CheckCircle2 className="h-4 w-4" /> : i + 1}</span><Badge variant={atual ? "default" : "secondary"} className="text-[10px]">{ESTADO_LABEL[e.estado]}</Badge></div><p className="mt-3 font-semibold">{e.titulo}</p>{e.descricao && <p className="mt-1 text-xs text-muted-foreground">{e.descricao}</p>}</li>; })}</ol></section>;
}
function ComoFuncionaSection({ a }: { a: Apresentacao }) {
  if (!a.como_funciona.length && !a.sequencia.length) return null;
  return <section className="space-y-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Como funciona</p><h2 className="text-lg font-semibold">Como funciona esta formação</h2></div>{a.como_funciona.length > 0 && <div className="grid gap-3 md:grid-cols-3">{a.como_funciona.map((c, i) => <Card key={i} className="border-t-2 border-t-primary p-4"><p className="font-semibold">{c.titulo}</p><p className="mt-1 text-sm text-muted-foreground">{c.descricao}</p></Card>)}</div>}{a.sequencia.length > 0 && <div className="border bg-muted/40 p-4"><p className="text-xs font-medium text-muted-foreground">Cada módulo segue a mesma sequência</p><ol className="mt-2 flex flex-wrap items-center gap-2 text-sm">{a.sequencia.map((s, i) => <li key={i} className="flex items-center gap-2"><span className="border bg-card px-2.5 py-1 font-medium">{s}</span>{i < a.sequencia.length - 1 && <span aria-hidden className="text-muted-foreground">→</span>}</li>)}</ol></div>}</section>;
}
