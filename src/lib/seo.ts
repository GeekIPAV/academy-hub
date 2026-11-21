/**
 * Títulos e descrições para a aba do navegador, motores de pesquisa e
 * pré-visualizações de partilha (WhatsApp, LinkedIn, Facebook, X, email).
 *
 * Usa sempre `seo()` no `head` das rotas: garante que título, descrição,
 * Open Graph e Twitter dizem o mesmo, e que nenhuma página herda o texto
 * genérico da raiz. A imagem de partilha e o cartão grande vêm do __root.
 */

export const MARCA = "Academia de Líderes Ubuntu";
export const MARCA_ELEARNING = "Escola Ubuntu Online";
export const MARCA_GESTAO = "Gestão";

export const DESCRICAO_PADRAO =
  "Plataforma da Academia de Líderes Ubuntu, do IPAV: formação de Educadores, eventos, recursos pedagógicos e certificados.";

export interface SeoOpcoes {
  /** Título completo, já com a marca (ex.: "FAQs | Academia de Líderes Ubuntu"). */
  title: string;
  /** 1 a 2 frases, idealmente até 155 caracteres. */
  description: string;
  type?: "website" | "article";
  /** Páginas privadas, de gestão ou com tokens: não entram nos motores de pesquisa. */
  privada?: boolean;
  image?: string | null;
}

export function seo(o: SeoOpcoes) {
  const description = resumo(o.description, 200);
  const meta: Array<Record<string, string>> = [
    { title: o.title },
    { name: "description", content: description },
    { property: "og:title", content: o.title },
    { property: "og:description", content: description },
    { property: "og:type", content: o.type ?? "website" },
    { name: "twitter:title", content: o.title },
    { name: "twitter:description", content: description },
  ];
  if (o.image) {
    meta.push({ property: "og:image", content: o.image }, { name: "twitter:image", content: o.image });
  }
  if (o.privada) meta.push({ name: "robots", content: "noindex, nofollow" });
  return meta;
}

/** Texto simples, sem HTML nem espaços repetidos, cortado numa palavra. */
export function resumo(texto: string | null | undefined, max = 155): string {
  const limpo = (texto ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (limpo.length <= max) return limpo;
  const corte = limpo.slice(0, max - 1);
  const espaco = corte.lastIndexOf(" ");
  return `${(espaco > max * 0.6 ? corte.slice(0, espaco) : corte).replace(/[\s,;:.–-]+$/, "")}…`;
}

export function titulo(pagina: string, marca: string = MARCA) {
  return `${pagina} | ${marca}`;
}
