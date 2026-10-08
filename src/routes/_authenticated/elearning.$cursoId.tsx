import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { HelpCircle, Download, GraduationCap, PlayCircle, Printer } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ComoFuncionaList } from "@/components/elearning/CourseGuide";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { RouteGate } from "@/components/RouteGate";
import { CoverImage } from "@/components/CoverImage";
import { CourseLayoutProvider, SHORTCUTS_EVENT } from "@/components/elearning/CourseLayoutContext";
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
  const isNotebook = pathname.startsWith(`/elearning/${cursoId}/caderno`);
  const completed = curso.inscricao?.estado === "concluido";
  const hasSteps = curso.total_passos > 0;
  const canEnroll = curso.estado === "publicado" && hasSteps;
  const needsClass = !curso.inscricao && curso.modalidade === "turma" && !turmaId;
  const pct = curso.inscricao?.pct ?? 0;

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
          ? (completed ? "Rever formação" : pct ? "Continuar" : "Começar")
          : isPreview
            ? "Pré-visualizar"
            : "Inscrever-me";
  const actionDisabled = enrollment.isPending || !hasSteps || (!curso.inscricao && !isPreview && (!canEnroll || needsClass));

  const tabBase = "flex shrink-0 items-center border-b-2 px-1 text-sm font-medium whitespace-nowrap transition-colors";
  const tabCls = (active: boolean) => cn(tabBase, active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground");
  const disabledTab = (label: string, reason: string) => <Tooltip><TooltipTrigger asChild><span className={cn(tabBase, "cursor-not-allowed border-transparent text-muted-foreground opacity-50")} aria-disabled="true">{label}</span></TooltipTrigger><TooltipContent>{reason}</TooltipContent></Tooltip>;
  const tabs = <>
    <Link to="/elearning/$cursoId" params={{ cursoId }} className={tabCls(isOverview)}>Visão geral</Link>
    {(curso.inscricao || isPreview) && formationStepId
      ? <Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId, passoId: formationStepId }} className={tabCls(isFormation)}>Formação</Link>
      : disabledTab("Formação", curso.inscricao || isPreview ? "Este curso ainda não tem momentos" : "Inscreve-te para começar")}
    {curso.inscricao
      ? <Link to="/elearning/$cursoId/caderno" params={{ cursoId }} className={tabCls(isNotebook)}>Caderno</Link>
      : disabledTab("Caderno", "Disponível depois da inscrição")}
  </>;

  return <TooltipProvider delayDuration={250}>
    <CourseLayoutProvider value={{ data, turmaId, setTurmaId, isPreview, isEnrolling: enrollment.isPending, enroll: () => enrollment.mutate(), formationStepId, headerSlot, primary: { label: primaryLabel, disabled: actionDisabled, run: primaryAction } }}>
      <div className="mx-auto w-full min-w-0 max-w-[1440px] pb-4 lg:pb-0" style={{ ["--course-top" as string]: `calc(3.5rem + ${headerH}px)` }}>
        <section ref={headerRef} className="sticky top-14 z-20 -mx-4 border-b bg-background/95 shadow-sm backdrop-blur sm:-mx-6 lg:-mx-8">
          <div className="flex h-[52px] min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
            <div className="h-8 w-10 shrink-0 overflow-hidden rounded bg-muted">{curso.cover_url ? <CoverImage src={curso.cover_url} position={curso.cover_position} scale={curso.cover_scale} loading="eager" /> : <div className="grid h-full place-items-center bg-secondary/10"><GraduationCap className="h-4 w-4 text-secondary" /></div>}</div>
            <div className="min-w-0 flex-1 md:max-w-xs lg:max-w-sm">
              <Tooltip><TooltipTrigger asChild><p className="truncate text-sm font-semibold text-secondary">{curso.title}</p></TooltipTrigger><TooltipContent className="max-w-sm">{curso.title}</TooltipContent></Tooltip>
              <div className="flex items-center gap-2"><Progress value={pct} className="h-1" /><span className="shrink-0 text-[11px] text-muted-foreground">{pct}%</span></div>
            </div>
            <nav aria-label="Secções do curso" className="hidden h-[52px] shrink-0 items-stretch gap-5 md:flex md:flex-1 md:justify-center">{tabs}</nav>
            <div className="flex shrink-0 items-center gap-1">
              {isOverview && <><Button size="sm" className="hidden sm:inline-flex" onClick={primaryAction} disabled={actionDisabled}>{completed && data.certificado ? <Download className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}{primaryLabel}</Button><Button size="icon" className="h-9 w-9 sm:hidden" onClick={primaryAction} disabled={actionDisabled} aria-label={primaryLabel}>{completed && data.certificado ? <Download className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}</Button></>}
              {isNotebook && <Button variant="outline" size="sm" className="h-9 px-2 sm:px-3" onClick={() => window.print()} aria-label="Descarregar PDF"><Printer className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Descarregar PDF</span></Button>}
              {isFormation && <div ref={setHeaderSlot} className="flex shrink-0 items-center gap-1" />}
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Ajuda"><HelpCircle className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setGuideOpen(true)}>Como funciona esta formação</DropdownMenuItem>
                  {isFormation && <DropdownMenuItem onSelect={() => window.dispatchEvent(new Event(SHORTCUTS_EVENT))}>Atalhos de teclado</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <nav aria-label="Secções do curso" className="flex h-10 items-stretch gap-5 overflow-x-auto border-t px-3 md:hidden">{tabs}</nav>
        </section>
        <div className={cn("min-w-0", isFormation ? "pt-0" : "pt-5 sm:pt-6")}><Outlet /></div>
      </div>
      <Sheet open={guideOpen} onOpenChange={setGuideOpen}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md"><SheetHeader><SheetTitle>Como funciona esta formação</SheetTitle><SheetDescription>{curso.title}</SheetDescription></SheetHeader><div className="mt-5"><ComoFuncionaList data={data} /></div></SheetContent></Sheet>
    </CourseLayoutProvider>
  </TooltipProvider>;
}

function CourseLayoutSkeleton() {
  return <div className="mx-auto w-full max-w-[1440px]"><div className="-mx-4 flex h-[52px] items-center gap-3 border-b bg-background px-4 sm:-mx-6 lg:-mx-8"><Skeleton className="h-8 w-10" /><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-1 w-48" /></div></div><div className="space-y-4 pt-6"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-44 w-full" /></div></div>;
}
