import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, CalendarDays, CheckCircle2, Clock, Download, FileCheck2, Layers3, Linkedin, MonitorPlay, UserRound, Users } from "lucide-react";
import { RouteGate } from "@/components/RouteGate";
import { CadernoCard, ComoFuncionaList } from "@/components/elearning/CourseGuide";
import { FormationPath } from "@/components/elearning/FormationPath";
import { useCourseLayout } from "@/components/elearning/CourseLayoutContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatarDuracao, PassoTipoIcon, TIPO_PASSO } from "@/components/elearning/shared";
import { getCurso } from "@/lib/elearning.functions";
import { sanitizeRichHtml } from "@/lib/sanitize-html";

export const Route = createFileRoute("/_authenticated/elearning/$cursoId/")({
  head: () => ({ meta: [
    { title: "Curso — Escola Ubuntu Online" },
    { name: "description", content: "Percurso, módulos e inscrição no curso da Escola Ubuntu Online." },
    { property: "og:title", content: "Curso — Escola Ubuntu Online" },
    { property: "og:description", content: "Percurso, módulos e inscrição no curso." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <RouteGate path="/elearning"><CursoPage /></RouteGate>,
});

const CARD = "rounded-xl border bg-card p-5 shadow-sm";
const H2 = "text-xl font-bold text-secondary";

function fmt(d: string | null) {
  return d ? new Date(`${d}T00:00:00`).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" }) : "Data a definir";
}

function CursoPage() {
  const { data, turmaId: turma, setTurmaId: setTurma } = useCourseLayout();
  const { curso } = data;
  const concluido = curso.inscricao?.estado === "concluido";
  const naoComecou = !curso.inscricao || (!curso.inscricao.iniciado && !curso.inscricao.pct);

  return (
    <div className="w-full min-w-0 pb-8">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0 space-y-6">
          {concluido ? <Celebracao data={data} /> : <ArranqueBloco />}

          {!curso.inscricao && curso.modalidade === "turma" && <section className="space-y-3"><div><h2 className={H2}>Escolhe a tua turma</h2><p className="text-sm text-muted-foreground">Seleciona uma turma com inscrições abertas e vagas disponíveis.</p></div>{curso.turmas_abertas.length ? <div className="grid gap-3 sm:grid-cols-2">{curso.turmas_abertas.map((t) => { const restantes = t.vagas == null ? null : Math.max(0, t.vagas - t.inscritos); const selected = turma === t.id; return <button key={t.id} type="button" onClick={() => setTurma(t.id)} className={`rounded-xl border p-4 text-left shadow-sm transition-colors ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-muted/50"}`}><div className="flex items-start justify-between gap-2"><p className="font-semibold">{t.nome}</p>{selected && <CheckCircle2 className="h-5 w-5 text-primary" />}</div><div className="mt-3 space-y-1.5 text-xs text-muted-foreground"><p className="flex gap-2"><CalendarDays className="h-4 w-4" />{fmt(t.data_inicio)} — {fmt(t.data_fim)}</p><p className="flex gap-2"><Users className="h-4 w-4" />{restantes == null ? "Sem limite de vagas" : `${restantes} vaga${restantes === 1 ? "" : "s"} disponível${restantes === 1 ? "" : "is"}`}</p>{t.formador && <p className="flex gap-2"><UserRound className="h-4 w-4" />{t.formador}</p>}</div></button>; })}</div> : <div className={`${CARD} text-sm text-muted-foreground`}>De momento não há turmas com inscrições abertas.</div>}</section>}

          <section className="space-y-3"><h2 className={H2}>O teu percurso</h2><FormationPath data={data} /></section>

          {(curso.apresentacao.como_funciona.length > 0 || curso.apresentacao.sequencia.length > 0) && <Accordion type="single" collapsible defaultValue={naoComecou ? "cf" : undefined} className={`${CARD} py-0`}><AccordionItem value="cf" className="border-0"><AccordionTrigger className="hover:no-underline"><span className={H2}>Como funciona esta formação</span></AccordionTrigger><AccordionContent className="pb-5"><ComoFuncionaList data={data} /></AccordionContent></AccordionItem></Accordion>}

          <SobreFormacao description={curso.description} a={curso.apresentacao} cluster={curso.cluster_name} acreditacao={curso.acreditacao_ref} />
        </main>

        <aside className="min-w-0"><div className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm lg:sticky lg:top-[calc(var(--course-top)+1rem)]"><ResumoCard /><BadgeCard /><CadernoCard data={data} bare /></div></aside>
      </div>
    </div>
  );
}

function ArranqueBloco() {
  const { cursoId } = Route.useParams();
  const { data, formationStepId, primary } = useCourseLayout();
  const momentos = data.modulos.flatMap((m, i) => m.passos.map((p) => ({ ...p, modulo: m, indice: i + 1 })));
  const insc = data.curso.inscricao;
  if (insc && !insc.proximo_passo_id) {
    if (!data.curso.modulos_em_breve || !momentos.length) return null;
    return <div className={`${CARD} border-l-4 border-l-primary`}><p className="text-xs font-semibold uppercase tracking-wide text-primary">Estás em dia</p><p className="mt-1 font-semibold">Concluíste todos os módulos disponíveis</p><p className="mt-1 text-sm text-muted-foreground">Os restantes módulos estarão disponíveis em breve. Vamos avisar-te por email e na plataforma.</p></div>;
  }
  const proximo = momentos.find((p) => p.id === insc?.proximo_passo_id) ?? momentos.find((p) => p.id === formationStepId) ?? momentos[0];
  if (!proximo) return null;
  const emCurso = !!insc && insc.pct > 0;
  return <div className={`${CARD} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
    <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-primary">O que faço agora</p><h2 className="mt-1.5 truncate text-lg font-bold text-secondary">{proximo.title}</h2><p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><PassoTipoIcon tipo={proximo.tipo} className="h-4 w-4 shrink-0" /><span className="truncate">Módulo {proximo.indice} · {TIPO_PASSO[proximo.tipo]}{proximo.duracao_min ? ` · ~${proximo.duracao_min} min` : ""}</span></p></div>
    {insc ? <Button asChild className="min-h-11 shrink-0"><Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId, passoId: proximo.id }}>{emCurso ? "Continuar" : "Começar"}</Link></Button> : <Button className="min-h-11 shrink-0" onClick={primary.run} disabled={primary.disabled}>{primary.label}</Button>}
  </div>;
}

function ResumoCard() {
  const { data } = useCourseLayout();
  const { curso } = data;
  const modality = curso.modalidade === "turma" ? "Em turma · B-learning" : "Autónomo · Online";
  return <div className="p-5"><h3 className="text-sm font-bold text-secondary">Resumo da formação</h3>
    <div className="mt-4"><div className="mb-2 flex justify-between text-sm"><span>Progresso</span><strong>{curso.inscricao?.pct ?? 0}%</strong></div><Progress value={curso.inscricao?.pct ?? 0} /></div>
    <dl className="mt-4 space-y-3 text-sm"><Stat icon={Clock} label="Duração" value={formatarDuracao(curso.total_minutos)} /><Stat icon={Layers3} label="Conteúdos" value={`${curso.total_modulos} módulos · ${curso.total_passos} momentos${curso.modulos_em_breve ? ` · ${curso.modulos_em_breve} em breve` : ""}`} /><Stat icon={MonitorPlay} label="Modalidade" value={modality} />{data.turma && <><Stat icon={CalendarDays} label={data.turma.nome} value={`${fmt(data.turma.data_inicio)} — ${fmt(data.turma.data_fim)}`} />{data.turma.formador && <Stat icon={UserRound} label="Formador" value={data.turma.formador} />}</>}</dl>
  </div>;
}

function BadgeCard() {
  const { data } = useCourseLayout();
  const { curso } = data;
  if (!curso.badge_final && !curso.tem_certificado) return null;
  return <div className="space-y-4 p-5">{curso.badge_final && <div className="flex items-center gap-3">{curso.badge_final.cover_url ? <img src={curso.badge_final.cover_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" /> : <Award className="h-10 w-10 shrink-0 text-secondary" />}<div className="min-w-0 text-sm"><p className="text-xs text-muted-foreground">Badge ao concluir</p><p className="font-semibold">{curso.badge_final.title}</p></div></div>}{curso.tem_certificado && <p className="flex items-center gap-2 text-sm"><FileCheck2 className="h-5 w-5 text-secondary" />{data.certificado ? <a href={data.certificado.url} target="_blank" rel="noreferrer" className="underline">Ver certificado</a> : "Certificado digital incluído"}</p>}</div>;
}

function SobreFormacao({ description, a, cluster, acreditacao }: { description: string | null; a: Apresentacao; cluster: string | null; acreditacao: string | null }) {
  if (!description && !a.percurso.length && !cluster && !acreditacao) return null;
  return <Accordion type="single" collapsible className={`${CARD} py-0`}><AccordionItem value="sobre" className="border-0"><AccordionTrigger className="hover:no-underline"><span className={H2}>Sobre esta formação</span></AccordionTrigger><AccordionContent className="space-y-6 pb-5">{(cluster || acreditacao) && <div className="flex flex-wrap gap-2">{cluster && <Badge variant="outline" className="whitespace-normal">{cluster}</Badge>}{acreditacao && <Badge variant="outline" className="whitespace-normal">Acreditação {acreditacao}</Badge>}</div>}{description && <div className="rich-text text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(description) }} />}<PercursoSection a={a} /></AccordionContent></AccordionItem></Accordion>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) { return <div className="flex gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /><div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd>{value}</dd></div></div>; }

function Celebracao({ data }: { data: Awaited<ReturnType<typeof getCurso>> }) {
  const cert = data.certificado;
  const linkedIn = cert ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cert.verificacao_url)}` : null;
  return <section className={`${CARD} text-center sm:p-7`}><CheckCircle2 className="mx-auto h-10 w-10 text-secondary" /><h2 className={`mt-3 ${H2}`}>Parabéns, concluíste o curso!</h2>{data.curso.badge_final && <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-3">{data.curso.badge_final.cover_url ? <img src={data.curso.badge_final.cover_url} alt="" className="h-20 w-20 rounded-full object-cover" /> : <Award className="h-16 w-16 text-secondary" />}<div className="min-w-0 text-left"><p className="text-xs text-muted-foreground">Badge obtido</p><p className="break-words font-semibold">{data.curso.badge_final.title}</p></div></div>}<div className="mt-5 flex flex-col flex-wrap justify-center gap-2 sm:flex-row">{cert && <><Button asChild><a href={cert.url} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />Descarregar certificado</a></Button><Button variant="outline" asChild><a href={cert.verificacao_url} target="_blank" rel="noreferrer">Verificar certificado</a></Button>{linkedIn && <Button variant="outline" asChild><a href={linkedIn} target="_blank" rel="noreferrer"><Linkedin className="mr-2 h-4 w-4" />Partilhar</a></Button>}</>}</div></section>;
}

type Apresentacao = { percurso: { titulo: string; descricao: string; estado: "concluido" | "atual" | "seguinte" | "aplicacao" }[]; como_funciona: { titulo: string; descricao: string }[]; sequencia: string[] };
const ESTADO_LABEL = { concluido: "Concluído", atual: "Está aqui", seguinte: "A seguir", aplicacao: "Aplicação" } as const;
function PercursoSection({ a }: { a: Apresentacao }) {
  if (!a.percurso.length) return null;
  return <div className="space-y-3"><p className="text-sm font-semibold text-secondary">Esta formação é uma etapa do caminho</p><ol className="grid gap-2 sm:grid-cols-2">{a.percurso.map((e, i) => { const atual = e.estado === "atual"; const feito = e.estado === "concluido"; return <li key={i} className={`rounded-lg border p-3 ${atual ? "border-primary/60 bg-primary/5" : ""}`}><div className="flex items-center gap-2"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${feito || atual ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>{feito ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}</span><span className="text-xs text-muted-foreground">{ESTADO_LABEL[e.estado]}</span></div><p className="mt-2 text-sm font-semibold">{e.titulo}</p>{e.descricao && <p className="mt-1 text-xs text-muted-foreground">{e.descricao}</p>}</li>; })}</ol></div>;
}
