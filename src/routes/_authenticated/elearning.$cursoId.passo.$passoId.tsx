import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock3,
  Download, ExternalLink, FileQuestion, HelpCircle, ListFilter, ListTree, Lock,
  Maximize2, Menu, PanelLeftClose, PanelLeftOpen, RotateCcw, X, XCircle,
} from "lucide-react";
import { RouteGate } from "@/components/RouteGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RichTextEditor } from "@/components/rich-text-editor";
import { VimeoPlayer } from "@/components/elearning/VimeoPlayer";
import { PassoTipoIcon, TIPO_PASSO } from "@/components/elearning/shared";
import {
  concluirPasso, getPasso, guardarNotaPasso, guardarRascunhoReflexao, registarVideo,
  submeterQuiz, submeterReflexao, type CursoDetalhe, type PassoDetalhe, type PassoResumo,
} from "@/lib/elearning.functions";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { cn } from "@/lib/utils";

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

type ActionState = { ready: boolean; help: string; pending?: boolean; label?: string; onAction: () => void };
type ModuleTransition = { atual: number; proximo: number; modulo: CursoDetalhe["modulos"][number]; notaMedia: number | null };

function getBlockReason(passo: PassoResumo, inscrito: boolean) {
  if (passo.estado !== "bloqueado") return null;
  return passo.bloqueio_motivo ?? (!inscrito ? "Inscreve-te para aceder" : "Este passo ainda não está disponível");
}

function StatusCircle({ estado }: { estado: PassoResumo["estado"] }) {
  if (estado === "concluido") return <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>;
  if (estado === "bloqueado") return <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border bg-muted"><Lock className="h-3 w-3 text-muted-foreground" /></span>;
  if (estado === "em_curso") return <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /></span>;
  return <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />;
}

function CourseIndex({ curso, cursoId, atual, onSelect }: { curso: CursoDetalhe; cursoId: string; atual: string; onSelect?: () => void }) {
  const currentModule = curso.modulos.find((m) => m.passos.some((p) => p.id === atual));
  const [onlyPending, setOnlyPending] = useState(false);
  const [open, setOpen] = useState<string[]>(currentModule ? [currentModule.id] : []);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const total = curso.modulos.flatMap((m) => m.passos).length;
  const done = curso.modulos.flatMap((m) => m.passos).filter((p) => p.estado === "concluido").length;

  useEffect(() => {
    if (currentModule) setOpen((value) => value.includes(currentModule.id) ? value : [...value, currentModule.id]);
    window.setTimeout(() => activeRef.current?.scrollIntoView({ block: "nearest" }), 80);
  }, [currentModule, atual]);

  return <div className="flex h-full min-h-0 flex-col bg-background">
    <div className="shrink-0 border-b p-5">
      <p className="line-clamp-2 text-base font-semibold">{curso.curso.title}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{done} de {total} passos</span><span>{curso.curso.inscricao?.pct ?? 0}%</span></div>
      <Progress value={curso.curso.inscricao?.pct ?? 0} className="mt-2 h-1.5" />
      <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <Checkbox checked={onlyPending} onCheckedChange={(v) => setOnlyPending(!!v)} />
        <ListFilter className="h-4 w-4 text-muted-foreground" /> Mostrar só o que falta
      </label>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <Accordion type="multiple" value={open} onValueChange={setOpen}>
        {curso.modulos.map((modulo, moduleIndex) => {
          const feitos = modulo.passos.filter((p) => p.estado === "concluido").length;
          const minutos = modulo.passos.filter((p) => p.estado !== "concluido").reduce((n, p) => n + (p.duracao_min ?? 0), 0);
          const complete = modulo.passos.length > 0 && feitos === modulo.passos.length;
          const passos = onlyPending ? modulo.passos.filter((p) => p.estado !== "concluido" || p.id === atual) : modulo.passos;
          if (onlyPending && !passos.length) return null;
          return <AccordionItem value={modulo.id} key={modulo.id} className="border-b">
            <AccordionTrigger className="px-4 py-4 hover:no-underline">
              <div className="flex min-w-0 flex-1 items-start gap-3 pr-2 text-left">
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold", complete && "border-primary bg-primary text-primary-foreground")}>{complete ? <Check className="h-4 w-4" /> : moduleIndex + 1}</span>
                <span className="min-w-0 flex-1"><span className="line-clamp-2 font-semibold">{modulo.title}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{feitos}/{modulo.passos.length} passos{minutos ? ` · ${minutos} min por concluir` : ""}</span></span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <ul>{passos.map((passo) => {
                const reason = getBlockReason(passo, !!curso.curso.inscricao);
                const inner = <div className="grid min-h-14 grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-2 px-4 py-2.5">
                  <StatusCircle estado={passo.estado} />
                  <PassoTipoIcon tipo={passo.tipo} className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span className="min-w-0"><span className="line-clamp-2 text-sm leading-5">{passo.title}</span>{passo.duracao_min ? <span className="mt-0.5 block text-xs text-muted-foreground">{passo.duracao_min} min</span> : null}</span>
                </div>;
                return <li key={passo.id} className="relative">
                  {reason ? <Tooltip><TooltipTrigger asChild><div className="cursor-not-allowed text-muted-foreground" aria-disabled="true">{inner}</div></TooltipTrigger><TooltipContent side="right">{reason}</TooltipContent></Tooltip> :
                    <Link ref={passo.id === atual ? activeRef : undefined} to="/elearning/$cursoId/passo/$passoId" params={{ cursoId, passoId: passo.id }} preload="intent" onClick={onSelect} aria-current={passo.id === atual ? "step" : undefined} className={cn("block border-l-4 border-transparent transition-colors hover:bg-muted/70", passo.id === atual && "border-l-primary bg-primary/5 font-medium")}>{inner}</Link>}
                </li>;
              })}</ul>
            </AccordionContent>
          </AccordionItem>;
        })}
      </Accordion>
    </div>
  </div>;
}

