import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Award, CalendarDays, CheckCircle2, Clock, Download, FileCheck2, GraduationCap, Layers3, Linkedin, PlayCircle, UserRound, Users } from "lucide-react";
import { RouteGate } from "@/components/RouteGate";
import { CoverImage } from "@/components/CoverImage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoIcon, formatarDuracao, PassoTipoIcon, TIPO_PASSO } from "@/components/elearning/shared";
import { getCurso, inscreverCurso } from "@/lib/elearning.functions";
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
  const fetchFn = useServerFn(getCurso);
  const inscFn = useServerFn(inscreverCurso);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["elearning", "curso", cursoId], queryFn: () => fetchFn({ data: { cursoId } }) });
  const [turma, setTurma] = useState("");
  const insc = useMutation({
    mutationFn: () => inscFn({ data: { cursoId, turmaId: turma || null } }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["elearning"] }); await qc.invalidateQueries({ queryKey: ["badges"] }); },
    onError: () => undefined,
  });
  if (isLoading) return <CourseSkeleton />;
  if (error || !data) return <p className="p-6 text-sm text-destructive">{(error as Error)?.message ?? "Curso não encontrado."}</p>;
  const { curso, modulos } = data;
  const primeiro = modulos.flatMap((m) => m.passos).find((p) => p.estado !== "bloqueado")?.id;
  const temPassos = modulos.some((m) => m.passos.length > 0);
  const disponivelParaInscricao = curso.estado === "publicado";
  const atual = modulos.find((m) => m.passos.some((p) => p.id === curso.inscricao?.proximo_passo_id))?.id ?? modulos[0]?.id;
  const concluido = curso.inscricao?.estado === "concluido";
  const acao = () => {
    if (concluido && data.certificado) window.open(data.certificado.url, "_blank", "noopener,noreferrer");
    else if (curso.inscricao?.proximo_passo_id) navigate({ to: "/elearning/$cursoId/passo/$passoId", params: { cursoId, passoId: curso.inscricao.proximo_passo_id } });
    else if (curso.inscricao && primeiro) navigate({ to: "/elearning/$cursoId/passo/$passoId", params: { cursoId, passoId: primeiro } });
    else if (disponivelParaInscricao && temPassos) insc.mutate();
  };
  const acaoLabel = concluido && data.certificado
    ? "Ver certificado"
    : !temPassos
      ? "Conteúdos em preparação"
      : !disponivelParaInscricao && !curso.inscricao
        ? "Curso ainda não publicado"
        : curso.inscricao
          ? (curso.inscricao.pct ? "Continuar" : "Começar")
          : "Inscrever-me";
  const disabled = insc.isPending || (!temPassos && !(concluido && data.certificado)) || (!curso.inscricao && !disponivelParaInscricao) || (!curso.inscricao && curso.modalidade === "turma" && !turma);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24 lg:pb-0">
      <Link to="/elearning" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar aos cursos</Link>
      <div className="overflow-hidden bg-card shadow-sm">
        <div className="aspect-[16/7] min-h-48 bg-muted sm:aspect-[21/7]">
          {curso.cover_url ? <CoverImage src={curso.cover_url} position={curso.cover_position} scale={curso.cover_scale} loading="eager" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-secondary via-primary to-accent"><GraduationCap className="h-16 w-16 text-primary-foreground" /></div>}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
        <main className="min-w-0 space-y-8">
          <section>
             <div className="flex max-w-full flex-wrap gap-2"><Badge variant="secondary">{curso.modalidade === "turma" ? "Em turma · B-learning" : "Autónomo · Online"}</Badge>{curso.cluster_name && <Badge variant="outline" className="max-w-full whitespace-normal">{curso.cluster_name}</Badge>}{curso.acreditacao_ref && <Badge variant="outline" className="max-w-full whitespace-normal">Acreditação {curso.acreditacao_ref}</Badge>}</div>
             <h1 className="mt-3 break-words text-2xl font-semibold sm:text-3xl">{curso.title}</h1>
            {curso.description && <div className="rich-text mt-4 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(curso.description) }} />}
          </section>

          {!curso.inscricao && curso.modalidade === "turma" && <section className="space-y-3"><div><h2 className="text-lg font-semibold">Escolhe a tua turma</h2><p className="text-sm text-muted-foreground">Seleciona uma turma com inscrições abertas e vagas disponíveis.</p></div>{curso.turmas_abertas.length ? <div className="grid gap-3 sm:grid-cols-2">{curso.turmas_abertas.map((t) => { const restantes = t.vagas == null ? null : Math.max(0, t.vagas - t.inscritos); const selected = turma === t.id; return <button key={t.id} type="button" onClick={() => setTurma(t.id)} className={`text-left border p-4 transition-colors ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-muted/50"}`}><div className="flex items-start justify-between gap-2"><p className="font-semibold">{t.nome}</p>{selected && <CheckCircle2 className="h-5 w-5 text-primary" />}</div><div className="mt-3 space-y-1.5 text-xs text-muted-foreground"><p className="flex gap-2"><CalendarDays className="h-4 w-4" />{fmt(t.data_inicio)} — {fmt(t.data_fim)}</p><p className="flex gap-2"><Users className="h-4 w-4" />{restantes == null ? "Sem limite de vagas" : `${restantes} vaga${restantes === 1 ? "" : "s"} disponível${restantes === 1 ? "" : "is"}`}</p>{t.formador && <p className="flex gap-2"><UserRound className="h-4 w-4" />{t.formador}</p>}</div></button>; })}</div> : <Card className="p-4 text-sm text-muted-foreground">De momento não há turmas com inscrições abertas.</Card>}</section>}

          {concluido && <Celebracao data={data} />}

          <section className="space-y-3"><div><h2 className="text-lg font-semibold">Conteúdos do curso</h2><p className="text-sm text-muted-foreground">Acompanha o teu progresso módulo a módulo.</p></div>{modulos.length === 0 ? <p className="text-sm text-muted-foreground">Ainda sem conteúdos.</p> : <Accordion type="multiple" defaultValue={atual ? [atual] : []} className="space-y-2">{modulos.map((m, i) => { const feitos = m.passos.filter((p) => p.estado === "concluido").length; const minutos = m.passos.reduce((n, p) => n + (p.duracao_min ?? 0), 0); return <AccordionItem key={m.id} value={m.id} className="border bg-card px-4"><AccordionTrigger className="gap-3 hover:no-underline"><div className="min-w-0 flex-1 text-left"><p className="font-semibold">{i + 1}. {m.title}</p><p className="mt-1 text-xs font-normal text-muted-foreground">{feitos}/{m.passos.length} passos · {formatarDuracao(minutos)}{m.abre_em ? ` · Abre a ${fmt(m.abre_em)}` : ""}</p><Progress value={m.passos.length ? feitos / m.passos.length * 100 : 0} className="mt-2 h-1" /></div></AccordionTrigger><AccordionContent><ul className="space-y-1 pb-2">{m.passos.map((p) => { const motivo = p.estado === "bloqueado" ? (m.abre_em ? `Abre a ${fmt(m.abre_em)}` : "Inscreve-te para aceder") : null; const inner = <><PassoTipoIcon tipo={p.tipo} className="h-4 w-4 text-muted-foreground" /><span className="min-w-0 flex-1"><span className="block truncate">{p.title}</span>{motivo && <span className="block text-xs text-muted-foreground">{motivo}</span>}</span>{p.duracao_min ? <span className="text-xs text-muted-foreground">{p.duracao_min} min</span> : null}<EstadoIcon estado={p.estado} /></>; return <li key={p.id}>{p.estado === "bloqueado" ? <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">{inner}</div> : <Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId, passoId: p.id }} className="flex items-center gap-2 px-2 py-2 text-sm hover:bg-muted">{inner}</Link>}</li>; })}</ul></AccordionContent></AccordionItem>; })}</Accordion>}</section>
        </main>

        <aside className="hidden lg:block"><Card className="sticky top-20 space-y-5 p-5"><Button className="w-full" onClick={acao} disabled={disabled}>{concluido && data.certificado ? <Download className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}{acaoLabel}</Button>{curso.inscricao && <div><div className="mb-2 flex justify-between text-sm"><span>Progresso</span><strong>{curso.inscricao.pct}%</strong></div><Progress value={curso.inscricao.pct} /></div>}<dl className="space-y-3 border-t pt-4 text-sm"><Stat icon={Clock} label="Duração" value={formatarDuracao(curso.total_minutos)} /><Stat icon={Layers3} label="Conteúdos" value={`${curso.total_modulos} módulos · ${curso.total_passos} passos`} />{data.turma && <><Stat icon={CalendarDays} label={data.turma.nome} value={`${fmt(data.turma.data_inicio)} — ${fmt(data.turma.data_fim)}`} />{data.turma.formador && <Stat icon={UserRound} label="Formador" value={data.turma.formador} />}</>}</dl>{curso.badge_final && <div className="flex items-center gap-3 border-t pt-4">{curso.badge_final.cover_url ? <img src={curso.badge_final.cover_url} alt="" className="h-12 w-12 rounded-full object-cover" /> : <Award className="h-10 w-10 text-primary" />}<div className="text-sm"><p className="text-xs text-muted-foreground">Badge ao concluir</p><p className="font-medium">{curso.badge_final.title}</p></div></div>}{curso.tem_certificado && <p className="flex items-center gap-2 border-t pt-4 text-sm"><FileCheck2 className="h-5 w-5 text-primary" /> Certificado digital incluído</p>}</Card></aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur lg:hidden"><Button className="w-full" onClick={acao} disabled={disabled}>{acaoLabel}</Button></div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) { return <div className="flex gap-3"><Icon className="mt-0.5 h-4 w-4 text-primary" /><div><dt className="text-xs text-muted-foreground">{label}</dt><dd>{value}</dd></div></div>; }

function Celebracao({ data }: { data: Awaited<ReturnType<typeof getCurso>> }) {
  const cert = data.certificado;
  const linkedIn = cert ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cert.verificacao_url)}` : null;
  return <section className="border border-primary/30 bg-primary/5 p-5 text-center sm:p-7"><CheckCircle2 className="mx-auto h-10 w-10 text-primary" /><h2 className="mt-3 text-xl font-semibold">Parabéns, concluíste o curso!</h2>{data.curso.badge_final && <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-3">{data.curso.badge_final.cover_url ? <img src={data.curso.badge_final.cover_url} alt="" className="h-20 w-20 rounded-full object-cover" /> : <Award className="h-16 w-16 text-primary" />}<div className="text-left"><p className="text-xs text-muted-foreground">Badge obtido</p><p className="font-semibold">{data.curso.badge_final.title}</p></div></div>}<div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">{cert && <><Button asChild><a href={cert.url} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />Descarregar certificado</a></Button><Button variant="outline" asChild><a href={cert.verificacao_url} target="_blank" rel="noreferrer">Verificar certificado</a></Button>{linkedIn && <Button variant="outline" asChild><a href={linkedIn} target="_blank" rel="noreferrer"><Linkedin className="mr-2 h-4 w-4" />Partilhar</a></Button>}</>}</div><Button asChild variant="link" className="mt-3"><Link to="/elearning">Descobrir outros cursos</Link></Button></section>;
}

function CourseSkeleton() { return <div className="mx-auto max-w-6xl space-y-6"><Skeleton className="h-5 w-40" /><Skeleton className="aspect-[21/7] w-full" /><div className="grid gap-8 lg:grid-cols-[1fr_330px]"><div className="space-y-3"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-24 w-full" /><Skeleton className="h-20 w-full" /></div><Skeleton className="h-80 w-full" /></div></div>; }
