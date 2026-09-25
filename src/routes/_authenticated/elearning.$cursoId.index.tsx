import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Award, Clock, FileDown, PlayCircle } from "lucide-react";
import { EstadoIcon, TIPO_PASSO } from "@/components/elearning/shared";
import { RouteGate } from "@/components/RouteGate";
import { CoverImage } from "@/components/CoverImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurso, inscreverCurso } from "@/lib/elearning.functions";
import { sanitizeRichHtml } from "@/lib/sanitize-html";

export const Route = createFileRoute("/_authenticated/elearning/$cursoId/")({
  head: () => ({
    meta: [
      { title: "Curso — Escola Ubuntu Online" },
      { name: "description", content: "Detalhes, módulos e inscrição no curso da Escola Ubuntu Online." },
      { property: "og:title", content: "Curso — Escola Ubuntu Online" },
      { property: "og:description", content: "Detalhes, módulos e inscrição no curso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RouteGate path="/elearning">
      <CursoPage />
    </RouteGate>
  ),
});

function fmt(d: string | null) {
  return d ? new Date(d + "T00:00:00").toLocaleDateString("pt-PT") : "—";
}

function CursoPage() {
  const { cursoId } = Route.useParams();
  const fetchFn = useServerFn(getCurso);
  const inscFn = useServerFn(inscreverCurso);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["elearning", "curso", cursoId], queryFn: () => fetchFn({ data: { cursoId } }) });
  const [turma, setTurma] = useState<string>("");
  const insc = useMutation({
    mutationFn: () => inscFn({ data: { cursoId, turmaId: turma || null } }),
    onSuccess: () => {
      toast.success("Inscrição feita. Bom curso!");
      qc.invalidateQueries({ queryKey: ["elearning"] });
      qc.invalidateQueries({ queryKey: ["badges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">A carregar…</p>;
  if (error || !data) return <p className="p-6 text-sm text-destructive">{(error as Error)?.message ?? "Curso não encontrado."}</p>;
  const { curso, modulos } = data;
  const primeiro = modulos.flatMap((m) => m.passos)[0]?.id;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/elearning" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar aos cursos
      </Link>
      <Card className="overflow-hidden">
        {curso.cover_url && (
          <div className="aspect-[21/7] bg-muted">
            <CoverImage src={curso.cover_url} position={curso.cover_position} scale={curso.cover_scale} className="h-full w-full" loading="eager" />
          </div>
        )}
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{curso.modalidade === "turma" ? "Em turma (B-learning)" : "Autónomo (Online)"}</Badge>
            {curso.horas ? <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />{curso.horas} horas</Badge> : null}
            {curso.acreditacao_ref && <Badge variant="outline">Acreditação: {curso.acreditacao_ref}</Badge>}
            {curso.cluster_name && <Badge variant="outline">{curso.cluster_name}</Badge>}
          </div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{curso.title}</h1>
          {curso.description && (
            <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(curso.description) }} />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {curso.badge_final && (
              <div className="flex items-center gap-3 rounded-xl border p-3">
                {curso.badge_final.cover_url ? <img src={curso.badge_final.cover_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <Award className="h-8 w-8 text-accent" />}
                <div className="text-sm"><p className="text-xs text-muted-foreground">Badge ao concluir</p><p className="font-medium">{curso.badge_final.title}</p></div>
              </div>
            )}
            {curso.tem_certificado && (
              <div className="flex items-center gap-3 rounded-xl border p-3">
                <Award className="h-8 w-8 text-primary" />
                <div className="text-sm"><p className="text-xs text-muted-foreground">Certificado</p><p className="font-medium">Emitido automaticamente ao concluir</p></div>
              </div>
            )}
          </div>

          {curso.inscricao ? (
            <div className="space-y-3 rounded-xl bg-muted/50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span>{curso.inscricao.estado === "concluido" ? "Curso concluído" : "O teu progresso"}{data.turma ? ` · ${data.turma.nome}` : ""}</span>
                <span className="font-medium">{curso.inscricao.pct}%</span>
              </div>
              <Progress value={curso.inscricao.pct} />
              <div className="flex flex-wrap gap-2">
                {curso.inscricao.proximo_passo_id && curso.inscricao.estado !== "concluido" && (
                  <Button onClick={() => navigate({ to: "/elearning/$cursoId/passo/$passoId", params: { cursoId, passoId: curso.inscricao!.proximo_passo_id! } })}>
                    <PlayCircle className="mr-1 h-4 w-4" /> {curso.inscricao.pct > 0 ? "Continuar" : "Começar"}
                  </Button>
                )}
                {data.certificado && (
                  <Button variant="outline" asChild>
                    <a href={data.certificado.url} target="_blank" rel="noreferrer"><FileDown className="mr-1 h-4 w-4" /> Certificado</a>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3 rounded-xl bg-muted/50 p-4">
              {curso.modalidade === "turma" &&
                (curso.turmas_abertas.length ? (
                  <div className="min-w-[240px] flex-1">
                    <p className="mb-1 text-xs text-muted-foreground">Escolhe a turma</p>
                    <Select value={turma} onValueChange={setTurma}>
                      <SelectTrigger><SelectValue placeholder="Turma" /></SelectTrigger>
                      <SelectContent>
                        {curso.turmas_abertas.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.nome} · {fmt(t.data_inicio)} a {fmt(t.data_fim)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">De momento não há turmas com inscrições abertas.</p>
                ))}
              <Button
                disabled={insc.isPending || (curso.modalidade === "turma" && !turma)}
                onClick={() => insc.mutate()}
              >
                Inscrever-me
              </Button>
              {!curso.inscricao && primeiro && (
                <span className="text-xs text-muted-foreground">Inscreve-te para aceder aos passos.</span>
              )}
            </div>
          )}
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Módulos</h2>
        {modulos.length === 0 && <p className="text-sm text-muted-foreground">Ainda sem conteúdos.</p>}
        {modulos.map((m, i) => (
          <Card key={m.id} className="p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-medium">{i + 1}. {m.title}</h3>
              {m.abre_em && <span className="text-xs text-muted-foreground">Abre a {fmt(m.abre_em)}</span>}
            </div>
            <ul className="mt-3 space-y-1">
              {m.passos.map((p) => {
                const inner = (
                  <>
                    <EstadoIcon estado={p.estado} />
                    <span className="flex-1">{p.title}</span>
                    <span className="text-xs text-muted-foreground">{TIPO_PASSO[p.tipo]}{p.duracao_min ? ` · ${p.duracao_min} min` : ""}{!p.obrigatorio ? " · opcional" : ""}</span>
                  </>
                );
                return (
                  <li key={p.id}>
                    {p.estado === "bloqueado" ? (
                      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground">{inner}</div>
                    ) : (
                      <Link to="/elearning/$cursoId/passo/$passoId" params={{ cursoId, passoId: p.id }} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </section>
    </div>
  );
}