function LeitorPage() {
  const { cursoId, passoId } = Route.useParams();
  const fetchFn = useServerFn(getPasso);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const [celebrar, setCelebrar] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [transition, setTransition] = useState<ModuleTransition | null>(null);
  const key = ["elearning", "passo", cursoId, passoId];
  const { data, isLoading, isFetching, error } = useQuery({ queryKey: key, queryFn: () => fetchFn({ data: { cursoId, passoId } }), placeholderData: (previous) => previous });

  useEffect(() => { try { const saved = window.localStorage.getItem("elearning-reader-sidebar"); if (saved !== null) setSidebarOpen(saved === "open"); } catch { /* armazenamento indisponível */ } }, []);
  const toggleSidebar = useCallback(() => setSidebarOpen((current) => { const next = !current; try { window.localStorage.setItem("elearning-reader-sidebar", next ? "open" : "closed"); } catch { /* armazenamento indisponível */ } return next; }), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    window.requestAnimationFrame(() => titleRef.current?.focus());
    setTransition(null);
  }, [passoId]);

  useEffect(() => {
    if (!data?.seguinte) return;
    qc.prefetchQuery({ queryKey: ["elearning", "passo", cursoId, data.seguinte], queryFn: () => fetchFn({ data: { cursoId, passoId: data.seguinte as string, prefetch: true } }), staleTime: 30_000 });
  }, [cursoId, data?.seguinte, fetchFn, qc]);

  const navigateTo = useCallback((id: string | null) => {
    if (!id) return;
    navigate({ to: "/elearning/$cursoId/passo/$passoId", params: { cursoId, passoId: id } });
  }, [cursoId, navigate]);

  const showTransitionOrNext = useCallback(() => {
    if (!data) return;
    const moduleIndex = data.curso.modulos.findIndex((m) => m.id === data.modulo.id);
    const stepIndex = data.curso.modulos[moduleIndex]?.passos.findIndex((p) => p.id === data.passo.id) ?? -1;
    const lastInModule = stepIndex === (data.curso.modulos[moduleIndex]?.passos.length ?? 0) - 1;
    const nextModule = data.curso.modulos[moduleIndex + 1];
    if (lastInModule && nextModule) {
      const scores = data.curso.modulos[moduleIndex].passos.map((p) => p.id === data.passo.id ? data.progresso?.nota : null).filter((n): n is number => n != null);
      setTransition({ atual: moduleIndex + 1, proximo: moduleIndex + 2, modulo: nextModule, notaMedia: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null });
      return;
    }
    if (data.seguinte) navigateTo(data.seguinte);
    else navigate({ to: "/elearning/$cursoId", params: { cursoId } });
  }, [cursoId, data, navigate, navigateTo]);

  const onDone = useCallback((cursoConcluido?: boolean) => {
    qc.invalidateQueries({ queryKey: ["elearning"] });
    if (cursoConcluido) { setCelebrar(true); qc.invalidateQueries({ queryKey: ["badges"] }); }
  }, [qc]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true], [role=radio], [role=checkbox]")) return;
      if (event.key === "m" || event.key === "M") { event.preventDefault(); window.innerWidth < 1024 ? setDrawer((v) => !v) : toggleSidebar(); }
      if (event.key === "?") { event.preventDefault(); setShortcuts(true); }
      if (event.key === "ArrowLeft" && data?.anterior) { event.preventDefault(); navigateTo(data.anterior); }
      if (event.key === "ArrowRight" && data?.seguinte && data.progresso?.estado === "concluido") { event.preventDefault(); showTransitionOrNext(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [data, navigateTo, showTransitionOrNext, toggleSidebar]);

  if (!data && isLoading) return <ReaderSkeleton />;
  if (error || !data) return <ReaderError message={(error as Error)?.message ?? "Passo não encontrado."} cursoId={cursoId} />;

  const flat = data.curso.modulos.flatMap((m) => m.passos);
  const position = flat.findIndex((p) => p.id === passoId) + 1;
  const moduleStep = data.curso.modulos.find((m) => m.id === data.modulo.id)?.passos.findIndex((p) => p.id === passoId) ?? 0;
  const pct = data.curso.curso.inscricao?.pct ?? 0;
  const inscrito = !!data.curso.curso.inscricao;

  return <TooltipProvider delayDuration={250}><div className="h-svh w-full overflow-hidden bg-background">
    <header className="fixed inset-x-0 top-0 z-40 grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center border-b bg-background px-2 sm:px-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,440px)_auto]">
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => window.innerWidth < 1024 ? setDrawer(true) : toggleSidebar()} aria-label={sidebarOpen ? "Fechar módulos" : "Abrir módulos"}><Menu className="h-5 w-5" /></Button>
        <Button variant="ghost" size="sm" asChild className="shrink-0 px-2"><Link to="/elearning/$cursoId" params={{ cursoId }}><ArrowLeft className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">Sair</span></Link></Button>
        <span className="hidden h-5 w-px bg-border sm:block" />
        <p className="min-w-0 truncate text-sm font-semibold">{data.curso.curso.title}</p>
      </div>
      <div className="hidden min-w-0 items-center gap-3 lg:flex"><span className="shrink-0 text-xs text-muted-foreground">Passo {position} de {flat.length}</span><Progress value={pct} className="h-1.5 min-w-24 flex-1" /><span className="w-9 text-right text-xs font-medium">{pct}%</span></div>
      <div className="flex items-center justify-end gap-1">
        <span className="hidden text-xs text-muted-foreground md:inline lg:hidden">{pct}%</span>
        <Button variant="ghost" size="icon" className="hidden h-9 w-9 lg:inline-flex" disabled={!data.anterior} onClick={() => navigateTo(data.anterior)} aria-label="Passo anterior"><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="hidden h-9 w-9 lg:inline-flex" disabled={!data.seguinte || data.progresso?.estado !== "concluido"} onClick={showTransitionOrNext} aria-label="Passo seguinte"><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShortcuts(true)} aria-label="Atalhos de teclado"><HelpCircle className="h-4 w-4" /></Button>
      </div>
    </header>

    <div className={cn("grid h-full min-w-0 pt-14 transition-[grid-template-columns] duration-200", sidebarOpen ? "lg:grid-cols-[320px_minmax(0,1fr)]" : "lg:grid-cols-[0_minmax(0,1fr)]")}>
      <aside className={cn("hidden min-h-0 overflow-hidden border-r lg:block", !sidebarOpen && "invisible")}><CourseIndex curso={data.curso} cursoId={cursoId} atual={passoId} /></aside>
      <main ref={scrollRef} className="relative min-w-0 overflow-y-auto overscroll-contain scroll-smooth pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0">
        {isFetching && <div className="absolute inset-x-0 top-0 z-20"><Progress value={35} className="h-0.5 animate-pulse" /></div>}
        {isFetching && data.passo.id !== passoId ? <ContentSkeleton /> : transition ? <ModuleComplete transition={transition} data={data} onContinue={() => { const first = transition.modulo.passos.find((p) => p.estado !== "bloqueado"); if (first) navigateTo(first.id); }} /> :
          <ReaderContent key={data.passo.id} data={data} inscrito={inscrito} titleRef={titleRef} onDone={onDone} refetch={() => qc.invalidateQueries({ queryKey: key })} onContinue={showTransitionOrNext} onPrevious={() => navigateTo(data.anterior)} />}
      </main>
    </div>

    <Sheet open={drawer} onOpenChange={setDrawer}><SheetContent side="left" className="flex h-full w-[min(92vw,360px)] flex-col p-0 sm:max-w-none"><SheetHeader className="sr-only"><SheetTitle>Módulos do curso</SheetTitle><SheetDescription>Escolhe um módulo ou passo.</SheetDescription></SheetHeader><div className="min-h-0 flex-1"><CourseIndex curso={data.curso} cursoId={cursoId} atual={passoId} onSelect={() => setDrawer(false)} /></div><div className="shrink-0 border-t px-5 py-3 text-xs text-muted-foreground">Módulo {data.modulo.indice} · Passo {moduleStep + 1}/{data.curso.modulos.find((m) => m.id === data.modulo.id)?.passos.length ?? 0}</div></SheetContent></Sheet>

    <Dialog open={shortcuts} onOpenChange={setShortcuts}><DialogContent><DialogHeader><DialogTitle>Atalhos de teclado</DialogTitle><DialogDescription>Navega no curso sem tirar as mãos do teclado.</DialogDescription></DialogHeader><dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm"><kbd className="rounded border bg-muted px-2 py-1 text-center">←</kbd><dd>Passo anterior</dd><kbd className="rounded border bg-muted px-2 py-1 text-center">→</kbd><dd>Passo seguinte, quando concluído</dd><kbd className="rounded border bg-muted px-2 py-1 text-center">M</kbd><dd>Abrir ou fechar os módulos</dd><kbd className="rounded border bg-muted px-2 py-1 text-center">?</kbd><dd>Mostrar estes atalhos</dd></dl></DialogContent></Dialog>
    <Dialog open={celebrar} onOpenChange={setCelebrar}><DialogContent className="text-center"><DialogHeader><DialogTitle className="text-center text-2xl">Parabéns!</DialogTitle></DialogHeader><CheckCircle2 className="mx-auto h-16 w-16 text-primary" /><p>Concluíste o curso. O teu badge e certificado estão a ser preparados.</p><Button onClick={() => navigate({ to: "/elearning/$cursoId", params: { cursoId } })}>Ver a conclusão do curso</Button></DialogContent></Dialog>
  </div></TooltipProvider>;
}

