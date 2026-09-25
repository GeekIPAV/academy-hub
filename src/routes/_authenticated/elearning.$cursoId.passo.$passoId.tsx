import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Download, ExternalLink, ListTree, RotateCcw, XCircle } from "lucide-react";
import { RouteGate } from "@/components/RouteGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/rich-text-editor";
import { VimeoPlayer } from "@/components/elearning/VimeoPlayer";
import { EstadoIcon, PassoTipoIcon, TIPO_PASSO } from "@/components/elearning/shared";
import { concluirPasso, getPasso, guardarRascunhoReflexao, registarVideo, submeterQuiz, submeterReflexao, type CursoDetalhe, type PassoDetalhe } from "@/lib/elearning.functions";
import { sanitizeRichHtml } from "@/lib/sanitize-html";

export const Route = createFileRoute("/_authenticated/elearning/$cursoId/passo/$passoId")({
  head: () => ({ meta: [
    { title: "Passo do curso — Escola Ubuntu Online" },
    { name: "description", content: "Leitor de conteúdos do curso da Escola Ubuntu Online." },
    { property: "og:title", content: "Passo do curso — Escola Ubuntu Online" },
    { property: "og:description", content: "Leitor de conteúdos do curso." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <RouteGate path="/elearning"><LeitorPage /></RouteGate>,
});

function Indice({ curso, cursoId, atual }: { curso: CursoDetalhe; cursoId: string; atual: string }) {
  return <nav className="space-y-5 text-sm">{curso.modulos.map((m, i) => { const feitos = m.passos.filter((p) => p.estado === "concluido").length; return <div key={m.id}><div className="mb-2"><div className="flex justify-between gap-2"><p className="font-medium">{i + 1}. {m.title}</p><span className="text-xs text-muted-foreground">{feitos}/{m.passos.length}</span></div><Progress value={m.passos.length ? feitos / m.passos.length * 100 : 0} className="mt-1 h-1" /></div><ul className="space-y-1">{m.passos.map((p) => { const inner = <><PassoTipoIcon tipo={p.tipo} className="h-4 w-4" /><span className="min-w-0 flex-1 line-clamp-2">{p.title}</span><EstadoIcon estado={p.estado} /></>; return <li key={p.id}>{p.estado === "bloqueado" && curso.curso.inscricao ? <span className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground">{inner}</span> : <Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId, passoId: p.id }} className={`flex items-center gap-2 px-2 py-1.5 hover:bg-muted ${p.id === atual ? "bg-muted font-medium" : ""}`}>{inner}</Link>}</li>; })}</ul></div>; })}</nav>;
}

function LeitorPage() {
  const { cursoId, passoId } = Route.useParams();
  const fetchFn = useServerFn(getPasso);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [celebrar, setCelebrar] = useState(false);
  const key = ["elearning", "passo", cursoId, passoId];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => fetchFn({ data: { cursoId, passoId } }) });
  const onDone = (cursoConcluido?: boolean) => { qc.invalidateQueries({ queryKey: ["elearning"] }); if (cursoConcluido) { setCelebrar(true); qc.invalidateQueries({ queryKey: ["badges"] }); } };
  if (isLoading) return <ReaderSkeleton />;
  if (error || !data) return <p className="p-6 text-sm text-destructive">{(error as Error)?.message ?? "Passo não encontrado."}</p>;
  const { passo, curso } = data;
  const flat = curso.modulos.flatMap((m) => m.passos);
  const pos = flat.findIndex((p) => p.id === passo.id) + 1;
  const inscrito = !!curso.curso.inscricao;
  const goNext = () => data.seguinte ? navigate({ to: "/elearning/$cursoId/passo/$passoId", params: { cursoId, passoId: data.seguinte } }) : navigate({ to: "/elearning/$cursoId", params: { cursoId } });
  return <div className="mx-auto max-w-7xl pb-8">
    <header className="sticky top-14 z-30 -mx-4 mb-5 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"><div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)] items-center gap-3 lg:grid-cols-[280px_minmax(0,1fr)]"><div className="flex min-w-0 items-center gap-2"><Sheet><SheetTrigger asChild><Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir índice"><ListTree className="h-4 w-4" /></Button></SheetTrigger><SheetContent side="left" className="overflow-y-auto"><SheetHeader><SheetTitle>{curso.curso.title}</SheetTitle></SheetHeader><div className="mt-5"><Indice curso={curso} cursoId={cursoId} atual={passoId} /></div></SheetContent></Sheet><Link to="/elearning/$cursoId" params={{ cursoId }} className="truncate text-sm font-medium"><ArrowLeft className="mr-1 inline h-4 w-4" />{curso.curso.title}</Link></div><div className="min-w-0"><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Passo {pos} de {flat.length}</span><span>{curso.curso.inscricao?.pct ?? 0}%</span></div><Progress value={curso.curso.inscricao?.pct ?? 0} className="h-1.5" /></div></div></header>
    <div className="flex gap-7"><aside className="sticky top-32 hidden max-h-[calc(100svh-9rem)] w-72 shrink-0 overflow-y-auto border-r pr-5 lg:block"><Indice curso={curso} cursoId={cursoId} atual={passoId} /></aside><main className="min-w-0 flex-1"><div className="mx-auto max-w-3xl space-y-6"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><PassoTipoIcon tipo={passo.tipo} />{TIPO_PASSO[passo.tipo]}{passo.duracao_min ? ` · ${passo.duracao_min} min` : ""}</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{passo.title}</h1></div>{!inscrito && <p className="border border-dashed p-3 text-xs text-muted-foreground">Pré-visualização da equipa — o progresso não é registado.</p>}<PassoConteudo key={passo.id} data={data} inscrito={inscrito} onDone={onDone} refetch={() => qc.invalidateQueries({ queryKey: key })} onContinue={goNext} /><div className="flex items-center justify-between border-t pt-5"><Button variant="ghost" disabled={!data.anterior} onClick={() => data.anterior && navigate({ to: "/elearning/$cursoId/passo/$passoId", params: { cursoId, passoId: data.anterior } })}><ChevronLeft className="mr-1 h-4 w-4" /> Anterior</Button></div></div></main></div>
    <Dialog open={celebrar} onOpenChange={setCelebrar}><DialogContent className="text-center"><DialogHeader><DialogTitle className="text-center text-2xl">Parabéns!</DialogTitle></DialogHeader><CheckCircle2 className="mx-auto h-16 w-16 text-primary" /><p>Concluíste o curso. O teu badge e certificado estão a ser preparados.</p><Button onClick={() => navigate({ to: "/elearning/$cursoId", params: { cursoId } })}>Ver a conclusão do curso</Button></DialogContent></Dialog>
  </div>;
}

function PassoConteudo({ data, inscrito, onDone, refetch, onContinue }: { data: PassoDetalhe; inscrito: boolean; onDone: (c?: boolean) => void; refetch: () => void; onContinue: () => void }) {
  const { passo, progresso } = data;
  const c = passo.conteudo as Record<string, string | boolean | undefined>;
  const concluido = progresso?.estado === "concluido";
  const concluirFn = useServerFn(concluirPasso);
  const videoFn = useServerFn(registarVideo);
  const [videoPct, setVideoPct] = useState(progresso?.video_pct ?? 0);
  const concluir = useMutation({ mutationFn: () => concluirFn({ data: { passoId: passo.id } }), onSuccess: (r) => { onDone(r.cursoConcluido); refetch(); if (!r.cursoConcluido) onContinue(); }, onError: (e: Error) => toast.error(e.message) });
  const intro = typeof c.html === "string" && c.html ? <div className="rich-text" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(c.html) }} /> : null;
  const footer = (ready: boolean, help?: string, action?: () => void, pending?: boolean) => <div className="mt-8 border-t pt-5">{help && !ready && <p className="mb-3 text-sm text-muted-foreground">{help}</p>}<Button className="w-full sm:w-auto sm:float-right" disabled={!ready || pending} onClick={action ?? onContinue}>{data.seguinte ? "Concluir e continuar" : "Concluir curso"}<ChevronRight className="ml-2 h-4 w-4" /></Button><div className="clear-both" /></div>;
  if (passo.tipo === "video") return <div className="space-y-4"><VimeoPlayer video={String(c.vimeo ?? "")} startAt={progresso?.video_posicao_s ?? 0} onProgress={(pct, sec) => { if (!inscrito) return; setVideoPct((v) => Math.max(v, pct)); videoFn({ data: { passoId: passo.id, pct, posicao: sec } }).then((r) => { if (r.concluido && !concluido) { onDone(r.cursoConcluido); refetch(); } }).catch(() => undefined); }} />{inscrito && <div><Progress value={videoPct} className="h-1" /><p className="mt-2 text-xs text-muted-foreground">{videoPct >= data.curso.curso.pct_minima_video ? <span className="font-medium text-primary">✓ Concluído</span> : `${Math.round(videoPct)}% visto`}</p></div>}{intro}{footer(concluido || videoPct >= data.curso.curso.pct_minima_video, "Vê o vídeo até ao fim para continuar")}</div>;
  if (passo.tipo === "texto") return <div>{intro ?? <p className="text-sm text-muted-foreground">Sem conteúdo.</p>}{footer(true, undefined, concluido ? onContinue : () => concluir.mutate(), concluir.isPending)}</div>;
  if (passo.tipo === "recurso") { const pdf = passo.recurso?.resource_type?.toLowerCase().includes("pdf") || passo.recurso?.file_url?.toLowerCase().includes(".pdf"); return <div className="space-y-4">{intro}{passo.recurso ? <>{pdf && <div className="aspect-[4/5] min-h-[480px] overflow-hidden border"><iframe src={passo.recurso.file_url} title={passo.recurso.title} className="h-full w-full" /></div>}<Card className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4">{passo.recurso.cover_url && <img src={passo.recurso.cover_url} alt="" className="h-14 w-14 object-cover" />}<div className="min-w-0"><p className="font-medium">{passo.recurso.title}</p><p className="line-clamp-2 text-sm text-muted-foreground">{passo.recurso.description}</p></div><Button variant="outline" size="icon" asChild><a href={passo.recurso.file_url} target="_blank" rel="noreferrer" aria-label="Abrir ou descarregar"><Download className="h-4 w-4" /></a></Button></Card></> : <p>Recurso não configurado.</p>}{footer(true, undefined, concluido ? onContinue : () => concluir.mutate(), concluir.isPending)}</div>; }
  if (passo.tipo === "quiz") return <><>{intro}</><QuizRunner data={data} inscrito={inscrito} onDone={onDone} refetch={refetch} onContinue={onContinue} /></>;
  return <><>{intro}</><Reflexao data={data} inscrito={inscrito} onDone={onDone} refetch={refetch} onContinue={onContinue} /></>;
}

function QuizRunner({ data, inscrito, onDone, refetch, onContinue }: { data: PassoDetalhe; inscrito: boolean; onDone: (c?: boolean) => void; refetch: () => void; onContinue: () => void }) {
  const { passo, progresso } = data;
  const fn = useServerFn(submeterQuiz);
  const [resp, setResp] = useState<Record<string, string[]>>({});
  const [res, setRes] = useState<Awaited<ReturnType<ReturnType<typeof useServerFn<typeof submeterQuiz>>>> | null>(null);
  const m = useMutation({ mutationFn: () => fn({ data: { passoId: passo.id, respostas: resp } }), onSuccess: (r) => { setRes(r); if (r.aprovado) onDone(r.cursoConcluido); refetch(); }, onError: (e: Error) => toast.error(e.message) });
  const toggle = (qid: string, oid: string, multipla: boolean) => setResp((r) => { const cur = r[qid] ?? []; return { ...r, [qid]: multipla ? (cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid]) : [oid] }; });
  if (!passo.perguntas.length) return <p className="text-sm text-muted-foreground">Quiz sem perguntas.</p>;
  return <div className="space-y-4">{res && <Card className={`p-5 text-center ${res.aprovado ? "border-primary" : "border-destructive"}`}>{res.aprovado ? <CheckCircle2 className="mx-auto h-10 w-10 text-primary" /> : <XCircle className="mx-auto h-10 w-10 text-destructive" />}<p className="mt-2 text-3xl font-semibold">{res.nota}%</p><p>{res.aprovado ? "Aprovado" : `Ainda não aprovado · mínimo ${res.minimo}%`}</p></Card>}{passo.perguntas.map((q, i) => { const fb = res?.feedback[q.id]; return <Card key={q.id} className="space-y-3 p-4"><p className="font-medium">{i + 1}. {q.enunciado}</p>{q.tipo === "unica" ? <RadioGroup value={(resp[q.id] ?? [])[0] ?? ""} onValueChange={(v) => toggle(q.id, v, false)} disabled={!!res}>{q.opcoes.map((o) => <label key={o.id} className={`flex items-center gap-3 border p-3 text-sm ${fb?.corretas.includes(o.id) ? "border-primary bg-primary/5" : ""}`}><RadioGroupItem value={o.id} />{o.texto}</label>)}</RadioGroup> : <div className="space-y-2">{q.opcoes.map((o) => <label key={o.id} className={`flex items-center gap-3 border p-3 text-sm ${fb?.corretas.includes(o.id) ? "border-primary bg-primary/5" : ""}`}><Checkbox checked={(resp[q.id] ?? []).includes(o.id)} disabled={!!res} onCheckedChange={() => toggle(q.id, o.id, true)} />{o.texto}</label>)}</div>}{fb && <div className="space-y-1 text-xs"><p className={fb.correta ? "text-primary" : "text-destructive"}>{fb.correta ? "Resposta correta" : "Resposta incorreta"}</p>{Object.entries(fb.feedback).map(([id, text]) => <p key={id} className="text-muted-foreground">{q.opcoes.find((o) => o.id === id)?.texto}: {text}</p>)}</div>}</Card>; })}{!res && inscrito && <Button onClick={() => m.mutate()} disabled={m.isPending || passo.perguntas.some((q) => !(resp[q.id]?.length))}>Submeter respostas</Button>}{res && <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => { setResp({}); setRes(null); }}><RotateCcw className="mr-2 h-4 w-4" />Tentar de novo</Button><Button disabled={!res.aprovado} onClick={onContinue}>Continuar <ChevronRight className="ml-2 h-4 w-4" /></Button></div>}{progresso && progresso.tentativas > 0 && <p className="text-xs text-muted-foreground">{progresso.tentativas} tentativa(s) · melhor nota {progresso.nota ?? 0}%</p>}</div>;
}

function Reflexao({ data, inscrito, onDone, refetch, onContinue }: { data: PassoDetalhe; inscrito: boolean; onDone: (c?: boolean) => void; refetch: () => void; onContinue: () => void }) {
  const { passo, progresso } = data;
  const prev = (progresso?.resposta as { texto?: string } | null)?.texto ?? "";
  const [texto, setTexto] = useState(prev);
  const [partilhar, setPartilhar] = useState(progresso?.partilhada ?? false);
  const [estado, setEstado] = useState<"idle" | "saving" | "saved">("idle");
  const submitFn = useServerFn(submeterReflexao);
  const draftFn = useServerFn(guardarRascunhoReflexao);
  useEffect(() => setTexto(prev), [prev]);
  useEffect(() => { if (!inscrito || texto === prev || progresso?.estado === "concluido") return; setEstado("saving"); const id = window.setTimeout(() => draftFn({ data: { passoId: passo.id, texto, partilhar } }).then(() => setEstado("saved")).catch(() => setEstado("idle")), 800); return () => window.clearTimeout(id); }, [texto, partilhar, inscrito, prev, progresso?.estado, draftFn, passo.id]);
  const m = useMutation({ mutationFn: () => submitFn({ data: { passoId: passo.id, texto, partilhar } }), onSuccess: (r) => { onDone(r.cursoConcluido); refetch(); if (!r.cursoConcluido) onContinue(); }, onError: (e: Error) => toast.error(e.message) });
  const podePartilhar = data.curso.curso.modalidade === "turma" && !!(passo.conteudo as { partilhavel?: boolean }).partilhavel;
  const valido = !!texto.replace(/<[^>]*>/g, "").trim();
  return <div className="space-y-3"><RichTextEditor value={texto} onChange={setTexto} />{inscrito && <p className="text-xs text-muted-foreground">{estado === "saving" ? "A guardar…" : estado === "saved" ? "Guardado" : ""}</p>}{podePartilhar && <label className="flex items-center gap-2 text-sm"><Checkbox checked={partilhar} onCheckedChange={(v) => setPartilhar(!!v)} /> Partilhar com a turma</label>}<div className="border-t pt-5"><Button className="w-full sm:float-right sm:w-auto" onClick={progresso?.estado === "concluido" ? onContinue : () => m.mutate()} disabled={!valido || m.isPending}>{progresso?.estado === "concluido" ? "Continuar" : "Submeter e continuar"}<ChevronRight className="ml-2 h-4 w-4" /></Button><div className="clear-both" /></div></div>;
}

function ReaderSkeleton() { return <div className="mx-auto max-w-7xl space-y-5"><Skeleton className="h-16 w-full" /><div className="grid gap-7 lg:grid-cols-[280px_1fr]"><Skeleton className="hidden h-[600px] lg:block" /><div className="space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="aspect-video w-full" /><Skeleton className="h-20 w-full" /></div></div></div>; }
