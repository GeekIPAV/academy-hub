import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SHORTCUTS_EVENT, useCourseLayout } from "@/components/elearning/CourseLayoutContext";
import { toast } from "sonner";
import {
  Check, CheckCircle2, ChevronLeft, ChevronRight, Circle,
  Download, ExternalLink, FileQuestion, HelpCircle, ListFilter, ListTree, Lock,
  Maximize2, Menu, NotebookPen, RotateCcw, X, XCircle,
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
    { title: "Momento do curso — Escola Ubuntu Online" },
    { name: "description", content: "Leitor de conteúdos do curso da Escola Ubuntu Online." },
    { property: "og:title", content: "Momento do curso — Escola Ubuntu Online" },
    { property: "og:description", content: "Leitor de conteúdos do curso." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <RouteGate path="/elearning"><LeitorPage /></RouteGate>,
});

type ActionState = { ready: boolean; help: string; pending?: boolean; label?: string; onAction: () => void };
type ModuleTransition = { atual: number; proximo: number | null; modulo: CursoDetalhe["modulos"][number] | null; notaMedia: number | null };

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
  const emBreve = curso.modulos.filter((m) => !m.passos.length).length;
  const done = curso.modulos.flatMap((m) => m.passos).filter((p) => p.estado === "concluido").length;

  useEffect(() => {
    if (currentModule) setOpen((value) => value.includes(currentModule.id) ? value : [...value, currentModule.id]);
    window.setTimeout(() => activeRef.current?.scrollIntoView({ block: "nearest" }), 80);
  }, [currentModule, atual]);

  return <div className="flex h-full min-h-0 flex-col bg-background">
    <div className="shrink-0 border-b p-5">
      <p className="text-sm font-semibold text-secondary">Módulos e momentos</p>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{done} de {total} momentos</span><span>{curso.curso.inscricao?.pct ?? 0}%</span></div>
      <Progress value={curso.curso.inscricao?.pct ?? 0} className="mt-2 h-1.5" />
      {emBreve > 0 && <p className="mt-2 text-xs text-muted-foreground">{emBreve === 1 ? "1 módulo em breve" : `${emBreve} módulos em breve`}</p>}
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
          const momentos = onlyPending ? modulo.passos.filter((p) => p.estado !== "concluido" || p.id === atual) : modulo.passos;
          if (!modulo.passos.length) return <div key={modulo.id} className="flex items-start gap-3 border-b px-4 py-4 text-muted-foreground">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-dashed text-xs font-semibold">{moduleIndex + 1}</span>
            <span className="min-w-0 flex-1"><span className="line-clamp-2 font-semibold">{modulo.title}</span><span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">Em breve</span></span>
          </div>;
          if (onlyPending && !momentos.length) return null;
          return <AccordionItem value={modulo.id} key={modulo.id} className="border-b">
            <AccordionTrigger className="px-4 py-4 hover:no-underline">
              <div className="flex min-w-0 flex-1 items-start gap-3 pr-2 text-left">
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold", complete && "border-primary bg-primary text-primary-foreground")}>{complete ? <Check className="h-4 w-4" /> : moduleIndex + 1}</span>
                <span className="min-w-0 flex-1"><span className="line-clamp-2 font-semibold">{modulo.title}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{feitos}/{modulo.passos.length} momentos{minutos ? ` · ${minutos} min por concluir` : ""}</span></span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <ul>{momentos.map((passo) => {
                const reason = getBlockReason(passo, !!curso.curso.inscricao);
                const inner = <div className="grid min-h-14 grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-2 px-4 py-2.5">
                  <StatusCircle estado={passo.estado} />
                  <PassoTipoIcon tipo={passo.tipo} className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span className="min-w-0"><span className="line-clamp-2 text-sm leading-5">Momento {modulo.passos.findIndex((p) => p.id === passo.id) + 1} — {passo.title}</span>{passo.duracao_min ? <span className="mt-0.5 block text-xs text-muted-foreground">{passo.duracao_min} min</span> : null}</span>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const { headerSlot } = useCourseLayout();
  useEffect(() => { const open = () => setShortcuts(true); window.addEventListener(SHORTCUTS_EVENT, open); return () => window.removeEventListener(SHORTCUTS_EVENT, open); }, []);
  const [transition, setTransition] = useState<ModuleTransition | null>(null);
  const key = ["elearning", "passo", cursoId, passoId];
  const { data, isLoading, isFetching, error } = useQuery({ queryKey: key, queryFn: () => fetchFn({ data: { cursoId, passoId } }), placeholderData: (previous) => previous });

  useEffect(() => { try { const saved = window.localStorage.getItem("elearning-reader-sidebar"); setSidebarOpen(window.innerWidth >= 1280 && saved !== "closed"); } catch { setSidebarOpen(window.innerWidth >= 1280); } }, []);
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

  const showTransitionOrNext = useCallback(async () => {
    const data = await fetchFn({ data: { cursoId, passoId, prefetch: true } });
    if (!data) return;
    const moduleIndex = data.curso.modulos.findIndex((m) => m.id === data.modulo.id);
    const stepIndex = data.curso.modulos[moduleIndex]?.passos.findIndex((p) => p.id === data.passo.id) ?? -1;
    const lastInModule = stepIndex === (data.curso.modulos[moduleIndex]?.passos.length ?? 0) - 1;
    const after = data.curso.modulos.slice(moduleIndex + 1);
    const nextModule = after.find((m) => m.passos.some((p) => p.estado !== "bloqueado")) ?? null;
    if (lastInModule && after.length) {
      const scores = data.curso.modulos[moduleIndex].passos.map((p) => p.id === data.passo.id ? (data.progresso?.nota ?? p.nota) : p.nota).filter((n): n is number => n != null);
      setTransition({ atual: moduleIndex + 1, proximo: nextModule ? data.curso.modulos.indexOf(nextModule) + 1 : null, modulo: nextModule, notaMedia: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null });
      return;
    }
    if (data.seguinte) navigateTo(data.seguinte);
    else navigate({ to: "/elearning/$cursoId", params: { cursoId } });
  }, [cursoId, passoId, fetchFn, navigate, navigateTo]);

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
      if (event.key === "ArrowRight" && data?.seguinte) { event.preventDefault(); navigateTo(data.seguinte); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [data, navigateTo, toggleSidebar]);

  if (!data && isLoading) return <ReaderSkeleton />;
  if (error || !data) return <ReaderError message={(error as Error)?.message ?? "Momento não encontrado."} cursoId={cursoId} />;

  const flat = data.curso.modulos.flatMap((m) => m.passos);
  const position = flat.findIndex((p) => p.id === passoId) + 1;
  const moduleStep = data.curso.modulos.find((m) => m.id === data.modulo.id)?.passos.findIndex((p) => p.id === passoId) ?? 0;
  const pct = data.curso.curso.inscricao?.pct ?? 0;
  const inscrito = !!data.curso.curso.inscricao;

  return <TooltipProvider delayDuration={250}><div className="min-w-0 bg-background">
    {headerSlot && createPortal(<>
      <span className="hidden whitespace-nowrap px-1 text-xs text-muted-foreground lg:inline">Momento {position} de {flat.length}</span>
      <span className="whitespace-nowrap px-1 text-xs text-muted-foreground lg:hidden">{position}/{flat.length}</span>
      <div className="hidden items-center xl:flex">
        <Button variant="ghost" size="icon" className="h-9 w-9" disabled={!data.anterior} onClick={() => navigateTo(data.anterior)} aria-label="Momento anterior"><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" disabled={!data.seguinte} onClick={() => navigateTo(data.seguinte)} aria-label="Momento seguinte"><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <Button variant="ghost" size="sm" className="h-10 px-2 sm:px-3" onClick={() => setNotesOpen(true)} aria-label="Notas"><NotebookPen className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Notas</span></Button>
      <Button variant="ghost" size="sm" className="h-10 px-2 sm:px-3" onClick={() => window.innerWidth < 1024 ? setDrawer(true) : toggleSidebar()} aria-label="Abrir ou fechar módulos"><Menu className="h-5 w-5 sm:mr-1.5" /><span className="hidden sm:inline">Módulos</span></Button>
    </>, headerSlot)}

    <div className={cn("relative grid min-w-0 transition-[grid-template-columns] duration-200", sidebarOpen ? "xl:grid-cols-[300px_minmax(0,1fr)]" : "xl:grid-cols-[0_minmax(0,1fr)]")}>
      <aside className={cn("absolute inset-y-0 left-0 z-20 hidden w-[300px] overflow-hidden border-r bg-background shadow-lg lg:block xl:hidden", !sidebarOpen && "invisible")}><CourseIndex curso={data.curso} cursoId={cursoId} atual={passoId} /></aside>
      <aside className={cn("sticky top-[var(--course-top)] hidden h-[calc(100svh-var(--course-top))] min-h-0 overflow-hidden border-r xl:block", !sidebarOpen && "invisible")}><CourseIndex curso={data.curso} cursoId={cursoId} atual={passoId} /></aside>
      <main ref={scrollRef} className={cn("relative min-w-0 scroll-mt-[var(--course-top)] scroll-smooth pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0", sidebarOpen && "xl:pl-6")}>
        {isFetching && <div className="absolute inset-x-0 top-0 z-20"><Progress value={35} className="h-0.5 animate-pulse" /></div>}
        {isFetching && data.passo.id !== passoId ? <ContentSkeleton /> : transition ? <ModuleComplete transition={transition} data={data} onContinue={() => { const first = transition.modulo?.passos.find((p) => p.estado !== "bloqueado"); if (first) navigateTo(first.id); }} onOverview={() => navigate({ to: "/elearning/$cursoId", params: { cursoId } })} /> :
          <ReaderContent key={data.passo.id} data={data} inscrito={inscrito} titleRef={titleRef} onDone={onDone} refetch={() => qc.invalidateQueries({ queryKey: key })} onContinue={showTransitionOrNext} onPrevious={() => navigateTo(data.anterior)} />}
      </main>
    </div>

    <Sheet open={drawer} onOpenChange={setDrawer}><SheetContent side="left" className="flex h-full w-[min(92vw,360px)] flex-col p-0 sm:max-w-none"><SheetHeader className="sr-only"><SheetTitle>Módulos do curso</SheetTitle><SheetDescription>Escolhe um módulo ou passo.</SheetDescription></SheetHeader><div className="min-h-0 flex-1"><CourseIndex curso={data.curso} cursoId={cursoId} atual={passoId} onSelect={() => setDrawer(false)} /></div><div className="shrink-0 border-t px-5 py-3 text-xs text-muted-foreground">Módulo {data.modulo.indice} · Momento {moduleStep + 1}/{data.curso.modulos.find((m) => m.id === data.modulo.id)?.passos.length ?? 0}</div></SheetContent></Sheet>

    <Sheet open={notesOpen} onOpenChange={setNotesOpen}><SheetContent side="right" className="flex w-[min(92vw,420px)] flex-col sm:max-w-none"><SheetHeader><SheetTitle>As minhas notas</SheetTitle><SheetDescription className="line-clamp-2">{data.passo.title}</SheetDescription></SheetHeader><PersonalNotes key={data.passo.id} data={data} inscrito={inscrito} /></SheetContent></Sheet>

    <Dialog open={shortcuts} onOpenChange={setShortcuts}><DialogContent><DialogHeader><DialogTitle>Atalhos de teclado</DialogTitle><DialogDescription>Navega no curso sem tirar as mãos do teclado.</DialogDescription></DialogHeader><dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm"><kbd className="rounded border bg-muted px-2 py-1 text-center">←</kbd><dd>Momento anterior</dd><kbd className="rounded border bg-muted px-2 py-1 text-center">→</kbd><dd>Momento seguinte</dd><kbd className="rounded border bg-muted px-2 py-1 text-center">M</kbd><dd>Abrir ou fechar os módulos</dd><kbd className="rounded border bg-muted px-2 py-1 text-center">?</kbd><dd>Mostrar estes atalhos</dd></dl></DialogContent></Dialog>
    <Dialog open={celebrar} onOpenChange={setCelebrar}><DialogContent className="text-center"><DialogHeader><DialogTitle className="text-center text-2xl">Parabéns!</DialogTitle></DialogHeader><CheckCircle2 className="mx-auto h-16 w-16 text-primary" /><p>Concluíste o curso. O teu badge e certificado estão a ser preparados.</p><Button onClick={() => navigate({ to: "/elearning/$cursoId", params: { cursoId } })}>Ver a conclusão do curso</Button></DialogContent></Dialog>
  </div></TooltipProvider>;
}

function ReaderContent({ data, inscrito, titleRef, onDone, refetch, onContinue, onPrevious }: { data: PassoDetalhe; inscrito: boolean; titleRef: React.RefObject<HTMLHeadingElement | null>; onDone: (c?: boolean) => void; refetch: () => void; onContinue: () => void; onPrevious: () => void }) {
  const wide = data.passo.tipo === "video" || data.passo.tipo === "recurso" || data.passo.tipo === "quiz";
  return <div className={cn("mx-auto w-full min-w-0 pb-8", wide ? "max-w-none" : "max-w-[760px]")}>
    <div className="mb-7">
      <p className="text-sm text-muted-foreground">Módulo {data.modulo.indice} · {data.modulo.title}</p>
      <p className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><PassoTipoIcon tipo={data.passo.tipo} />{TIPO_PASSO[data.passo.tipo]}{data.passo.duracao_min ? ` · ${data.passo.duracao_min} min` : ""}</p>
      {!data.anterior && data.curso.modulos.flatMap((m) => m.passos)[0]?.id === data.passo.id && <p className="mt-4 rounded-md bg-learning-reflection p-3 text-sm">Antes de começar, conhece as atividades e o teu Caderno. <Link to="/elearning/$cursoId" params={{ cursoId: data.curso.curso.id }} hash="como-funciona" className="text-primary underline">Como funciona esta formação</Link></p>}
      <h1 ref={titleRef} tabIndex={-1} className="mt-2 text-2xl font-semibold outline-none sm:text-3xl">{data.passo.title}</h1>
      {!inscrito && <p className="mt-4 border border-dashed p-3 text-xs text-muted-foreground">Pré-visualização da equipa — o progresso não é registado.</p>}
    </div>
    <PassoConteudo data={data} inscrito={inscrito} onDone={onDone} refetch={refetch} onContinue={onContinue} onPrevious={onPrevious} />
    <PassoTabs data={data} inscrito={inscrito} />
  </div>;
}

function BottomBar({ left, center, right }: { left: React.ReactNode; center: React.ReactNode; right: React.ReactNode }) {
  return <>
    <div className="sticky bottom-0 z-10 mt-10 hidden grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-t bg-background/95 py-4 backdrop-blur lg:grid">{left}<div className="min-w-0 text-center text-xs text-muted-foreground">{center}</div>{right}</div>
    <div className="fixed inset-x-0 bottom-0 z-40 grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">{left}<div className="min-w-0 truncate text-center text-xs text-muted-foreground">{center}</div>{right}</div>
  </>;
}

function ActionBar({ state, concluido, anterior, onPrevious }: { state: ActionState; concluido: boolean; anterior: boolean; onPrevious: () => void }) {
  return <BottomBar
    left={<Button variant="ghost" className="min-h-11" disabled={!anterior} onClick={onPrevious} aria-label="Anterior"><ChevronLeft className="h-4 w-4 lg:mr-1" /><span className="hidden lg:inline">Anterior</span></Button>}
    center={concluido ? <span className="font-medium text-primary">✓ Concluído</span> : state.help}
    right={<Button className="min-h-11 px-3" disabled={!state.ready || state.pending} onClick={state.onAction}><span className="max-w-36 truncate lg:max-w-none">{state.label ?? "Concluir e continuar"}</span><ChevronRight className="ml-1 h-4 w-4" /></Button>} />;
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
  if (passo.tipo === "texto") return <div>{intro ?? <EmptyContent text="Este passo ainda não tem conteúdo de leitura." />}<ActionBar concluido={concluido} anterior={!!data.anterior} onPrevious={onPrevious} state={{ ready: inscrito, pending: concluir.isPending, help: passo.duracao_min ? `Tempo estimado ${passo.duracao_min} min` : "", onAction: concluido ? onContinue : () => concluir.mutate() }} /></div>;
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
  if (review) { const missing = questions.filter((q) => !(answers[q.id]?.length)); return <div className="space-y-5">{intro}<Card className="p-6"><h2 className="text-xl font-semibold">Revê antes de submeter</h2><p className="mt-2 text-sm text-muted-foreground">{missing.length ? `Tens ${missing.length} ${missing.length === 1 ? "pergunta" : "perguntas"} por responder.` : "Respondeste a todas as perguntas."}</p><div className="mt-5 space-y-2">{questions.map((q, i) => <Button key={q.id} variant="ghost" className="w-full justify-start" onClick={() => { setIndex(i); setReview(false); }}>{answers[q.id]?.length ? <Check className="mr-2 h-4 w-4 text-primary" /> : <Circle className="mr-2 h-4 w-4" />}Pergunta {i + 1}</Button>)}</div></Card><BottomBar left={<Button variant="ghost" className="min-h-11" onClick={() => setReview(false)}><ChevronLeft className="h-4 w-4 lg:mr-1" /><span className="hidden sm:inline">Voltar às perguntas</span></Button>} center={missing.length ? `${missing.length} por responder` : "Pronto para submeter"} right={<Button className="min-h-11" disabled={mutation.isPending || !inscrito} onClick={() => mutation.mutate()}>Submeter quiz</Button>} /></div>; }
  const q = questions[index];
  return <div className="space-y-5">{intro}<div><div className="flex items-center justify-between text-sm"><span>Pergunta {index + 1} de {questions.length}</span><span className="text-muted-foreground">{q.tipo === "multipla" ? "Escolhe todas as corretas" : "Escolhe uma opção"}</span></div><div className="mt-3 flex gap-1">{questions.map((item, i) => <span key={item.id} className={cn("h-1.5 flex-1 rounded-full", i <= index ? "bg-primary" : "bg-muted")} />)}</div></div>
    <Card className="space-y-5 p-5 sm:p-6"><h2 className="text-lg font-semibold">{q.enunciado}</h2>{q.tipo === "unica" ? <RadioGroup value={(answers[q.id] ?? [])[0] ?? ""} onValueChange={(v) => toggle(q.id, v, false)}>{q.opcoes.map((o, i) => <label key={o.id} className="grid min-h-12 cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"><span className="grid h-6 w-6 place-items-center rounded border bg-muted text-xs">{i + 1}</span><RadioGroupItem value={o.id} />{o.texto}</label>)}</RadioGroup> : <div className="space-y-2">{q.opcoes.map((o, i) => <label key={o.id} className="grid min-h-12 cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"><span className="grid h-6 w-6 place-items-center rounded border bg-muted text-xs">{i + 1}</span><Checkbox checked={(answers[q.id] ?? []).includes(o.id)} onCheckedChange={() => toggle(q.id, o.id, true)} />{o.texto}</label>)}</div>}</Card>
    <BottomBar left={<Button variant="ghost" className="min-h-11" disabled={index === 0} onClick={() => setIndex((i) => i - 1)} aria-label="Pergunta anterior"><ChevronLeft className="h-4 w-4 lg:mr-1" /><span className="hidden lg:inline">Pergunta anterior</span></Button>} center={`Pergunta ${index + 1} de ${questions.length}`} right={<Button className="min-h-11" disabled={!answers[q.id]?.length} onClick={() => index < questions.length - 1 ? setIndex((i) => i + 1) : setReview(true)}>{index < questions.length - 1 ? "Seguinte" : "Rever respostas"}<ChevronRight className="ml-1 h-4 w-4" /></Button>} /></div>;
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

function PassoTabs({ data }: { data: PassoDetalhe; inscrito: boolean }) {
  const sobre = data.modulo.description ? <div className="rich-text text-sm leading-6 text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(data.modulo.description) }} /> : <p className="text-sm leading-6 text-muted-foreground">Não foi adicionada uma descrição específica a este módulo.</p>;
  if (!data.materiais.length) return <section className="mt-10 border-t pt-5"><h2 className="text-sm font-semibold">Sobre o módulo</h2><div className="mt-3">{sobre}</div></section>;
  return <Tabs defaultValue="sobre" className="mt-10 border-t pt-5"><TabsList className="grid h-auto w-full grid-cols-2"><TabsTrigger value="sobre" className="min-h-10 px-2 text-xs sm:text-sm">Sobre o módulo</TabsTrigger><TabsTrigger value="materiais" className="min-h-10 px-2 text-xs sm:text-sm">Materiais</TabsTrigger></TabsList>
    <TabsContent value="sobre" className="py-5">{sobre}</TabsContent>
    <TabsContent value="materiais" className="py-5"><Materials materiais={data.materiais} /></TabsContent>
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

function ModuleComplete({ transition, data, onContinue, onOverview }: { transition: ModuleTransition; data: PassoDetalhe; onContinue: () => void; onOverview: () => void }) {
  const current = data.curso.modulos[transition.atual - 1];
  const minutes = current.passos.reduce((n, p) => n + (p.duracao_min ?? 0), 0);
  const opens = transition.modulo?.abre_em;
  return <div className="mx-auto flex max-w-2xl items-center px-4 py-10"><Card className="w-full p-6 text-center sm:p-10"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-8 w-8" /></span><p className="mt-5 text-sm font-semibold text-primary">Módulo {transition.atual} concluído</p><h1 className="mt-2 text-2xl font-semibold">{current.title}</h1><div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3 sm:grid-cols-3"><Summary label="Passos" value={String(current.passos.length)} /><Summary label="Tempo" value={`${minutes} min`} />{transition.notaMedia != null && <Summary label="Quizzes" value={`${transition.notaMedia}%`} />}</div><div className="mt-8 border-t pt-7">{transition.modulo ? <><p className="text-sm text-muted-foreground">A seguir</p><p className="mt-1 text-lg font-semibold">Módulo {transition.proximo} · {transition.modulo.title}</p>{opens ? <><p className="mt-3 text-sm text-muted-foreground">Abre a {new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${opens}T12:00:00`))}</p><Button variant="outline" className="mt-5" onClick={onOverview}>Voltar à visão geral</Button></> : <Button className="mt-5" onClick={onContinue}>Começar Módulo {transition.proximo}<ChevronRight className="ml-1 h-4 w-4" /></Button>}</> : <><p className="text-base font-medium">Os próximos módulos estarão disponíveis em breve.</p><p className="mt-1 text-sm text-muted-foreground">Vamos avisar-te por email e na plataforma.</p><Button className="mt-5" onClick={onOverview}>Voltar à visão geral</Button></>}</div></Card></div>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-muted p-3"><p className="text-xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>; }
function EmptyContent({ text }: { text: string }) { return <div className="rounded-lg border border-dashed p-8 text-center"><FileQuestion className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">{text}</p></div>; }
function ContentSkeleton() { return <div className="mx-auto w-full max-w-4xl space-y-5 p-6 sm:p-10"><Skeleton className="h-4 w-52" /><Skeleton className="h-9 w-3/4" /><Skeleton className="aspect-video w-full" /><Skeleton className="h-20 w-full" /></div>; }
function ReaderError({ message, cursoId }: { message: string; cursoId: string }) { return <div className="grid min-h-96 place-items-center bg-background px-4"><Card className="max-w-md p-6 text-center"><XCircle className="mx-auto h-10 w-10 text-destructive" /><h1 className="mt-4 text-xl font-semibold">Não foi possível abrir este passo</h1><p className="mt-2 text-sm text-muted-foreground">{message}</p><Button className="mt-5" asChild><Link to="/elearning/$cursoId" params={{ cursoId }}>Voltar ao curso</Link></Button></Card></div>; }
function ReaderSkeleton() { return <div className="min-w-0 bg-background"><Skeleton className="h-12 w-full rounded-none" /><div className="grid xl:grid-cols-[300px_1fr]"><Skeleton className="hidden h-[60svh] rounded-none xl:block" /><div className="mx-auto w-full max-w-4xl space-y-5 p-6 sm:p-10"><Skeleton className="h-4 w-52" /><Skeleton className="h-9 w-3/4" /><Skeleton className="aspect-video w-full" /><Skeleton className="h-20 w-full" /></div></div></div>; }
