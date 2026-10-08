import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { BookOpen, HelpCircle, ChevronDown, Download, GraduationCap, PlayCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CourseGuide } from "@/components/elearning/CourseGuide";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { RouteGate } from "@/components/RouteGate";
import { CoverImage } from "@/components/CoverImage";
import { CourseLayoutProvider } from "@/components/elearning/CourseLayoutContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useApp } from "@/lib/app-context";
import { getCurso, inscreverCurso } from "@/lib/elearning.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/elearning/$cursoId")({
  component: () => <RouteGate path="/elearning"><CourseLayout /></RouteGate>,
});

function CourseLayout() {
  const { cursoId } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { activeRoles } = useApp();
  const fetchCourse = useServerFn(getCurso);
  const enrollCourse = useServerFn(inscreverCurso);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [guideOpen, setGuideOpen] = useState(false);
  const [turmaId, setTurmaId] = useState("");
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [headerH, setHeaderH] = useState(0);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderH(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  });
  const { data, isLoading, error } = useQuery({
    queryKey: ["elearning", "curso", cursoId],
    queryFn: () => fetchCourse({ data: { cursoId } }),
    staleTime: 30_000,
  });
  const enrollment = useMutation({
    mutationFn: () => enrollCourse({ data: { cursoId, turmaId: turmaId || null } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["elearning"] });
      await queryClient.invalidateQueries({ queryKey: ["badges"] });
    },
  });

  if (isLoading) return <CourseLayoutSkeleton />;
  if (error || !data) return <p className="p-6 text-sm text-destructive">{(error as Error)?.message ?? "Curso não encontrado."}</p>;

  const { curso, modulos } = data;
  const firstStep = modulos.flatMap((module) => module.passos).find((step) => step.estado !== "bloqueado")?.id
    ?? modulos.flatMap((module) => module.passos)[0]?.id
    ?? null;
  const formationStepId = curso.inscricao?.proximo_passo_id ?? firstStep;
  const isPreview = !curso.inscricao && activeRoles.some((role) => role === "Admin" || role === "Equipa IPAV");
  const isOverview = pathname === `/elearning/${cursoId}` || pathname === `/elearning/${cursoId}/`;
  const isFormation = pathname.startsWith(`/elearning/${cursoId}/passo/`);
  const completed = curso.inscricao?.estado === "concluido";
  const hasSteps = curso.total_passos > 0;
  const canEnroll = curso.estado === "publicado" && hasSteps;
  const needsClass = !curso.inscricao && curso.modalidade === "turma" && !turmaId;

  const primaryAction = () => {
    if (completed && data.certificado) {
      window.open(data.certificado.url, "_blank", "noopener,noreferrer");
      return;
    }
    if ((curso.inscricao || isPreview) && formationStepId) {
      navigate({ to: "/elearning/$cursoId/passo/$passoId", params: { cursoId, passoId: formationStepId } });
      return;
    }
    if (canEnroll) enrollment.mutate();
  };
  const primaryLabel = completed && data.certificado
    ? "Ver certificado"
    : !hasSteps
      ? "Conteúdos em preparação"
      : !curso.inscricao && !isPreview && curso.estado !== "publicado"
        ? "Curso ainda não publicado"
        : curso.inscricao
          ? (curso.inscricao.pct ? "Continuar" : "Começar")
          : isPreview
            ? "Pré-visualizar"
            : "Inscrever-me";
  const actionDisabled = enrollment.isPending || !hasSteps || (!curso.inscricao && !isPreview && (!canEnroll || needsClass));
  const modality = data.turma?.nome ?? (curso.modalidade === "turma" ? "Em turma · B-learning" : "Autónomo · Online");

  const formationTab = (curso.inscricao || isPreview) && formationStepId
    ? <Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId, passoId: formationStepId }} className={cn("flex items-center border-b-2 text-sm font-medium", isFormation ? "h-full border-primary text-primary" : "h-11 border-transparent text-muted-foreground hover:text-foreground")}>Formação</Link>
    : <Tooltip><TooltipTrigger asChild><span className="flex h-11 cursor-not-allowed items-center border-b-2 border-transparent text-sm font-medium text-muted-foreground opacity-50" aria-disabled="true">Formação</span></TooltipTrigger><TooltipContent>{curso.inscricao || isPreview ? "Este curso ainda não tem momentos" : "Inscreve-te para começar"}</TooltipContent></Tooltip>;
  const overviewTab = <Link to="/elearning/$cursoId" params={{ cursoId }} className={cn("flex items-center border-b-2 text-sm font-medium", isOverview ? "h-11 border-primary text-primary" : "h-full border-transparent text-muted-foreground hover:text-foreground")}>Visão geral</Link>;
  const emBreve = curso.modulos_em_breve > 0;
  const allAvailableDone = !!curso.inscricao && !completed && emBreve && modulos.every((m) => m.passos.every((p) => p.estado === "concluido"));

  return <TooltipProvider delayDuration={250}>
    <CourseLayoutProvider value={{ data, turmaId, setTurmaId, isPreview, isEnrolling: enrollment.isPending, enroll: () => enrollment.mutate(), formationStepId, headerSlot }}>
      <div className="mx-auto w-full min-w-0 max-w-[1440px] pb-20 lg:pb-0" style={{ ["--course-top" as string]: `calc(3.5rem + ${headerH}px)` }}>
        <section ref={headerRef} className="sticky top-14 z-20 -mx-4 border-b bg-background/95 shadow-sm backdrop-blur sm:-mx-6 lg:-mx-8">
          {isFormation ? <div className="flex h-[52px] min-w-0 items-center gap-2 px-2 sm:gap-3 sm:px-4 lg:px-6">
            <div className="hidden h-8 w-10 shrink-0 overflow-hidden rounded bg-muted sm:block">{curso.cover_url ? <CoverImage src={curso.cover_url} position={curso.cover_position} scale={curso.cover_scale} loading="eager" /> : <div className="grid h-full place-items-center bg-primary/10"><GraduationCap className="h-4 w-4 text-primary" /></div>}</div>
            <div className="min-w-0 flex-1">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex max-w-full min-w-0 items-center gap-1 text-left sm:pointer-events-none" aria-label="Secções do curso">
                  <span className="truncate text-sm font-semibold">{curso.title}</span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground sm:hidden" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start"><DropdownMenuItem asChild><Link to="/elearning/$cursoId" params={{ cursoId }}>Visão geral</Link></DropdownMenuItem><DropdownMenuItem disabled>Formação (atual)</DropdownMenuItem><DropdownMenuItem onSelect={() => setGuideOpen(true)}>Como funciona</DropdownMenuItem><DropdownMenuItem asChild><Link to="/elearning/$cursoId/caderno" params={{ cursoId }}>Caderno de Percurso</Link></DropdownMenuItem></DropdownMenuContent>
              </DropdownMenu>
              {curso.inscricao && <div className="hidden max-w-xs items-center gap-2 md:flex"><Progress value={curso.inscricao.pct} className="h-1" /><span className="shrink-0 text-[11px] text-muted-foreground">{curso.inscricao.pct}%</span></div>}
            </div>
            <nav aria-label="Secções do curso" className="hidden h-[52px] shrink-0 items-stretch gap-5 sm:flex">{overviewTab}{formationTab}</nav>
            <Button variant="ghost" size="icon" className="hidden h-9 w-9 sm:inline-flex" aria-label="Como funciona" title="Como funciona" onClick={() => setGuideOpen(true)}><HelpCircle className="h-4 w-4" /></Button>
            {curso.inscricao && <Button variant="ghost" size="icon" className="hidden h-9 w-9 sm:inline-flex" asChild><Link to="/elearning/$cursoId/caderno" params={{ cursoId }} aria-label="Caderno de Percurso" title="Caderno de Percurso"><BookOpen className="h-4 w-4" /></Link></Button>}
            <div ref={setHeaderSlot} className="flex shrink-0 items-center gap-1" />
          </div> : <>
          <div className="grid min-h-24 grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[80px_minmax(0,1fr)_auto] sm:px-6 lg:px-8">
            <div className="h-14 w-16 shrink-0 overflow-hidden rounded-md bg-muted sm:h-16 sm:w-20">
              {curso.cover_url ? <CoverImage src={curso.cover_url} position={curso.cover_position} scale={curso.cover_scale} loading="eager" /> : <div className="grid h-full place-items-center bg-primary/10"><GraduationCap className="h-7 w-7 text-primary" /></div>}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2"><h1 className="truncate text-sm font-semibold sm:text-base">{curso.title}</h1><Badge variant="secondary" className="hidden shrink-0 md:inline-flex">{modality}</Badge></div>
              <p className="mt-1 truncate text-xs text-muted-foreground md:hidden">{modality}</p>
              {curso.inscricao ? <div className="mt-2 max-w-md"><div className="grid grid-cols-[minmax(0,1fr)_36px] items-center gap-2"><Progress value={curso.inscricao.pct} className="h-1.5" /><span className="text-right text-xs font-medium">{curso.inscricao.pct}%</span></div>{allAvailableDone && <p className="mt-1 truncate text-xs text-muted-foreground">Módulos disponíveis concluídos · restantes módulos em breve</p>}</div> : <p className="mt-2 text-xs text-muted-foreground">{curso.total_modulos} módulos · {curso.total_passos} momentos</p>}
            </div>
            <Button size="sm" className="hidden shrink-0 sm:inline-flex" onClick={primaryAction} disabled={actionDisabled}>{completed && data.certificado ? <Download className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}{primaryLabel}</Button>
          </div>
          <nav aria-label="Secções do curso" className="flex h-11 items-end gap-6 px-4 sm:px-6 lg:px-8">{overviewTab}{formationTab}</nav>
          </>}
        </section>
        <div className={cn("min-w-0", isFormation ? "pt-0" : "pt-5 sm:pt-6")}><Outlet /></div>
      </div>
      {isOverview && <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:hidden"><Button className="w-full" onClick={primaryAction} disabled={actionDisabled}>{primaryLabel}</Button></div>}
      <Sheet open={guideOpen} onOpenChange={setGuideOpen}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>Como funciona</SheetTitle><SheetDescription>{curso.title}</SheetDescription></SheetHeader><div className="mt-5"><CourseGuide data={data} compact /></div></SheetContent></Sheet>
    </CourseLayoutProvider>
  </TooltipProvider>;
}

function CourseLayoutSkeleton() {
  return <div className="mx-auto w-full max-w-[1440px]"><div className="-mx-4 border-b bg-background p-4 sm:-mx-6 lg:-mx-8"><div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3"><Skeleton className="h-14 w-16" /><div className="space-y-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-1.5 w-full max-w-sm" /></div></div><Skeleton className="mt-4 h-8 w-48" /></div><div className="space-y-4 pt-6"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-44 w-full" /></div></div>;
}
