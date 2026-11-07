import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TIPOS_PERGUNTA,
  TIPO_PERGUNTA_LABEL,
  novoIdPergunta,
  type Pergunta,
  type TipoPergunta,
} from "@/lib/avaliacao-acoes-types";

/** Opções de uma escolha única, uma por linha. Mantém o texto bruto enquanto se escreve. */
function OpcoesInput({ opcoes, onChange }: { opcoes: string[]; onChange: (o: string[]) => void }) {
  const [texto, setTexto] = useState(opcoes.join("\n"));
  return (
    <Textarea
      rows={3}
      value={texto}
      placeholder="Uma opção por linha"
      onChange={(e) => {
        setTexto(e.target.value);
        onChange(
          e.target.value
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean),
        );
      }}
    />
  );
}

/** Editor controlado de uma lista de perguntas (usado em modelos e em avaliações). */
export function PerguntasListEditor({
  perguntas,
  onChange,
}: {
  perguntas: Pergunta[];
  onChange: (p: Pergunta[]) => void;
}) {
  const alterar = (i: number, patch: Partial<Pergunta>) =>
    onChange(perguntas.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= perguntas.length) return;
    const c = [...perguntas];
    [c[i], c[j]] = [c[j], c[i]];
    onChange(c);
  };

  return (
    <div className="space-y-3">
      {perguntas.map((p, i) => (
        <div key={p.id} className="min-w-0 space-y-2 rounded-lg border p-3">
          <div className="flex items-start gap-2">
            <Textarea
              rows={2}
              value={p.texto}
              placeholder="Texto da pergunta"
              onChange={(e) => alterar(i, { texto: e.target.value })}
            />
            <div className="flex shrink-0 flex-col">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label="Subir"
                disabled={i === 0}
                onClick={() => mover(i, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label="Descer"
                disabled={i === perguntas.length - 1}
                onClick={() => mover(i, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[12rem_1fr_auto_auto]">
            <Select value={p.tipo} onValueChange={(v) => alterar(i, { tipo: v as TipoPergunta })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_PERGUNTA.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_PERGUNTA_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={p.grupo ?? ""}
              placeholder="Dimensão / grupo (opcional)"
              onChange={(e) => alterar(i, { grupo: e.target.value || undefined })}
            />
            <Label className="flex items-center gap-2 text-xs font-normal">
              <Switch
                checked={!!p.obrigatoria}
                onCheckedChange={(v) => alterar(i, { obrigatoria: v })}
              />
              Obrigatória
            </Label>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Remover pergunta"
              onClick={() => onChange(perguntas.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {p.tipo === "escolha" && (
            <OpcoesInput opcoes={p.opcoes ?? []} onChange={(opcoes) => alterar(i, { opcoes })} />
          )}
        </div>
      ))}

      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onChange([
            ...perguntas,
            { id: novoIdPergunta(), tipo: "escala", texto: "", obrigatoria: true },
          ])
        }
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Adicionar pergunta
      </Button>
    </div>
  );
}
