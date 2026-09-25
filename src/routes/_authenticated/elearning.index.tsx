import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Award, Clock, GraduationCap, PlayCircle, Users } from "lucide-react";
import { RouteGate } from "@/components/RouteGate";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";
import { CoverImage } from "@/components/CoverImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MODALIDADE_LABEL } from "@/components/elearning/shared";
import { listCatalogo, type CursoCardDTO } from "@/lib/elearning.functions";

export const Route = createFileRoute("/_authenticated/elearning/")({
  head: () => ({
    meta: [
      { title: "E-learning — Escola Ubuntu Online" },
      { name: "description", content: "Cursos online e em turma para professores e educadores da Academia de Líderes Ubuntu." },
      { property: "og:title", content: "E-learning — Escola Ubuntu Online" },
      { property: "og:description", content: "Cursos online e em turma para professores e educadores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RouteGate path="/elearning">
      <CatalogoPage />
    </RouteGate>
  ),
});


function CatalogoPage() {
  const fetchFn = useServerFn(listCatalogo);
  const { data, isLoading } = useQuery({ queryKey: ["elearning", "catalogo"], queryFn: () => fetchFn() });
  const [cluster, setCluster] = useState("all");
  const [modalidade, setModalidade] = useState("all");

  const meus = (data ?? []).filter((c) => c.inscricao);
  const clusters = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of data ?? []) if (c.cluster_id && c.cluster_name) m.set(c.cluster_id, c.cluster_name);
    return [...m.entries()];
  }, [data]);
  const disponiveis = (data ?? []).filter(
    (c) => !c.inscricao && (cluster === "all" || c.cluster_id === cluster) && (modalidade === "all" || c.modalidade === modalidade),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <ComponentAccessMatrix pagePath="/elearning" />
      <section className="rounded-3xl bg-secondary px-6 py-8 text-secondary-foreground sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Escola Ubuntu Online</p>
        <h1 className="mt-2 text-3xl font-semibold">E-learning</h1>
        <p className="mt-2 max-w-xl text-sm text-secondary-foreground/75">
          Cursos ao teu ritmo ou em turma, com badges e certificados reconhecidos.
        </p>
      </section>

      {isLoading && <p className="text-sm text-muted-foreground">A carregar cursos…</p>}

      {meus.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Os meus cursos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {meus.map((c) => (
              <CursoCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cursos disponíveis</h2>
          <span className="h-px flex-1 bg-border" />
          <Select value={cluster} onValueChange={setCluster}>
            <SelectTrigger className="h-9 w-[220px]"><SelectValue placeholder="Cluster" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clusters</SelectItem>
              {clusters.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={modalidade} onValueChange={setModalidade}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as modalidades</SelectItem>
              <SelectItem value="autonomo">Autónomo</SelectItem>
              <SelectItem value="turma">Em turma</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!isLoading && disponiveis.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <GraduationCap className="mx-auto mb-2 h-8 w-8" />
            Não há cursos disponíveis com estes filtros.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {disponiveis.map((c) => <CursoCard key={c.id} c={c} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function CursoCard({ c }: { c: CursoCardDTO }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <Link to="/elearning/$cursoId" params={{ cursoId: c.id }} className="block aspect-[16/9] bg-muted">
        {c.cover_url ? (
          <CoverImage src={c.cover_url} position={c.cover_position} scale={c.cover_scale} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center bg-primary/10"><GraduationCap className="h-10 w-10 text-primary" /></div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{MODALIDADE_LABEL[c.modalidade]}</Badge>
          {c.horas ? <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />{c.horas} h</Badge> : null}
          {c.tem_certificado && <Badge variant="outline"><Award className="mr-1 h-3 w-3" />Certificado</Badge>}
        </div>
        <Link to="/elearning/$cursoId" params={{ cursoId: c.id }} className="font-semibold leading-snug hover:underline">
          {c.title}
        </Link>
        {c.cluster_name && <p className="text-xs text-muted-foreground">{c.cluster_name}</p>}
        {c.inscricao ? (
          <div className="mt-auto space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{c.inscricao.estado === "concluido" ? "Concluído" : "Progresso"}</span>
              <span>{c.inscricao.pct}%</span>
            </div>
            <Progress value={c.inscricao.pct} />
            {c.inscricao.proximo_passo_id && c.inscricao.estado !== "concluido" ? (
              <Button asChild size="sm" className="w-full">
                <Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId: c.id, passoId: c.inscricao.proximo_passo_id }}>
                  <PlayCircle className="mr-1 h-4 w-4" /> Continuar
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to="/elearning/$cursoId" params={{ cursoId: c.id }}>Ver curso</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-auto space-y-2">
            {c.modalidade === "turma" && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {c.turmas_abertas.length ? `${c.turmas_abertas.length} turma(s) com inscrições abertas` : "Sem turmas abertas"}
              </p>
            )}
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link to="/elearning/$cursoId" params={{ cursoId: c.id }}>Saber mais</Link>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
