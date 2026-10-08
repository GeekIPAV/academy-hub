import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowRight, Award, CalendarDays, Clock, GraduationCap, Layers3, PlayCircle, Users } from "lucide-react";
import { RouteGate } from "@/components/RouteGate";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";
import { CoverImage } from "@/components/CoverImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarDuracao, MODALIDADE_LABEL } from "@/components/elearning/shared";
import { FormationPath } from "@/components/elearning/FormationPath";
import { getCurso } from "@/lib/elearning.functions";
import { listCatalogo, type CursoCardDTO } from "@/lib/elearning.functions";

export const Route = createFileRoute("/_authenticated/elearning/")({
  head: () => ({ meta: [
    { title: "E-learning — Escola Ubuntu Online" },
    { name: "description", content: "Cursos online e em turma para professores e educadores da Academia de Líderes Ubuntu." },
    { property: "og:title", content: "E-learning — Escola Ubuntu Online" },
    { property: "og:description", content: "Cursos online e em turma para professores e educadores." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <RouteGate path="/elearning"><CatalogoPage /></RouteGate>,
});

function fmt(d: string | null) {
  return d ? new Date(`${d}T00:00:00`).toLocaleDateString("pt-PT", { day: "numeric", month: "short" }) : null;
}

function CourseVisual({ c, className = "" }: { c: CursoCardDTO; className?: string }) {
  return c.cover_url ? (
    <CoverImage src={c.cover_url} position={c.cover_position} scale={c.cover_scale} className={className} />
  ) : (
    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary via-primary to-accent ${className}`}>
      <GraduationCap className="h-12 w-12 text-primary-foreground" />
    </div>
  );
}

function CatalogoPage() {
  const fetchFn = useServerFn(listCatalogo);
  const { data, isLoading } = useQuery({ queryKey: ["elearning", "catalogo"], queryFn: () => fetchFn() });
  const [selectedCourse, setSelectedCourse] = useState("");
  const courseFn = useServerFn(getCurso);
  const [cluster, setCluster] = useState("all");
  const [modalidade, setModalidade] = useState("all");
  const meus = (data ?? []).filter((c) => c.inscricao);
  const activeCourses = [...meus].filter((c) => c.inscricao?.estado !== "concluido")
    .sort((a, b) => (b.inscricao?.ultima_atividade ?? b.inscricao?.inscrito_em ?? "").localeCompare(a.inscricao?.ultima_atividade ?? a.inscricao?.inscrito_em ?? ""));
  const activeCourse = activeCourses.find((c) => c.id === selectedCourse) ?? activeCourses[0];
  const { data: pathData, isLoading: pathLoading, error: pathError } = useQuery({ queryKey: ["elearning", "curso", activeCourse?.id], queryFn: () => courseFn({ data: { cursoId: activeCourse?.id ?? "" } }), enabled: !!activeCourse });
  const clusters = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of data ?? []) if (c.cluster_id && c.cluster_name) m.set(c.cluster_id, c.cluster_name);
    return [...m.entries()];
  }, [data]);
  const disponiveis = (data ?? []).filter((c) => c.id !== activeCourse?.id && (!c.inscricao || !!activeCourse) && (cluster === "all" || c.cluster_id === cluster) && (modalidade === "all" || c.modalidade === modalidade));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <ComponentAccessMatrix pagePath="/elearning" />
      {!activeCourse && <section className="bg-secondary px-6 py-8 text-secondary-foreground sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Escola Ubuntu Online</p>
        <h1 className="mt-2 text-3xl font-semibold text-secondary-foreground">E-learning</h1>
        <p className="mt-2 max-w-xl text-sm text-secondary-foreground/75">Cursos ao teu ritmo ou em turma, com badges e certificados reconhecidos.</p>
      </section>}

      {isLoading && <CatalogSkeleton />}

      {activeCourse && <section className="space-y-6">
        <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-end"><div className="min-w-0"><p className="text-xs font-semibold uppercase text-primary">O teu percurso de formação</p><h1 className="mt-2 text-2xl sm:text-3xl">{activeCourse.title}</h1><p className="mt-3 text-sm text-muted-foreground">Um momento de cada vez, ao teu ritmo, no caminho Ubuntu.</p></div>{activeCourses.length > 1 && <Select value={activeCourse.id} onValueChange={setSelectedCourse}><SelectTrigger className="w-full min-w-0 [&>span]:truncate" aria-label="Escolher percurso"><SelectValue /></SelectTrigger><SelectContent>{activeCourses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select>}</div>
        {pathLoading ? <Skeleton className="h-96 w-full" /> : pathData ? <FormationPath data={pathData} /> : <p className="text-sm text-destructive">{(pathError as Error)?.message ?? "Não foi possível carregar o percurso."}</p>}
      </section>}

      {!activeCourse && !isLoading && meus.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Os meus cursos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{meus.map((c) => <CursoCard key={c.id} c={c} />)}</div>
        </section>
      )}

      {!isLoading && (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_180px] sm:items-center">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{activeCourse ? "Outros cursos" : "Cursos disponíveis"}</h2>
            <Select value={cluster} onValueChange={setCluster}><SelectTrigger><SelectValue placeholder="Cluster" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os clusters</SelectItem>{clusters.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select>
            <Select value={modalidade} onValueChange={setModalidade}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as modalidades</SelectItem><SelectItem value="autonomo">Autónomo</SelectItem><SelectItem value="turma">Em turma</SelectItem></SelectContent></Select>
          </div>
          {disponiveis.length === 0 ? <Card className="p-8 text-center text-sm text-muted-foreground"><GraduationCap className="mx-auto mb-2 h-8 w-8" />Não há cursos disponíveis com estes filtros.</Card> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{disponiveis.map((c) => <CursoCard key={c.id} c={c} compact={!!activeCourse} />)}</div>}
        </section>
      )}
    </div>
  );
}

function CatalogSkeleton() {
  return <div className="space-y-6"><Skeleton className="h-56 w-full" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((n) => <div key={n} className="space-y-3 border bg-card p-4"><Skeleton className="aspect-video w-full" /><Skeleton className="h-5 w-4/5" /><Skeleton className="h-4 w-2/3" /></div>)}</div></div>;
}

function CursoCard({ c, compact = false }: { c: CursoCardDTO; compact?: boolean }) {
  const proxima = c.turmas_abertas[0];
  return (
    <Card className="flex flex-col overflow-hidden">
      <Link to="/elearning/$cursoId" params={{ cursoId: c.id }} className={compact ? "block h-24 bg-muted" : "block aspect-[16/9] bg-muted"}><CourseVisual c={c} /></Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-1.5"><Badge variant="secondary">{MODALIDADE_LABEL[c.modalidade]}</Badge>{c.tem_certificado && <Badge variant="outline"><Award className="mr-1 h-3 w-3" />Certificado</Badge>}</div>
        <Link to="/elearning/$cursoId" params={{ cursoId: c.id }} className="font-semibold leading-snug hover:underline">{c.title}</Link>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatarDuracao(c.total_minutos)}</span>
          <span className="flex items-center gap-1"><Layers3 className="h-3.5 w-3.5" />{c.total_modulos} módulos</span>
          {proxima && <span className="col-span-2 flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Próxima turma: {fmt(proxima.data_inicio) ?? "data a definir"}</span>}
          {c.modalidade === "turma" && !proxima && <span className="col-span-2 flex items-center gap-1"><Users className="h-3.5 w-3.5" />Sem turmas abertas</span>}
        </div>
        {c.badge_final && <div className="flex items-center gap-2 border-t pt-3 text-xs"><div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">{c.badge_final.cover_url ? <img src={c.badge_final.cover_url} alt="" className="h-full w-full object-cover" /> : <Award className="m-2 h-4 w-4 text-primary" />}</div><span><span className="block text-muted-foreground">Badge ao concluir</span>{c.badge_final.title}</span></div>}
        {c.inscricao ? <div className="mt-auto space-y-2"><div className="flex justify-between text-xs text-muted-foreground"><span>{c.inscricao.estado === "concluido" ? "Concluído" : "Progresso"}</span><span>{c.inscricao.pct}%</span></div><Progress value={c.inscricao.pct} /><Button asChild size="sm" variant={c.inscricao.estado === "concluido" ? "outline" : "default"} className="w-full"><Link to="/elearning/$cursoId" params={{ cursoId: c.id }}>{c.inscricao.estado === "concluido" ? "Ver curso" : <><PlayCircle className="mr-1 h-4 w-4" />Continuar</>}</Link></Button></div> : <Button asChild size="sm" variant="outline" className="mt-auto w-full"><Link to="/elearning/$cursoId" params={{ cursoId: c.id }}>Saber mais</Link></Button>}
      </div>
    </Card>
  );
}
