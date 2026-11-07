import { z } from "zod";

/** Tipos de pergunta suportados nas avaliações de ações. */
export const TIPOS_PERGUNTA = [
  "escala",
  "escala_antes_depois",
  "texto_curto",
  "texto_longo",
  "escolha",
] as const;
export type TipoPergunta = (typeof TIPOS_PERGUNTA)[number];

export const TIPO_PERGUNTA_LABEL: Record<TipoPergunta, string> = {
  escala: "Escala 0–10",
  escala_antes_depois: "Escala 0–10 (antes e depois)",
  texto_curto: "Texto curto",
  texto_longo: "Texto longo",
  escolha: "Escolha única",
};

export const TIPOS_AVALIACAO = ["satisfacao", "impacto", "outro"] as const;
export type TipoAvaliacao = (typeof TIPOS_AVALIACAO)[number];

export const TIPO_AVALIACAO_LABEL: Record<TipoAvaliacao, string> = {
  satisfacao: "Satisfação",
  impacto: "Impacto",
  outro: "Outra",
};

export const ESCALA_MIN = 0;
export const ESCALA_MAX = 10;

export const perguntaSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-zA-Z0-9_-]+$/, "Identificador inválido"),
  tipo: z.enum(TIPOS_PERGUNTA),
  texto: z.string().trim().min(1, "A pergunta não pode estar vazia").max(600),
  grupo: z.string().trim().max(120).optional(),
  obrigatoria: z.boolean().optional(),
  opcoes: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
});
export type Pergunta = z.infer<typeof perguntaSchema>;

export const perguntasSchema = z
  .array(perguntaSchema)
  .max(80)
  .superRefine((lista, ctx) => {
    const vistos = new Set<string>();
    lista.forEach((p, i) => {
      if (vistos.has(p.id)) {
        ctx.addIssue({
          code: "custom",
          message: "Perguntas com identificador repetido",
          path: [i, "id"],
        });
      }
      vistos.add(p.id);
      if (p.tipo === "escolha" && (!p.opcoes || p.opcoes.length < 2)) {
        ctx.addIssue({
          code: "custom",
          message: "Uma escolha única precisa de pelo menos 2 opções",
          path: [i, "opcoes"],
        });
      }
    });
  });

/** Resposta a uma pergunta: número, par início/fim ou texto. */
export type ValorResposta = number | { inicio: number; fim: number } | string;
export type Respostas = Record<string, ValorResposta>;

export function lerPerguntas(valor: unknown): Pergunta[] {
  const r = perguntasSchema.safeParse(valor);
  return r.success ? r.data : [];
}

function numeroValido(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= ESCALA_MIN && v <= ESCALA_MAX;
}

/**
 * Valida e limpa as respostas recebidas contra as perguntas da avaliação.
 * Ignora chaves desconhecidas. Devolve a mensagem de erro, se houver.
 */
export function validarRespostas(
  perguntas: Pergunta[],
  bruto: unknown,
): { ok: true; respostas: Respostas } | { ok: false; erro: string } {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) {
    return { ok: false, erro: "Respostas inválidas." };
  }
  const entrada = bruto as Record<string, unknown>;
  const saida: Respostas = {};

  for (const p of perguntas) {
    const v = entrada[p.id];
    const vazio = v === undefined || v === null || (typeof v === "string" && v.trim() === "");

    if (vazio) {
      if (p.obrigatoria) return { ok: false, erro: `Falta responder: ${p.texto}` };
      continue;
    }

    switch (p.tipo) {
      case "escala":
        if (!numeroValido(v)) return { ok: false, erro: `Resposta inválida: ${p.texto}` };
        saida[p.id] = v;
        break;
      case "escala_antes_depois": {
        const par = v as { inicio?: unknown; fim?: unknown };
        if (typeof v !== "object" || !numeroValido(par.inicio) || !numeroValido(par.fim)) {
          if (p.obrigatoria)
            return { ok: false, erro: `Falta responder (antes e depois): ${p.texto}` };
          continue;
        }
        saida[p.id] = { inicio: par.inicio, fim: par.fim };
        break;
      }
      case "escolha":
        if (typeof v !== "string" || !(p.opcoes ?? []).includes(v)) {
          return { ok: false, erro: `Resposta inválida: ${p.texto}` };
        }
        saida[p.id] = v;
        break;
      case "texto_curto":
        if (typeof v !== "string") return { ok: false, erro: `Resposta inválida: ${p.texto}` };
        saida[p.id] = v.trim().slice(0, 300);
        break;
      case "texto_longo":
        if (typeof v !== "string") return { ok: false, erro: `Resposta inválida: ${p.texto}` };
        saida[p.id] = v.trim().slice(0, 3000);
        break;
    }
  }
  return { ok: true, respostas: saida };
}

