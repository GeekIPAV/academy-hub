import type { PageBlock, PageDoc } from "@/lib/avaliacao-types";

type NodeLike = { type?: string; attrs?: { level?: number }; content?: NodeLike[]; text?: string };

export type AvaliacaoSection = { key: string; title: string; blocks: PageBlock[] };

export type AvaliacaoStructure = {
  intro: PageBlock[];
  referenciais: string[];
  referenciaisBlocks: PageBlock[];
  metodologias: AvaliacaoSection[];
  indicadores: PageBlock[];
  perguntas: PageBlock[];
  perguntasTitle: string;
  extras: AvaliacaoSection[];
};

function nodes(block: PageBlock): NodeLike[] {
  if (block.type !== "richtext") return [];
  return ((block.content as unknown as NodeLike)?.content ?? []) as NodeLike[];
}

function plainText(node: NodeLike | undefined): string {
  if (!node) return "";
  if (node.text) return node.text;
  return (node.content ?? []).map(plainText).join("");
}

export function blockHeading(block: PageBlock): { level: number; text: string } | null {
  const first = nodes(block)[0];
  if (!first || first.type !== "heading") return null;
  return { level: first.attrs?.level ?? 1, text: plainText(first) };
}

export function blockText(block: PageBlock): string {
  return nodes(block).map(plainText).join(" ").trim();
}

function listItems(blocks: PageBlock[]): string[] {
  const items: string[] = [];
  for (const block of blocks) {
    for (const node of nodes(block)) {
      if (node.type === "bulletList" || node.type === "orderedList") {
        for (const item of node.content ?? []) items.push(plainText(item).trim());
      } else {
        const text = plainText(node).trim();
        if (text) items.push(text);
      }
    }
  }
  return items.filter(Boolean);
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function parseAvaliacao(doc: PageDoc): AvaliacaoStructure {
  const blocks = doc.blocks ?? [];
  const intro: PageBlock[] = [];
  const groups: AvaliacaoSection[] = [];
  let current: AvaliacaoSection | null = null;

  blocks.forEach((block, index) => {
    const heading = blockHeading(block);
    if (heading && heading.level <= 2) {
      current = { key: `s${index}`, title: heading.text, blocks: [] };
      groups.push(current);
      return;
    }
    if (current) current.blocks.push(block);
    else intro.push(block);
  });

  const find = (predicate: (title: string) => boolean) => groups.find((group) => predicate(normalize(group.title)));
  const metodologiasGroup = find((title) => title.startsWith("metodologia"));
  const referenciaisGroup = find((title) => title.startsWith("referenc"));
  const indicadoresGroup = find((title) => title.startsWith("indicador"));
  const perguntasGroup = find((title) => title.includes("pergunta"));
  const used = new Set([metodologiasGroup, referenciaisGroup, indicadoresGroup, perguntasGroup].filter(Boolean));

  const metodologias: AvaliacaoSection[] = [];
  let lead: PageBlock[] = [];
  for (const block of metodologiasGroup?.blocks ?? []) {
    const heading = blockHeading(block);
    if (heading && heading.level >= 3) {
      metodologias.push({ key: `metodologia-${metodologias.length}`, title: heading.text, blocks: [] });
      continue;
    }
    if (metodologias.length === 0) lead.push(block);
    else metodologias[metodologias.length - 1].blocks.push(block);
  }
  if (metodologias.length === 0 && lead.length > 0) {
    metodologias.push({ key: "metodologia-0", title: metodologiasGroup?.title ?? "Metodologias", blocks: lead });
    lead = [];
  }

  return {
    intro: [...intro, ...lead],
    referenciais: listItems(referenciaisGroup?.blocks ?? []),
    referenciaisBlocks: referenciaisGroup?.blocks ?? [],
    metodologias,
    indicadores: indicadoresGroup?.blocks ?? [],
    perguntas: perguntasGroup?.blocks ?? [],
    perguntasTitle: perguntasGroup?.title ?? "Indicadores e perguntas",
    extras: groups.filter((group) => !used.has(group)),
  };
}

export function findSection(structure: AvaliacaoStructure, key: string): { title: string; blocks: PageBlock[] } | null {
  if (key === "indicadores") return { title: "Indicadores", blocks: structure.indicadores };
  if (key === "perguntas") return { title: structure.perguntasTitle, blocks: [...structure.perguntas, ...structure.extras.flatMap((extra) => extra.blocks)] };
  if (key === "referenciais") return { title: "Referenciais", blocks: structure.referenciaisBlocks };
  const metodologia = structure.metodologias.find((item) => item.key === key);
  return metodologia ? { title: metodologia.title, blocks: metodologia.blocks } : null;
}