function ReaderContent({ data, inscrito, titleRef, onDone, refetch, onContinue, onPrevious }: { data: PassoDetalhe; inscrito: boolean; titleRef: React.RefObject<HTMLHeadingElement | null>; onDone: (c?: boolean) => void; refetch: () => void; onContinue: () => void; onPrevious: () => void }) {
  const wide = data.passo.tipo === "video" || data.passo.tipo === "recurso";
  return <div className={cn("mx-auto w-full px-4 py-6 sm:px-6 sm:py-8", wide ? "max-w-[1048px]" : "max-w-[768px]")}>
    <div className="mb-7">
      <p className="text-sm text-muted-foreground">Módulo {data.modulo.indice} · {data.modulo.title}</p>
      <p className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><PassoTipoIcon tipo={data.passo.tipo} />{TIPO_PASSO[data.passo.tipo]}{data.passo.duracao_min ? ` · ${data.passo.duracao_min} min` : ""}</p>
      <h1 ref={titleRef} tabIndex={-1} className="mt-2 text-2xl font-semibold outline-none sm:text-3xl">{data.passo.title}</h1>
      {!inscrito && <p className="mt-4 border border-dashed p-3 text-xs text-muted-foreground">Pré-visualização da equipa — o progresso não é registado.</p>}
    </div>
    <PassoConteudo data={data} inscrito={inscrito} onDone={onDone} refetch={refetch} onContinue={onContinue} onPrevious={onPrevious} />
    <PassoTabs data={data} inscrito={inscrito} />
  </div>;
}

