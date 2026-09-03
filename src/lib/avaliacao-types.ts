/** Valor serializável em JSON (compatível com colunas jsonb). */
export type Jsonish =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Jsonish | undefined }
  | Jsonish[];

export type RichTextContent = {
  type: string;
  content?: Jsonish[];
  [key: string]: Jsonish | undefined;
};

export type TableCell = string;
export type TableRow = TableCell[];

export type PageBlock = {
  id: string;
  type: "richtext" | "image" | "table";
  content?: RichTextContent;
  url?: string;
  alt?: string;
  headers?: TableCell[];
  rows?: TableRow[];
  [key: string]: Jsonish | undefined;
};

export type PageDoc = {
  blocks: PageBlock[];
  title?: string;
  [key: string]: Jsonish | undefined;
};

export type AvaliacaoPage = {
  id: string;
  slug: string;
  title: string;
  sort_order: number;
  blocks: PageDoc;
  cover_url: string | null;
  cover_position: string | null;
  cover_scale: number | null;
  created_at: string;
  updated_at: string;
};

export function isPageDoc(value: unknown): value is PageDoc {
  return !!value && typeof value === "object" && Array.isArray((value as PageDoc).blocks);
}

export function loadAvaliacaoDoc(value: unknown): PageDoc {
  return isPageDoc(value) ? value : { blocks: [] };
}

export function makeBlockId() {
  return Math.random().toString(36).slice(2, 10);
}

export function newRichTextBlock(): PageBlock {
  return {
    id: makeBlockId(),
    type: "richtext",
    content: { type: "doc", content: [{ type: "paragraph" }] },
  };
}

export function newTableBlock(): PageBlock {
  return {
    id: makeBlockId(),
    type: "table",
    headers: ["Cabeçalho 1", "Cabeçalho 2"],
    rows: [["", ""]],
  };
}
