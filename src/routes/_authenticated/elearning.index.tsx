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
  const [cluster, setCluster] = useState("all");
  const [modalidade, setModalidade] = useState("all");
  const meus = (data ?? []).filter((c) => c.inscricao);
  const continuar = [...meus].filter((c) => c.inscricao?.estado !== "concluido" && c.inscricao?.proximo_passo_id)
    .sort((a, b) => (b.inscricao?.ultima_atividade ?? "").localeCompare(a.inscricao?.ultima_atividade ?? ""))[0];
  const clusters = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of data ?? []) if (c.cluster_id && c.cluster_name) m.set(c.cluster_id, c.cluster_name);
    return [...m.entries()];
  }, [data]);
  const disponiveis = (data ?? []).filter((c) => !c.inscricao && (cluster === "all" || c.cluster_id === cluster) && (modalidade === "all" || c.modalidade === modalidade));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <ComponentAccessMatrix pagePath="/elearning" />
      <section className="bg-secondary px-6 py-8 text-secondary-foreground sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Escola Ubuntu Online</p>
        <h1 className="mt-2 text-3xl font-semibold text-secondary-foreground">E-learning</h1>
        <p className="mt-2 max-w-xl text-sm text-secondary-foreground/75">Cursos ao teu ritmo ou em turma, com badges e certificados reconhecidos.</p>
      </section>

      {isLoading && <CatalogSkeleton />}

      {continuar?.inscricao?.proximo_passo_id && (
        <section className="overflow-hidden border bg-card shadow-sm">
          <div className="grid md:grid-cols-[280px_minmax(0,1fr)]">
            <div className="aspect-[16/9] md:aspect-auto md:min-h-56"><CourseVisual c={continuar} /></div>
            <div className="flex flex-col justify-center p-5 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Continuar onde paraste</p>
              <h2 className="mt-2 text-xl font-semibold">{continuar.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{continuar.inscricao.proximo_modulo_titulo}{continuar.inscricao.proximo_passo_titulo ? ` · ${continuar.inscricao.proximo_passo_titulo}` : ""}</p>
              <div className="mt-4 flex items-center gap-3"><Progress value={continuar.inscricao.pct} className="max-w-sm" /><span className="text-sm font-medium">{continuar.inscricao.pct}%</span></div>
              <Button asChild className="mt-5 w-full sm:w-fit">
                <Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId: continuar.id, passoId: continuar.inscricao.proximo_passo_id }}>
                  Continuar <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {!isLoading && meus.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Os meus cursos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{meus.map((c) => <CursoCard key={c.id} c={c} />)}</div>
        </section>
      )}

      {!isLoading && (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_180px] sm:items-center">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cursos disponíveis</h2>
            <Select value={cluster} onValueChange={setCluster}><SelectTrigger><SelectValue placeholder="Cluster" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os clusters</SelectItem>{clusters.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select>
            <Select value={modalidade} onValueChange={setModalidade}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as modalidades</SelectItem><SelectItem value="autonomo">Autónomo</SelectItem><SelectItem value="turma">Em turma</SelectItem></SelectContent></Select>
          </div>
          {disponiveis.length === 0 ? <Card className="p-8 text-center text-sm text-muted-foreground"><GraduationCap className="mx-auto mb-2 h-8 w-8" />Não há cursos disponíveis com estes filtros.</Card> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{disponiveis.map((c) => <CursoCard key={c.id} c={c} />)}</div>}
        </section>
      )}
    </div>
  );
}

function CatalogSkeleton() {
  return <div className="space-y-6"><Skeleton className="h-56 w-full" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((n) => <div key={n} className="space-y-3 border bg-card p-4"><Skeleton className="aspect-video w-full" /><Skeleton className="h-5 w-4/5" /><Skeleton className="h-4 w-2/3" /></div>)}</div></div>;
}

function CursoCard({ c }: { c: CursoCardDTO }) {
  const proxima = c.turmas_abertas[0];
  return (
    <Card className="flex flex-col overflow-hidden">
      <Link to="/elearning/$cursoId" params={{ cursoId: c.id }} className="block aspect-[16/9] bg-muted"><CourseVisual c={c} /></Link>
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