function ActionBar({ state, concluido, anterior, onPrevious }: { state: ActionState; concluido: boolean; anterior: boolean; onPrevious: () => void }) {
  return <>
    <div className="sticky bottom-0 z-10 mt-10 hidden grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-t bg-background/95 py-4 backdrop-blur lg:grid">
      <Button variant="ghost" disabled={!anterior} onClick={onPrevious}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button>
      <p className="min-w-0 text-center text-xs text-muted-foreground">{concluido ? <span className="font-medium text-primary">✓ Concluído</span> : state.help}</p>
      <Button disabled={!state.ready || state.pending} onClick={state.onAction}>{state.label ?? "Concluir e continuar"}<ChevronRight className="ml-1 h-4 w-4" /></Button>
    </div>
    <div className="fixed inset-x-0 bottom-0 z-40 grid min-h-16 grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-2 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <Button variant="ghost" size="icon" className="h-11 w-11" disabled={!anterior} onClick={onPrevious} aria-label="Anterior"><ChevronLeft className="h-5 w-5" /></Button>
      <p className="min-w-0 truncate text-center text-xs text-muted-foreground">{concluido ? <span className="font-medium text-primary">✓ Concluído</span> : state.help}</p>
      <Button className="min-h-11 px-3" disabled={!state.ready || state.pending} onClick={state.onAction}><span className="max-w-36 truncate">{state.label ?? "Concluir e continuar"}</span><ChevronRight className="ml-1 h-4 w-4" /></Button>
    </div>
  </>;
}

function PassoConteudo({ data, inscrito, onDone, refetch, onContinue, onPrevious }: { data: PassoDetalhe; inscrito: boolean; onDone: (c?: boolean) => void; refetch: () => void; onContinue: () => void; onPrevious: () => void }) {
  const { passo, progresso } = data;
  const c = passo.conteudo as Record<string, string | boolean | undefined>;
  const concluido = progresso?.estado === "concluido";
  const concluirFn = useServerFn(concluirPasso);
  const videoFn = useServerFn(registarVideo);
  const [videoPct, setVideoPct] = useState(progresso?.video_pct ?? 0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const concluir = useMutation({ mutationFn: () => concluirFn({ data: { passoId: passo.id } }), onSuccess: (r) => { onDone(r.cursoConcluido); refetch(); if (!r.cursoConcluido) onContinue(); }, onError: (e: Error) => toast.error(e.message) });
  const intro = typeof c.html === "string" && c.html ? <div className="rich-text text-[17px] leading-[1.7] [&_h2]:mt-8 [&_h2]:text-2xl [&_img]:w-full [&_li]:my-1 [&_p]:my-4" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(c.html) }} /> : null;
  useEffect(() => { if (countdown == null) return; if (countdown <= 0) { onContinue(); return; } const id = window.setTimeout(() => setCountdown((v) => v == null ? null : v - 1), 1000); return () => window.clearTimeout(id); }, [countdown, onContinue]);

  if (passo.tipo === "video") {
    const ready = concluido || videoPct >= data.curso.curso.pct_minima_video;
    return <div className="space-y-4"><VimeoPlayer video={String(c.vimeo ?? "")} startAt={progresso?.video_posicao_s ?? 0} onEnded={() => { if (data.seguinte) setCountdown(5); }} onProgress={(pct, sec) => { if (!inscrito) return; setVideoPct((v) => Math.max(v, pct)); videoFn({ data: { passoId: passo.id, pct, posicao: sec } }).then((r) => { if (r.concluido && !concluido) { onDone(r.cursoConcluido); refetch(); } }).catch(() => undefined); }} />
      {inscrito && <div><Progress value={videoPct} className="h-1" /><p className="mt-2 text-xs text-muted-foreground">{ready ? <span className="font-medium text-primary">✓ Concluído</span> : `${Math.round(videoPct)}% visto · necessário ${data.curso.curso.pct_minima_video}%`}</p></div>}
      {countdown != null && <Card className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4"><div className="min-w-0"><p className="text-xs text-muted-foreground">A continuar automaticamente</p><p className="truncate font-medium">Próximo passo em {countdown} s</p></div><Button variant="outline" size="sm" onClick={() => setCountdown(null)}><X className="mr-1 h-4 w-4" />Cancelar</Button></Card>}
      <ActionBar concluido={ready} anterior={!!data.anterior} onPrevious={onPrevious} state={{ ready, help: `Vê o vídeo até ${data.curso.curso.pct_minima_video}% para continuar`, onAction: onContinue }} />
    </div>;
  }
  if (passo.tipo === "texto") return <div>{intro ?? <EmptyContent text="Este passo ainda não tem conteúdo de leitura." />}<ActionBar concluido={concluido} anterior={!!data.anterior} onPrevious={onPrevious} state={{ ready: inscrito, pending: concluir.isPending, help: "Termina a leitura para continuar", onAction: concluido ? onContinue : () => concluir.mutate() }} /></div>;
  if (passo.tipo === "recurso") return <ResourceStep data={data} intro={intro} concluido={concluido} inscrito={inscrito} pending={concluir.isPending} onAction={concluido ? onContinue : () => concluir.mutate()} onPrevious={onPrevious} />;
  if (passo.tipo === "quiz") return <QuizRunner data={data} inscrito={inscrito} onDone={onDone} refetch={refetch} onContinue={onContinue} onPrevious={onPrevious} intro={intro} />;
  return <Reflexao data={data} inscrito={inscrito} onDone={onDone} refetch={refetch} onContinue={onContinue} onPrevious={onPrevious} intro={intro} />;
}

