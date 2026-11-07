import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
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

export const Route = createFileRoute("/avaliar/$token")({
  head: () => ({ meta: [{ title: "Avaliação — Academia Ubuntu" }] }),
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
    <div role="radiogroup" aria-label={rotulo} className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
      {VALORES.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={valor === n}
          onClick={() => onChange(n)}
          className={cn(
            "h-10 rounded-md border text-sm font-medium transition-colors",
            valor === n
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-background hover:bg-muted",
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
              rotulo={`${pergunta.texto} — antes`}
              valor={par?.inicio}
              onChange={(n) => atualizar("inicio", n)}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Depois da formação</p>
            <EscalaInput
              rotulo={`${pergunta.texto} — depois`}
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
                "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                valor === o
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted",
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
    <main className="mx-auto w-full min-w-0 max-w-2xl px-4 py-6 sm:py-10">{conteudo}</main>
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
          <p className="text-lg font-semibold">Obrigado pela tua resposta!</p>
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

  const submeter = (e: React.FormEvent) => {
    e.preventDefault();
    const limpas: Respostas = {};
    for (const [k, v] of Object.entries(respostas)) {
      if (v !== undefined) limpas[k] = v;
    }
    const falta = emFalta(data.perguntas, limpas);
    if (falta) {
      toast.error(`Falta responder: ${falta.texto}`);
      return;
    }
    enviar.mutate(limpas);
  };

  let grupoAnterior: string | undefined;

  return casca(
    <form onSubmit={submeter} className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-secondary sm:text-2xl">{data.titulo}</h1>
        {data.acao_titulo && <p className="text-sm text-muted-foreground">{data.acao_titulo}</p>}
        <p className="pt-1 text-sm text-muted-foreground">
          A avaliação é anónima. Escolhe de {ESCALA_MIN} a {ESCALA_MAX} em cada pergunta com escala.
        </p>
      </div>

      {data.perguntas.map((p) => {
        const novoGrupo = p.grupo && p.grupo !== grupoAnterior;
        grupoAnterior = p.grupo;
        return (
          <div key={p.id} className="space-y-3">
            {novoGrupo && (
              <h2 className="pt-3 text-sm font-semibold uppercase tracking-wide text-primary">
                {p.grupo}
              </h2>
            )}
            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="break-words text-sm font-medium">
                  {p.texto}
                  {p.obrigatoria && <span className="text-destructive"> *</span>}
                </p>
                <PerguntaCampo
                  pergunta={p}
                  valor={respostas[p.id]}
                  onChange={(v) => setRespostas((r) => ({ ...r, [p.id]: v }))}
                />
              </CardContent>
            </Card>
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

      <Button type="submit" className="w-full" disabled={enviar.isPending}>
        {enviar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enviar avaliação
      </Button>
    </form>,
  );
}