// ---------- Estatísticas ----------

export type EstatisticaPergunta = {
  id: string;
  texto: string;
  grupo: string | null;
  tipo: TipoPergunta;
  n: number;
  media: number | null;
  mediaInicio: number | null;
  mediaFim: number | null;
  /** Incremento relativo (fim − início) / início. */
  incremento: number | null;
};

export type EstatisticaGrupo = {
  grupo: string;
  mediaInicio: number | null;
  mediaFim: number | null;
  media: number | null;
  incremento: number | null;
};

function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

export function incrementoRelativo(inicio: number | null, fim: number | null): number | null {
  if (inicio === null || fim === null || inicio === 0) return null;
  return (fim - inicio) / inicio;
}

export function calcularEstatisticas(perguntas: Pergunta[], respostas: Respostas[]) {
  const porPergunta: EstatisticaPergunta[] = [];
  for (const p of perguntas) {
    if (p.tipo !== "escala" && p.tipo !== "escala_antes_depois") continue;
    const unicos: number[] = [];
    const inicios: number[] = [];
    const fins: number[] = [];
    for (const r of respostas) {
      const v = r[p.id];
      if (p.tipo === "escala" && typeof v === "number") unicos.push(v);
      if (p.tipo === "escala_antes_depois" && v && typeof v === "object") {
        inicios.push(v.inicio);
        fins.push(v.fim);
      }
    }
    const mi = media(inicios);
    const mf = media(fins);
    porPergunta.push({
      id: p.id,
      texto: p.texto,
      grupo: p.grupo ?? null,
      tipo: p.tipo,
      n: p.tipo === "escala" ? unicos.length : inicios.length,
      media: media(unicos),
      mediaInicio: mi,
      mediaFim: mf,
      incremento: incrementoRelativo(mi, mf),
    });
  }

  // Média de cada dimensão = média das médias das suas perguntas.
  const grupos = new Map<string, EstatisticaPergunta[]>();
  for (const e of porPergunta) {
    if (!e.grupo) continue;
    grupos.set(e.grupo, [...(grupos.get(e.grupo) ?? []), e]);
  }
  const porGrupo: EstatisticaGrupo[] = [];
  for (const [grupo, itens] of grupos) {
    const mi = media(itens.map((i) => i.mediaInicio).filter((x): x is number => x !== null));
    const mf = media(itens.map((i) => i.mediaFim).filter((x): x is number => x !== null));
    const m = media(itens.map((i) => i.media).filter((x): x is number => x !== null));
    porGrupo.push({
      grupo,
      mediaInicio: mi,
      mediaFim: mf,
      media: m,
      incremento: incrementoRelativo(mi, mf),
    });
  }

  return { porPergunta, porGrupo };
}

export function formatarNota(v: number | null): string {
  return v === null ? "—" : v.toFixed(1).replace(".", ",");
}

export function formatarPercentagem(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

export function novoIdPergunta(): string {
  return `p_${Math.random().toString(36).slice(2, 8)}`;
}
