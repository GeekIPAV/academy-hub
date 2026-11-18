/**
 * Formatos de tema no Centro de Recursos.
 *
 * Nem todos os temas são sessões: alguns são só textos de enquadramento com
 * materiais de apoio, outros são só pastas de documentos. O formato decide que
 * partes da página aparecem.
 *
 * O formato é guardado como marcador em `temas_momentos.hidden_sections`
 * (ex.: "formato:documentos"), a mesma coluna que já guarda o que está
 * oculto num tema — assim não é preciso alterar a base de dados e os temas
 * existentes continuam a ser "Sessão" por defeito.
 */
export type TemaFormato = "sessao" | "conteudo" | "documentos";

export type TemaParte = "sobre" | "plano" | "recursos";

export const TEMA_FORMATOS: Record<
  TemaFormato,
  { label: string; description: string; partes: TemaParte[] }
> = {
  sessao: {
    label: "Sessão",
    description: "Um dia ou momento de formação: enquadramento, plano de sessão e recursos.",
    partes: ["sobre", "plano", "recursos"],
  },
  conteudo: {
    label: "Conteúdo",
    description: "Texto de enquadramento com recursos de apoio, sem plano de sessão.",
    partes: ["sobre", "recursos"],
  },
  documentos: {
    label: "Pasta de documentos",
    description: "Só uma introdução curta e a lista de ficheiros e links.",
    partes: ["recursos"],
  },
};

export const TEMA_FORMATO_ORDEM: TemaFormato[] = ["sessao", "conteudo", "documentos"];

const MARCADOR = "formato:";

export function temaFormato(hiddenSections: readonly string[] | null | undefined): TemaFormato {
  const marcador = (hiddenSections ?? []).find((s) => s.startsWith(MARCADOR));
  const valor = marcador?.slice(MARCADOR.length);
  return valor === "conteudo" || valor === "documentos" ? valor : "sessao";
}

/** Devolve `hidden_sections` com o formato atualizado (sem tocar no resto). */
export function comFormato(
  hiddenSections: readonly string[] | null | undefined,
  formato: TemaFormato,
): string[] {
  const resto = (hiddenSections ?? []).filter((s) => !s.startsWith(MARCADOR));
  return formato === "sessao" ? resto : [...resto, `${MARCADOR}${formato}`];
}