function ResourceStep({ data, intro, concluido, inscrito, pending, onAction, onPrevious }: { data: PassoDetalhe; intro: React.ReactNode; concluido: boolean; inscrito: boolean; pending: boolean; onAction: () => void; onPrevious: () => void }) {
  const [full, setFull] = useState(false);
  const r = data.passo.recurso;
  const pdf = r?.resource_type?.toLowerCase().includes("pdf") || r?.file_url?.toLowerCase().includes(".pdf");
  return <div className="space-y-4">{intro}{r ? <>{pdf && <div className="overflow-hidden rounded-lg border"><div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2"><p className="min-w-0 truncate text-sm font-medium">{r.title}</p><div className="flex shrink-0"><Button variant="ghost" size="icon" onClick={() => setFull(true)} aria-label="Abrir em ecrã inteiro"><Maximize2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" asChild><a href={r.file_url} target="_blank" rel="noreferrer" aria-label="Abrir numa nova janela"><ExternalLink className="h-4 w-4" /></a></Button><Button variant="ghost" size="icon" asChild><a href={r.file_url} download aria-label="Descarregar"><Download className="h-4 w-4" /></a></Button></div></div><iframe src={r.file_url} title={r.title} className="h-[min(68svh,760px)] w-full" /></div>}
    {!pdf && <Card className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-5">{r.cover_url ? <img src={r.cover_url} alt="" className="h-20 w-20 rounded object-cover" /> : <FileQuestion className="h-10 w-10 text-muted-foreground" />}<div className="min-w-0"><p className="font-semibold">{r.title}</p><p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{r.description}</p></div><Button variant="outline" size="icon" asChild><a href={r.file_url} target="_blank" rel="noreferrer" aria-label="Abrir recurso"><ExternalLink className="h-4 w-4" /></a></Button></Card>}
    <Dialog open={full} onOpenChange={setFull}><DialogContent className="h-[94svh] max-w-[96vw] p-3"><DialogHeader className="pr-8"><DialogTitle className="truncate">{r.title}</DialogTitle></DialogHeader><iframe src={r.file_url} title={`${r.title} em ecrã inteiro`} className="min-h-0 w-full flex-1" /></DialogContent></Dialog></> : <EmptyContent text="Este recurso ainda não está configurado." />}
    <ActionBar concluido={concluido} anterior={!!data.anterior} onPrevious={onPrevious} state={{ ready: inscrito && !!r, pending, help: "Consulta o material para continuar", onAction }} />
  </div>;
}

function QuizRunner({ data, inscrito, onDone, refetch, onContinue, onPrevious, intro }: { data: PassoDetalhe; inscrito: boolean; onDone: (c?: boolean) => void; refetch: () => void; onContinue: () => void; onPrevious: () => void; intro: React.ReactNode }) {
  const fn = useServerFn(submeterQuiz);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [index, setIndex] = useState(0);
  const [review, setReview] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<ReturnType<typeof useServerFn<typeof submeterQuiz>>>> | null>(null);
  const questions = data.passo.perguntas;
  const mutation = useMutation({ mutationFn: () => fn({ data: { passoId: data.passo.id, respostas: answers } }), onSuccess: (r) => { setResult(r); setReview(false); if (r.aprovado) onDone(r.cursoConcluido); refetch(); }, onError: (e: Error) => toast.error(e.message) });
  const toggle = useCallback((qid: string, oid: string, multiple: boolean) => setAnswers((current) => { const selected = current[qid] ?? []; return { ...current, [qid]: multiple ? (selected.includes(oid) ? selected.filter((x) => x !== oid) : [...selected, oid]) : [oid] }; }), []);
  useEffect(() => {
    if (result || review) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input,textarea,[contenteditable=true]")) return;
      const q = questions[index];
      if (!q) return;
      if (/^[1-4]$/.test(event.key)) { const option = q.opcoes[Number(event.key) - 1]; if (option) { event.preventDefault(); toggle(q.id, option.id, q.tipo === "multipla"); } }
      if (event.key === "Enter" && answers[q.id]?.length) { event.preventDefault(); index < questions.length - 1 ? setIndex(index + 1) : setReview(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [answers, index, questions, result, review, toggle]);
  if (!questions.length) return <><EmptyContent text="Este quiz ainda não tem perguntas." /><ActionBar concluido={false} anterior={!!data.anterior} onPrevious={onPrevious} state={{ ready: false, help: "Quiz sem perguntas", onAction: () => undefined }} /></>;
  if (result) return <div className="space-y-5">{intro}<Card className={cn("p-6 text-center", result.aprovado ? "border-primary" : "border-destructive")}><p className="text-sm text-muted-foreground">Resultado</p><p className="mt-2 text-5xl font-semibold">{result.nota}%</p><p className={cn("mt-2 font-semibold", result.aprovado ? "text-primary" : "text-destructive")}>{result.aprovado ? "Aprovado" : `Ainda não aprovado · mínimo ${result.minimo}%`}</p></Card>
    <Accordion type="multiple" className="rounded-lg border px-4">{questions.map((q, i) => { const fb = result.feedback[q.id]; const selected = answers[q.id] ?? []; return <AccordionItem value={q.id} key={q.id}><AccordionTrigger className="hover:no-underline"><span className="flex items-center gap-2 text-left">{fb?.correta ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}Pergunta {i + 1}: {q.enunciado}</span></AccordionTrigger><AccordionContent className="space-y-3"><p className="text-sm"><strong>A tua resposta:</strong> {q.opcoes.filter((o) => selected.includes(o.id)).map((o) => o.texto).join(", ") || "Sem resposta"}</p><p className="text-sm"><strong>Resposta correta:</strong> {q.opcoes.filter((o) => fb?.corretas.includes(o.id)).map((o) => o.texto).join(", ")}</p>{Object.entries(fb?.feedback ?? {}).map(([id, text]) => <p key={id} className="text-sm text-muted-foreground">{q.opcoes.find((o) => o.id === id)?.texto}: {text}</p>)}</AccordionContent></AccordionItem>; })}</Accordion>
    <Button variant="outline" onClick={() => { setAnswers({}); setResult(null); setIndex(0); }}><RotateCcw className="mr-2 h-4 w-4" />Tentar de novo</Button>
    <ActionBar concluido={result.aprovado} anterior={!!data.anterior} onPrevious={onPrevious} state={{ ready: result.aprovado, help: "É necessário obter aprovação para continuar", onAction: onContinue }} /></div>;
  if (review) { const missing = questions.filter((q) => !(answers[q.id]?.length)); return <div className="space-y-5">{intro}<Card className="p-6"><h2 className="text-xl font-semibold">Revê antes de submeter</h2><p className="mt-2 text-sm text-muted-foreground">{missing.length ? `Tens ${missing.length} ${missing.length === 1 ? "pergunta" : "perguntas"} por responder.` : "Respondeste a todas as perguntas."}</p><div className="mt-5 space-y-2">{questions.map((q, i) => <Button key={q.id} variant="ghost" className="w-full justify-start" onClick={() => { setIndex(i); setReview(false); }}>{answers[q.id]?.length ? <Check className="mr-2 h-4 w-4 text-primary" /> : <Circle className="mr-2 h-4 w-4" />}Pergunta {i + 1}</Button>)}</div></Card><div className="flex justify-between"><Button variant="outline" onClick={() => setReview(false)}>Voltar às perguntas</Button><Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>Submeter quiz</Button></div><ActionBar concluido={false} anterior={!!data.anterior} onPrevious={onPrevious} state={{ ready: false, help: "Submete o quiz para continuar", onAction: () => undefined }} /></div>; }
  const q = questions[index];
  return <div className="space-y-5">{intro}<div><div className="flex items-center justify-between text-sm"><span>Pergunta {index + 1} de {questions.length}</span><span className="text-muted-foreground">{q.tipo === "multipla" ? "Escolhe todas as corretas" : "Escolhe uma opção"}</span></div><div className="mt-3 flex gap-1">{questions.map((item, i) => <span key={item.id} className={cn("h-1.5 flex-1 rounded-full", i <= index ? "bg-primary" : "bg-muted")} />)}</div></div>
    <Card className="space-y-5 p-5 sm:p-6"><h2 className="text-lg font-semibold">{q.enunciado}</h2>{q.tipo === "unica" ? <RadioGroup value={(answers[q.id] ?? [])[0] ?? ""} onValueChange={(v) => toggle(q.id, v, false)}>{q.opcoes.map((o, i) => <label key={o.id} className="grid min-h-12 cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"><span className="grid h-6 w-6 place-items-center rounded border bg-muted text-xs">{i + 1}</span><RadioGroupItem value={o.id} />{o.texto}</label>)}</RadioGroup> : <div className="space-y-2">{q.opcoes.map((o, i) => <label key={o.id} className="grid min-h-12 cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"><span className="grid h-6 w-6 place-items-center rounded border bg-muted text-xs">{i + 1}</span><Checkbox checked={(answers[q.id] ?? []).includes(o.id)} onCheckedChange={() => toggle(q.id, o.id, true)} />{o.texto}</label>)}</div>}</Card>
    <div className="flex items-center justify-between"><Button variant="ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Pergunta anterior</Button><Button disabled={!answers[q.id]?.length} onClick={() => index < questions.length - 1 ? setIndex((i) => i + 1) : setReview(true)}>{index < questions.length - 1 ? "Pergunta seguinte" : "Rever respostas"}<ChevronRight className="ml-1 h-4 w-4" /></Button></div>
    <ActionBar concluido={data.progresso?.estado === "concluido"} anterior={!!data.anterior} onPrevious={onPrevious} state={{ ready: false, help: "Conclui o quiz para continuar", onAction: () => undefined }} /></div>;
}

function Reflexao({ data, inscrito, onDone, refetch, onContinue, onPrevious, intro }: { data: PassoDetalhe; inscrito: boolean; onDone: (c?: boolean) => void; refetch: () => void; onContinue: () => void; onPrevious: () => void; intro: React.ReactNode }) {
  const prev = (data.progresso?.resposta as { texto?: string } | null)?.texto ?? "";
  const [texto, setTexto] = useState(prev);
  const [partilhar, setPartilhar] = useState(data.progresso?.partilhada ?? false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const submitFn = useServerFn(submeterReflexao);
  const draftFn = useServerFn(guardarRascunhoReflexao);
  useEffect(() => setTexto(prev), [prev]);
  useEffect(() => { if (!inscrito || texto === prev || data.progresso?.estado === "concluido") return; setSaveState("saving"); const id = window.setTimeout(() => draftFn({ data: { passoId: data.passo.id, texto, partilhar } }).then(() => { setSaveState("saved"); setSavedAt(new Date()); }).catch(() => setSaveState("idle")), 800); return () => window.clearTimeout(id); }, [texto, partilhar, inscrito, prev, data.progresso?.estado, draftFn, data.passo.id]);
  const mutation = useMutation({ mutationFn: () => submitFn({ data: { passoId: data.passo.id, texto, partilhar } }), onSuccess: (r) => { onDone(r.cursoConcluido); refetch(); if (!r.cursoConcluido) onContinue(); }, onError: (e: Error) => toast.error(e.message) });
  const podePartilhar = data.curso.curso.modalidade === "turma" && !!(data.passo.conteudo as { partilhavel?: boolean }).partilhavel;
  const plain = texto.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = plain ? plain.split(" ").length : 0;
  const valid = !!plain;
  const done = data.progresso?.estado === "concluido";
  return <div className="space-y-4">{intro && <Card className="border-l-4 border-l-primary p-5"><p className="mb-2 text-xs font-semibold uppercase text-primary">Para refletir</p>{intro}</Card>}<RichTextEditor value={texto} onChange={setTexto} className="[&_.rich-text]:min-h-64" /><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{words} {words === 1 ? "palavra" : "palavras"}</span><span>{saveState === "saving" ? "A guardar…" : saveState === "saved" && savedAt ? `Guardado às ${savedAt.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}` : ""}</span></div>{podePartilhar && <label className="flex min-h-11 items-center gap-2 text-sm"><Checkbox checked={partilhar} onCheckedChange={(v) => setPartilhar(!!v)} />Partilhar com a turma</label>}<ActionBar concluido={done} anterior={!!data.anterior} onPrevious={onPrevious} state={{ ready: inscrito && valid, pending: mutation.isPending, help: "Escreve e submete a tua reflexão para continuar", label: done ? "Continuar" : "Submeter e continuar", onAction: done ? onContinue : () => mutation.mutate() }} /></div>;
}

function PassoTabs({ data, inscrito }: { data: PassoDetalhe; inscrito: boolean }) {
  return <Tabs defaultValue="sobre" className="mt-10 border-t pt-5"><TabsList className="grid h-auto w-full grid-cols-3"><TabsTrigger value="sobre" className="min-h-10 px-2 text-xs sm:text-sm">Sobre este passo</TabsTrigger><TabsTrigger value="materiais" className="min-h-10 px-2 text-xs sm:text-sm">Materiais</TabsTrigger><TabsTrigger value="notas" className="min-h-10 px-2 text-xs sm:text-sm">As minhas notas</TabsTrigger></TabsList>
    <TabsContent value="sobre" className="py-5"><p className="text-sm leading-6 text-muted-foreground">{data.modulo.description || "Não foi adicionada uma descrição específica a este módulo."}</p></TabsContent>
    <TabsContent value="materiais" className="py-5"><Materials materiais={data.materiais} /></TabsContent>
    <TabsContent value="notas" className="py-5"><PersonalNotes data={data} inscrito={inscrito} /></TabsContent>
  </Tabs>;
}

function Materials({ materiais }: { materiais: PassoDetalhe["materiais"] }) {
  if (!materiais.length) return <EmptyContent text="Não existem materiais adicionais." />;
  return <div className="space-y-2">{materiais.map((r) => <div key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border p-3">{r.cover_url ? <img src={r.cover_url} alt="" className="h-12 w-12 rounded object-cover" /> : <PassoTipoIcon tipo="recurso" className="h-6 w-6 text-muted-foreground" />}<div className="min-w-0"><p className="truncate text-sm font-medium">{r.title}</p><p className="truncate text-xs text-muted-foreground">{r.resource_type}</p></div><Button variant="ghost" size="icon" asChild><a href={r.file_url} target="_blank" rel="noreferrer" aria-label={`Descarregar ${r.title}`}><Download className="h-4 w-4" /></a></Button></div>)}</div>;
}

function PersonalNotes({ data, inscrito }: { data: PassoDetalhe; inscrito: boolean }) {
  const saveFn = useServerFn(guardarNotaPasso);
  const [text, setText] = useState(data.nota?.texto ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<string | null>(data.nota?.updated_at ?? null);
  useEffect(() => { setText(data.nota?.texto ?? ""); setSavedAt(data.nota?.updated_at ?? null); }, [data.passo.id, data.nota?.texto, data.nota?.updated_at]);
  useEffect(() => { if (!inscrito || text === (data.nota?.texto ?? "")) return; setStatus("saving"); const id = window.setTimeout(() => saveFn({ data: { passoId: data.passo.id, texto: text } }).then((r) => { setStatus("saved"); setSavedAt(r.updated_at); }).catch(() => setStatus("error")), 700); return () => window.clearTimeout(id); }, [data.nota?.texto, data.passo.id, inscrito, saveFn, text]);
  return <div><Textarea value={text} onChange={(e) => setText(e.target.value)} disabled={!inscrito} placeholder={inscrito ? "Escreve aqui as tuas notas pessoais…" : "Inscreve-te para criares notas."} className="min-h-40 resize-y" /><p className="mt-2 text-xs text-muted-foreground">{status === "saving" ? "A guardar…" : status === "error" ? "Não foi possível guardar. Tenta novamente." : savedAt ? `Guardado às ${new Date(savedAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}` : "As notas são privadas."}</p></div>;
}

function ModuleComplete({ transition, data, onContinue }: { transition: ModuleTransition; data: PassoDetalhe; onContinue: () => void }) {
  const current = data.curso.modulos[transition.atual - 1];
  const minutes = current.passos.reduce((n, p) => n + (p.duracao_min ?? 0), 0);
  const opens = transition.modulo.abre_em;
  return <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-2xl items-center px-4 py-10"><Card className="w-full p-6 text-center sm:p-10"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-8 w-8" /></span><p className="mt-5 text-sm font-semibold text-primary">Módulo {transition.atual} concluído</p><h1 className="mt-2 text-2xl font-semibold">{current.title}</h1><div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3 sm:grid-cols-3"><Summary label="Passos" value={String(current.passos.length)} /><Summary label="Tempo" value={`${minutes} min`} />{transition.notaMedia != null && <Summary label="Quizzes" value={`${transition.notaMedia}%`} />}</div><div className="mt-8 border-t pt-7"><p className="text-sm text-muted-foreground">A seguir</p><p className="mt-1 text-lg font-semibold">Módulo {transition.proximo} · {transition.modulo.title}</p>{opens ? <p className="mt-3 text-sm text-muted-foreground">Abre a {new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${opens}T12:00:00`))}</p> : <Button className="mt-5" onClick={onContinue}>Começar Módulo {transition.proximo}<ChevronRight className="ml-1 h-4 w-4" /></Button>}</div></Card></div>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-muted p-3"><p className="text-xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>; }
function EmptyContent({ text }: { text: string }) { return <div className="rounded-lg border border-dashed p-8 text-center"><FileQuestion className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">{text}</p></div>; }
function ContentSkeleton() { return <div className="mx-auto w-full max-w-4xl space-y-5 p-6 sm:p-10"><Skeleton className="h-4 w-52" /><Skeleton className="h-9 w-3/4" /><Skeleton className="aspect-video w-full" /><Skeleton className="h-20 w-full" /></div>; }
function ReaderError({ message, cursoId }: { message: string; cursoId: string }) { return <div className="grid min-h-svh place-items-center bg-background px-4"><Card className="max-w-md p-6 text-center"><XCircle className="mx-auto h-10 w-10 text-destructive" /><h1 className="mt-4 text-xl font-semibold">Não foi possível abrir este passo</h1><p className="mt-2 text-sm text-muted-foreground">{message}</p><Button className="mt-5" asChild><Link to="/elearning/$cursoId" params={{ cursoId }}>Voltar ao curso</Link></Button></Card></div>; }
function ReaderSkeleton() { return <div className="h-svh overflow-hidden bg-background"><Skeleton className="h-14 w-full rounded-none" /><div className="grid h-[calc(100svh-3.5rem)] lg:grid-cols-[320px_1fr]"><Skeleton className="hidden h-full rounded-none lg:block" /><div className="mx-auto w-full max-w-4xl space-y-5 p-6 sm:p-10"><Skeleton className="h-4 w-52" /><Skeleton className="h-9 w-3/4" /><Skeleton className="aspect-video w-full" /><Skeleton className="h-20 w-full" /></div></div></div>; }
