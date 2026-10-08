import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Award, CalendarDays, Clock, GraduationCap, Layers3, PlayCircle, Search, Sparkles, Users } from "lucide-react";
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
import { CatalogModuleList } from "@/components/elearning/CatalogModuleList";
import { Input } from "@/components/ui/input";
import courseImage from "@/assets/elearning-course.jpg";
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
    <img src={courseImage} alt="" loading="lazy" width={1024} height={576} className={`h-full w-full object-cover ${className}`} />
  );
}

function CatalogoPage() {
  const fetchFn = useServerFn(listCatalogo);
  const { data, isLoading } = useQuery({ queryKey: ["elearning", "catalogo"], queryFn: () => fetchFn() });
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const [cluster, setCluster] = useState("all");
  const [modalidade, setModalidade] = useState("all");
  const clusters = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of data ?? []) if (c.cluster_id && c.cluster_name) m.set(c.cluster_id, c.cluster_name);
    return [...m.entries()];
  }, [data]);
  const disponiveis = (data ?? []).filter((c) => (scope === "all" || !!c.inscricao) && (cluster === "all" || c.cluster_id === cluster) && (modalidade === "all" || c.modalidade === modalidade) && c.title.toLocaleLowerCase("pt-PT").includes(search.toLocaleLowerCase("pt-PT")));

  return (
    <div className="course-catalog mx-auto max-w-7xl space-y-8">
      <ComponentAccessMatrix pagePath="/elearning" />
      <header className="min-w-0 space-y-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">E-learning</p>
        <h1 className="text-3xl font-bold">Programas de Formação Ubuntu</h1>
      </header>

      {isLoading && <CatalogSkeleton />}

      {!isLoading && (
        <section className="space-y-4">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_200px_180px]">
            <div className="relative min-w-0"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Pesquisar cursos" placeholder="Pesquisar cursos…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 bg-card pl-9" /></div>
            <Select value={scope} onValueChange={setScope}><SelectTrigger aria-label="Inscrição" className="h-10 w-full min-w-0 bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os cursos</SelectItem><SelectItem value="mine">Os meus cursos</SelectItem></SelectContent></Select>
            <Select value={cluster} onValueChange={setCluster}><SelectTrigger aria-label="Cluster" className="h-10 w-full min-w-0 bg-card"><SelectValue placeholder="Cluster" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os clusters</SelectItem>{clusters.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select>
            <Select value={modalidade} onValueChange={setModalidade}><SelectTrigger aria-label="Modalidade" className="h-10 w-full min-w-0 bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as modalidades</SelectItem><SelectItem value="autonomo">Autónomo</SelectItem><SelectItem value="turma">Em turma</SelectItem></SelectContent></Select>
          </div>
          <p className="text-xs text-muted-foreground">{disponiveis.length} {disponiveis.length === 1 ? "curso" : "cursos"}</p>
          {disponiveis.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground"><GraduationCap className="mx-auto mb-2 h-8 w-8" />Não há cursos disponíveis com estes filtros.</div> : <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">{disponiveis.map((c) => <CursoCard key={c.id} c={c} />)}</div>}
          <p className="flex items-center justify-center gap-2 pt-2 text-center text-sm text-muted-foreground"><Sparkles className="h-4 w-4" />Mais formações estão a caminho — novos cursos serão publicados aqui em breve.</p>
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
    <Card className="flex min-w-0 flex-col overflow-hidden rounded-lg transition-shadow hover:shadow-md">
      <div className="relative aspect-video overflow-hidden"><Link to="/elearning/$cursoId" params={{ cursoId: c.id }} className="block h-full bg-muted"><CourseVisual c={c} /></Link><Badge variant="secondary" className="absolute left-4 top-4 bg-card text-secondary">{c.inscricao?.estado === "concluido" ? "Concluído" : c.inscricao?.iniciado ? "Em curso" : c.inscricao ? "Por começar" : "Disponível"}</Badge></div>
      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap gap-1.5"><Badge variant="secondary">{MODALIDADE_LABEL[c.modalidade]}</Badge>{c.tem_certificado && <Badge variant="outline"><Award className="mr-1 h-3 w-3" />Certificado</Badge>}</div>
        <h2 className="text-xl leading-snug"><Link to="/elearning/$cursoId" params={{ cursoId: c.id }} className="hover:underline">{c.title}</Link></h2>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatarDuracao(c.total_minutos)}</span>
          <span className="flex items-center gap-1"><Layers3 className="h-3.5 w-3.5" />{c.total_modulos} módulos</span>
          {proxima && <span className="col-span-2 flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Próxima turma: {fmt(proxima.data_inicio) ?? "data a definir"}</span>}
          {c.modalidade === "turma" && !proxima && <span className="col-span-2 flex items-center gap-1"><Users className="h-3.5 w-3.5" />Sem turmas abertas</span>}
        </div>
        {c.inscricao && <div className="space-y-2"><div className="flex justify-between text-xs text-muted-foreground"><span>Progresso</span><span className="font-semibold text-secondary">{c.inscricao.pct}%</span></div><Progress value={c.inscricao.pct} /></div>}
        <div className="border-t pt-2"><CatalogModuleList cursoId={c.id} /></div>
        {c.inscricao?.proximo_passo_id && c.inscricao.estado !== "concluido" ? <Button asChild className="mt-2 h-11 w-full"><Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId: c.id, passoId: c.inscricao.proximo_passo_id }}><PlayCircle className="h-4 w-4" />{c.inscricao.iniciado ? "Continuar formação" : "Começar formação"}</Link></Button> : <Button asChild variant={c.inscricao ? "secondary" : "outline"} className="mt-2 h-11 w-full"><Link to="/elearning/$cursoId" params={{ cursoId: c.id }}>{c.inscricao?.estado === "concluido" ? "Rever curso" : "Abrir curso"}</Link></Button>}
      </div>
    </Card>
  );
}
