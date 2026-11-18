/** Pequenos utilitários de apresentação do Centro de recursos. */

const PALAVRAS_MENORES = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "para", "em"]);

/** Sigla curta para capas vazias: "Formação de Educadores" → "FE", "PEX" → "PEX". */
export function sigla(titulo: string): string {
  const limpo = titulo.replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
  if (!limpo) return "·";
  const palavras = limpo.split(/[\s-]+/).filter(Boolean);
  if (palavras.length === 1) return palavras[0].slice(0, 3).toUpperCase();
  const iniciais = palavras
    .filter((p) => !PALAVRAS_MENORES.has(p.toLowerCase()))
    .map((p) => p[0])
    .join("");
  return (iniciais || palavras.map((p) => p[0]).join("")).slice(0, 3).toUpperCase();
}

/** Texto simples a partir de HTML guardado pelo editor (para resumos de 1–2 linhas). */
export function textoSimples(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<\/(p|li|h\d)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Linhas de um campo de texto livre (materiais, objetivos), sem marcadores nem pontuação final. */
export function linhas(texto: string | null | undefined): string[] {
  if (!texto) return [];
  const simples = /<[a-z][\s\S]*>/i.test(texto)
    ? texto
        .replace(/<\/(p|li|div|h\d)>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]*>/g, "")
    : texto;
  return simples
    .split(/\n|;/)
    .map((l) =>
      l
        .replace(/&nbsp;/g, " ")
        .replace(/^\s*[-–•·*]\s*/, "")
        .replace(/[.;,]\s*$/, "")
        .trim(),
    )
    .filter(Boolean);
}
