import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, ListTree } from "lucide-react";
import { RouteGate } from "@/components/RouteGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { RichTextEditor } from "@/components/rich-text-editor";
import { VimeoPlayer } from "@/components/elearning/VimeoPlayer";
import {
  concluirPasso,
  getPasso,
  registarVideo,
  submeterQuiz,
  submeterReflexao,
  type CursoDetalhe,
  type PassoDetalhe,
} from "@/lib/elearning.functions";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { EstadoIcon, TIPO_PASSO } from "./elearning.$cursoId.index";

export const Route = createFileRoute("/_authenticated/elearning/$cursoId/passo/$passoId")({
  head: () => ({
    meta: [
      { title: "Passo do curso — Escola Ubuntu Online" },
      { name: "description", content: "Leitor de conteúdos do curso da Escola Ubuntu Online." },
      { property: "og:title", content: "Passo do curso — Escola Ubuntu Online" },
      { property: "og:description", content: "Leitor de conteúdos do curso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RouteGate path="/elearning">
      <LeitorPage />
    </RouteGate>
  ),
});

function Indice({ curso, cursoId, atual }: { curso: CursoDetalhe; cursoId: string; atual: string }) {
  return (
    <nav className="space-y-4 text-sm">
      {curso.modulos.map((m, i) => (
        <div key={m.id}>
          <p className="mb-1 font-medium">{i + 1}. {m.title}</p>
          <ul className="space-y-0.5">
            {m.passos.map((p) => (
              <li key={p.id}>
                {p.estado === "bloqueado" && curso.curso.inscricao ? (
                  <span className="flex items-center gap-2 px-2 py-1 text-muted-foreground"><EstadoIcon estado={p.estado} />{p.title}</span>
                ) : (
                  <Link
                    to="/elearning/$cursoId/passo/$passoId"
                    params={{ cursoId, passoId: p.id }}
                    className={`flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted ${p.id === atual ? "bg-muted font-medium" : ""}`}
                  >
                    <EstadoIcon estado={p.estado} />
                    <span className="line-clamp-2">{p.title}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function LeitorPage() {
  const { cursoId, passoId } = Route.useParams();
  const fetchFn = useServerFn(getPasso);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const key = ["elearning", "passo", cursoId, passoId];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => fetchFn({ data: { cursoId, passoId } }) });

  const onDone = (cursoConcluido?: boolean) => {
    qc.invalidateQueries({ queryKey: ["elearning"] });
    if (cursoConcluido) {
      toast.success("Parabéns! Concluíste o curso.");
      qc.invalidateQueries({ queryKey: ["badges"] });
    }
  };

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">A carregar…</p>;
  if (error || !data) return <p className="p-6 text-sm text-destructive">{(error as Error)?.message ?? "Passo não encontrado."}</p>;
  const { passo, curso } = data;
  const concluido = data.progresso?.estado === "concluido";
  const inscrito = !!curso.curso.inscricao;

  return (
    <div className="mx-auto flex max-w-7xl gap-6">
      <aside className="sticky top-20 hidden max-h-[calc(100svh-6rem)] w-72 shrink-0 overflow-y-auto rounded-xl border p-4 lg:block">
        <Link to="/elearning/$cursoId" params={{ cursoId }} className="mb-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> {curso.curso.title}
        </Link>
        <Indice curso={curso} cursoId={cursoId} atual={passoId} />
      </aside>

      <main className="min-w-0 flex-1 space-y-5">
        <div className="flex items-center gap-2 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm"><ListTree className="mr-1 h-4 w-4" /> Índice</Button>
            </SheetTrigger>
            <SheetContent side="left" className="overflow-y-auto">
              <SheetHeader><SheetTitle>{curso.curso.title}</SheetTitle></SheetHeader>
              <div className="mt-4"><Indice curso={curso} cursoId={cursoId} atual={passoId} /></div>
            </SheetContent>
          </Sheet>
          <Link to="/elearning/$cursoId" params={{ cursoId }} className="truncate text-sm text-muted-foreground">{curso.curso.title}</Link>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {TIPO_PASSO[passo.tipo]}{passo.duracao_min ? ` · ${passo.duracao_min} min` : ""}{concluido ? " · Concluído" : ""}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{passo.title}</h1>
        </div>

        {!inscrito && (
          <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Pré-visualização da equipa — o progresso não é registado.</p>
        )}

        <PassoConteudo key={passo.id} data={data} inscrito={inscrito} onDone={onDone} refetch={() => qc.invalidateQueries({ queryKey: key })} />

        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" disabled={!data.anterior} onClick={() => data.anterior && navigate({ to: "/elearning/$cursoId/passo/$passoId", params: { cursoId, passoId: data.anterior } })}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
          </Button>
          {data.seguinte ? (
            <Button variant="outline" onClick={() => navigate({ to: "/elearning/$cursoId/passo/$passoId", params: { cursoId, passoId: data.seguinte! } })}>
              Seguinte <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate({ to: "/elearning/$cursoId", params: { cursoId } })}>Voltar ao curso</Button>
          )}
        </div>
      </main>
    </div>
  );
}

function PassoConteudo({ data, inscrito, onDone, refetch }: { data: PassoDetalhe; inscrito: boolean; onDone: (c?: boolean) => void; refetch: () => void }) {
  const { passo, progresso } = data;
  const c = passo.conteudo as Record<string, string | boolean | undefined>;
  const concluido = progresso?.estado === "concluido";
  const concluirFn = useServerFn(concluirPasso);
  const videoFn = useServerFn(registarVideo);
  const [videoPct, setVideoPct] = useState(progresso?.video_pct ?? 0);

  const concluir = useMutation({
    mutationFn: () => concluirFn({ data: { passoId: passo.id } }),
    onSuccess: (r) => { toast.success("Passo concluído."); onDone(r.cursoConcluido); refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const intro = typeof c.html === "string" && c.html ? (
    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(c.html) }} />
  ) : null;

  const btnConcluir = inscrito && !concluido && (
    <Button onClick={() => concluir.mutate()} disabled={concluir.isPending}>Marcar como concluído</Button>
  );

  switch (passo.tipo) {
    case "video":
      return (
        <div className="space-y-4">
          <VimeoPlayer
            video={String(c.vimeo ?? "")}
            startAt={progresso?.video_posicao_s ?? 0}
            onProgress={(pct, sec) => {
              if (!inscrito) return;
              setVideoPct((v) => Math.max(v, pct));
              videoFn({ data: { passoId: passo.id, pct, posicao: sec } })
                .then((r) => { if (r.concluido && !concluido) { onDone(r.cursoConcluido); refetch(); } })
                .catch(() => {});
            }}
          />
          {inscrito && <p className="text-xs text-muted-foreground">Visto: {Math.round(videoPct)}% · mínimo para concluir: {data.curso.curso.pct_minima_video}%</p>}
          {intro}
        </div>
      );
    case "texto":
      return <div className="space-y-4">{intro ?? <p className="text-sm text-muted-foreground">Sem conteúdo.</p>}{btnConcluir}</div>;
    case "recurso":
      return (
        <div className="space-y-4">
          {intro}
          {passo.recurso ? (
            <Card className="flex items-center gap-4 p-4">
              {passo.recurso.cover_url && <img src={passo.recurso.cover_url} alt="" className="h-16 w-16 rounded-md object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{passo.recurso.title}</p>
                {passo.recurso.description && <p className="line-clamp-2 text-sm text-muted-foreground">{passo.recurso.description}</p>}
              </div>
              <Button variant="outline" asChild>
                <a href={passo.recurso.file_url} target="_blank" rel="noreferrer">Abrir <ExternalLink className="ml-1 h-4 w-4" /></a>
              </Button>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">Recurso não configurado.</p>
          )}
          {btnConcluir}
        </div>
      );
    case "quiz":
      return <><>{intro}</><QuizRunner data={data} inscrito={inscrito} onDone={onDone} refetch={refetch} /></>;
    case "reflexao":
      return <><>{intro}</><Reflexao data={data} inscrito={inscrito} onDone={onDone} refetch={refetch} /></>;
  }
}

function QuizRunner({ data, inscrito, onDone, refetch }: { data: PassoDetalhe; inscrito: boolean; onDone: (c?: boolean) => void; refetch: () => void }) {
  const { passo, progresso } = data;
  const fn = useServerFn(submeterQuiz);
  const [resp, setResp] = useState<Record<string, string[]>>({});
  const [res, setRes] = useState<Awaited<ReturnType<typeof submeterQuiz>> | null>(null);
  const m = useMutation({
    mutationFn: () => fn({ data: { passoId: passo.id, respostas: resp } }),
    onSuccess: (r) => {
      setRes(r);
      if (r.aprovado) { toast.success(`Aprovado com ${r.nota}%`); onDone(r.cursoConcluido); refetch(); }
      else toast.error(`Obtiveste ${r.nota}% — mínimo ${r.minimo}%. Tenta novamente.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = (qid: string, oid: string, multipla: boolean) =>
    setResp((r) => {
      const cur = r[qid] ?? [];
      return { ...r, [qid]: multipla ? (cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid]) : [oid] };
    });
  if (!passo.perguntas.length) return <p className="text-sm text-muted-foreground">Quiz sem perguntas.</p>;
  return (
    <div className="space-y-4">
      {progresso && progresso.tentativas > 0 && (
        <p className="text-xs text-muted-foreground">Tentativas: {progresso.tentativas} · melhor nota: {progresso.nota ?? 0}%</p>
      )}
      {passo.perguntas.map((q, i) => {
        const fb = res?.feedback[q.id];
        return (
          <Card key={q.id} className={`space-y-2 p-4 ${fb ? (fb.correta ? "border-primary" : "border-destructive") : ""}`}>
            <p className="font-medium">{i + 1}. {q.enunciado}</p>
            {q.tipo === "multipla" && <p className="text-xs text-muted-foreground">Seleciona todas as corretas.</p>}
            {q.opcoes.map((o) => {
              const sel = (resp[q.id] ?? []).includes(o.id);
              return (
                <div key={o.id}>
                  <button type="button" onClick={() => toggle(q.id, o.id, q.tipo === "multipla")}
                    className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${sel ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                    <span className={`h-4 w-4 shrink-0 border ${q.tipo === "multipla" ? "rounded" : "rounded-full"} ${sel ? "border-primary bg-primary" : ""}`} />
                    {o.texto}
                  </button>
                  {fb && sel && fb.feedback[o.id] && <p className="ml-6 mt-1 text-xs text-muted-foreground">{fb.feedback[o.id]}</p>}
                </div>
              );
            })}
          </Card>
        );
      })}
      {inscrito && (
        <Button onClick={() => m.mutate()} disabled={m.isPending}>{progresso?.tentativas ? "Submeter nova tentativa" : "Submeter respostas"}</Button>
      )}
    </div>
  );
}

function Reflexao({ data, inscrito, onDone, refetch }: { data: PassoDetalhe; inscrito: boolean; onDone: (c?: boolean) => void; refetch: () => void }) {
  const { passo, progresso } = data;
  const prev = (progresso?.resposta as { texto?: string } | null)?.texto ?? "";
  const [texto, setTexto] = useState(prev);
  const [partilhar, setPartilhar] = useState(progresso?.partilhada ?? false);
  useEffect(() => setTexto(prev), [prev]);
  const fn = useServerFn(submeterReflexao);
  const m = useMutation({
    mutationFn: () => fn({ data: { passoId: passo.id, texto, partilhar } }),
    onSuccess: (r) => { toast.success("Reflexão guardada."); onDone(r.cursoConcluido); refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const podePartilhar = data.curso.curso.modalidade === "turma" && !!(passo.conteudo as { partilhavel?: boolean }).partilhavel;
  return (
    <div className="space-y-3">
      <RichTextEditor value={texto} onChange={setTexto} />
      {podePartilhar && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={partilhar} onCheckedChange={(v) => setPartilhar(!!v)} /> Partilhar com a turma
        </label>
      )}
      {inscrito && (
        <Button onClick={() => m.mutate()} disabled={m.isPending || !texto.replace(/<[^>]*>/g, "").trim()}>
          {progresso?.estado === "concluido" ? "Atualizar reflexão" : "Submeter reflexão"}
        </Button>
      )}
    </div>
  );
}
