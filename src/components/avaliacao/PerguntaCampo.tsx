import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ESCALA_MAX,
  ESCALA_MIN,
  type Pergunta,
  type ValorResposta,
} from "@/lib/avaliacao-acoes-types";
import { cn } from "@/lib/utils";

/** Campo de resposta a uma pergunta, igual no formulário público e na pré-visualização. */
const VALORES = Array.from({ length: ESCALA_MAX - ESCALA_MIN + 1 }, (_, i) => ESCALA_MIN + i);

export function EscalaInput({
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

export function PerguntaCampo({
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
    default:
      return null;
  }
}

