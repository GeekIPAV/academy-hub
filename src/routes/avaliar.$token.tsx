import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAvaliacaoPublica, submitAvaliacao } from "@/lib/avaliacao-acoes.functions";
import {
  ESCALA_MAX,
  ESCALA_MIN,
  type Pergunta,
  type Respostas,
  type ValorResposta,
} from "@/lib/avaliacao-acoes-types";
import { cn } from "@/lib/utils";
import aluLogo from "@/assets/alu-logo.svg";

export const Route = createFileRoute("/avaliar/$token")({
  head: () => ({ meta: [{ title: "Avaliação | Academia de Líderes Ubuntu" }] }),
  component: AvaliarPage,
});

const VALORES = Array.from({ length: ESCALA_MAX - ESCALA_MIN + 1 }, (_, i) => ESCALA_MIN + i);

function EscalaInput({
  valor,
  onChange,
  rotulo,
}: {
  valor: number | undefined;
  onChange: (v: number) => void;
  rotulo: string;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="grid grid-cols-6 gap-2 sm:grid-cols-11">
      {VALORES.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={valor === n}
          onClick={() => onChange(n)}
          className={cn(
            "h-11 rounded-lg border text-base font-semibold text-secondary transition-colors",
            valor === n
              ? "border-secondary bg-secondary text-white"
              : "bg-background hover:border-secondary",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function PerguntaCampo({
  pergunta,
  valor,
  onChange,
}: {
  pergunta: Pergunta;
  valor: ValorResposta | undefined;
  onChange: (v: ValorResposta | undefined) => void;
}) {
  switch (pergunta.tipo) {
    case "escala":
      return (
        <EscalaInput
          rotulo={pergunta.texto}
          valor={typeof valor === "number" ? valor : undefined}
          onChange={onChange}
        />
      );
    case "escala_antes_depois": {
      const par = valor && typeof valor === "object" ? valor : undefined;
      // Só guarda o par quando os dois momentos estão preenchidos.
      const atualizar = (campo: "inicio" | "fim", n: number) => {
        const novo = { inicio: par?.inicio, fim: par?.fim, [campo]: n } as {
          inicio?: number;
          fim?: number;
        };
        onChange(novo as ValorResposta);
      };
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Antes da formação</p>
            <EscalaInput
              rotulo={`${pergunta.texto}, antes`}
              valor={par?.inicio}
              onChange={(n) => atualizar("inicio", n)}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Depois da formação</p>
            <EscalaInput
              rotulo={`${pergunta.texto}, depois`}
              valor={par?.fim}
              onChange={(n) => atualizar("fim", n)}
            />
          </div>
        </div>
      );
    }
    case "texto_curto":
      return (
        <Input
          value={typeof valor === "string" ? valor : ""}
          maxLength={300}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "texto_longo":
      return (
        <Textarea
          rows={4}
          value={typeof valor === "string" ? valor : ""}
          maxLength={3000}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "escolha":
      return (
        <div className="flex flex-wrap gap-2">
          {(pergunta.opcoes ?? []).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className={cn(
                "min-h-11 rounded-lg border px-3.5 py-2 text-left text-sm transition-colors",
                valor === o
                  ? "border-secondary bg-secondary text-white"
                  : "bg-background hover:border-secondary",
              )}
            >
              {o}
            </button>
          ))}
        </div>
      );
  }
}

/** Completo = respondeu ao que é obrigatório. */
function emFalta(perguntas: Pergunta[], respostas: Respostas): Pergunta | null {
  for (const p of perguntas) {
    if (!p.obrigatoria) continue;
    const v = respostas[p.id];
    if (p.tipo === "escala_antes_depois") {
      const par = v as { inicio?: number; fim?: number } | undefined;
      if (typeof v !== "object" || par?.inicio === undefined || par?.fim === undefined) return p;
    } else if (v === undefined || (typeof v === "string" && v.trim() === "")) {
      return p;
    }
  }
  return null;
}

function AvaliarPage() {
  const { token } = Route.useParams();
  const fetchFn = useServerFn(getAvaliacaoPublica);
  const submitFn = useServerFn(submitAvaliacao);
  const [respostas, setRespostas] = useState<Record<string, ValorResposta | undefined>>({});
  const [isco, setIsco] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [faltaId, setFaltaId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["avaliacao-publica", token],
    queryFn: () => fetchFn({ data: { token } }),
    retry: false,
  });

  const enviar = useMutation({
    mutationFn: (limpas: Respostas) =>
      submitFn({ data: { token, respostas: limpas, website: isco } }),
    onSuccess: () => setEnviado(true),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível enviar."),
  });

  const casca = (conteudo: React.ReactNode) => (
    <div className="min-h-[100dvh] bg-background">
      <header className="flex justify-center bg-secondary px-4 py-3.5">
        <img src={aluLogo} alt="Academia de Líderes Ubuntu" className="h-11 w-auto" />
      </header>
      <main className="mx-auto w-full min-w-0 max-w-2xl px-4 py-6 sm:py-10">{conteudo}</main>
    </div>
  );

  if (isLoading) {
    return casca(
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>,
    );
  }
  if (isError || !data) {
    return casca(
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Este link de avaliação não é válido.
        </CardContent>
      </Card>,
    );
  }
  if (enviado) {
    return casca(
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-primary" />
          <p className="text-lg font-semibold text-secondary">Obrigado pela tua resposta!</p>
          <p className="text-sm text-muted-foreground">
            A tua avaliação foi enviada de forma anónima.
          </p>
        </CardContent>
      </Card>,
    );
  }
  if (!data.aberta) {
    return casca(
      <Card>
        <CardHeader>
          <CardTitle>{data.titulo}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Esta avaliação já está fechada e não aceita novas respostas.
        </CardContent>
      </Card>,
    );
  }

  const obrigatorias = data.perguntas.filter((p) => p.obrigatoria);
  const respondidas = obrigatorias.filter((p) => emFalta([p], respostas as Respostas) === null).length;

  const submeter = (e: React.FormEvent) => {
    e.preventDefault();
    const limpas: Respostas = {};
    for (const [k, v] of Object.entries(respostas)) {
      if (v !== undefined) limpas[k] = v;
    }
    const falta = emFalta(data.perguntas, limpas);
    if (falta) {
      setFaltaId(falta.id);
      document.getElementById(`pergunta-${falta.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setFaltaId(null);
    enviar.mutate(limpas);
  };

  let grupoAnterior: string | undefined;

  return casca(
    <form onSubmit={submeter} className="space-y-3" noValidate>
      <div className="space-y-1.5">
        {data.acao_titulo && <p className="text-xs text-muted-foreground">{data.acao_titulo}</p>}
        <h1 className="text-[22px] font-semibold leading-tight text-secondary sm:text-2xl">{data.titulo}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          A tua resposta é anónima. Nas perguntas com escala, escolhe de {ESCALA_MIN} a {ESCALA_MAX}.
        </p>
      </div>

      {obrigatorias.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 bg-background px-4 py-2.5">
          <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span>
              {respondidas} de {obrigatorias.length} respondidas
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round((respondidas / obrigatorias.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {data.perguntas.map((p) => {
        const novoGrupo = p.grupo && p.grupo !== grupoAnterior;
        grupoAnterior = p.grupo;
        const comErro = faltaId === p.id;
        return (
          <div key={p.id} className="space-y-2">
            {novoGrupo && (
              <h2 className="pt-3 text-xs font-semibold text-[#A1420A]">{p.grupo}</h2>
            )}
            <fieldset
              id={`pergunta-${p.id}`}
              className={cn(
                "space-y-3 rounded-2xl border bg-card p-4",
                comErro && "border-[#B42318]",
              )}
              aria-invalid={comErro || undefined}
            >
              <legend className="float-left mb-3 w-full break-words text-[15px] font-medium leading-snug text-secondary">
                {p.texto}
                {p.obrigatoria && (
                  <span className="text-[#B42318]" aria-label="obrigatória">
                    {" "}*
                  </span>
                )}
              </legend>
              <div className="clear-both">
                <PerguntaCampo
                  pergunta={p}
                  valor={respostas[p.id]}
                  onChange={(v) => {
                    setRespostas((r) => ({ ...r, [p.id]: v }));
                    if (faltaId === p.id) setFaltaId(null);
                  }}
                />
              </div>
              {comErro && (
                <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-[#B42318]">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Falta responder a esta pergunta.
                </p>
              )}
            </fieldset>
          </div>
        );
      })}

      {/* Campo isco anti-spam: invisível para pessoas. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={isco}
            onChange={(e) => setIsco(e.target.value)}
          />
        </label>
      </div>

      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-background via-background to-transparent px-4 pb-4 pt-6">
        <Button type="submit" className="h-12 w-full text-[15px]" disabled={enviar.isPending}>
          {enviar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar avaliação
        </Button>
      </div>
    </form>,
  );
}
