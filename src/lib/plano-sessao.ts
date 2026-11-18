import { linhas } from "@/lib/recursos-ui";

/** Tipos e utilitários partilhados do plano de sessão (ecrã e impressão). */

export interface RecursoRow {
  id: string;
  title: string;
  resource_type: string;
  file_url: string;
  cover_url: string | null;
  cover_position: string | null;
  cover_scale: number | null;
  category_key: string | null;
}

export interface PlanoBloco {
  id: string;
  tema_id: string;
  sort_order: number;
  tipo: string | null;
  title: string | null;
  description: string | null;
  duration_minutes: number | null;
  schedule: string | null;
  materials: string | null;
  objetivos: string | null;
  recurso_ids: string[];
}

export const PLANO_BLOCO_COLUMNS =
  "id, tema_id, sort_order, tipo, title, description, duration_minutes, schedule, materials, objetivos, recurso_ids";

/** Tipos de momento sugeridos no editor (o campo aceita qualquer texto). */
export const TIPOS_MOMENTO = [
  "Acolhimento",
  "Apresentação",
  "Introdução",
  "Dinâmica",
  "Conto",
  "Filme",
  "Reflexão em pequenos grupos",
  "Partilha em plenário",
  "Avaliação",
  "Intervalo",
  "Almoço",
  "Outro",
];

/** Momentos sem conteúdo pedagógico: aparecem como faixa simples. */
export function isPausa(b: Pick<PlanoBloco, "tipo" | "title">): boolean {
  const t = (b.tipo ?? b.title ?? "").trim().toLowerCase();
  return t === "intervalo" || t === "almoço" || t === "almoco" || t === "pausa";
}

/** "09:00–09:10", "9h00 - 9h10" → { inicio: "09:00", fim: "09:10" }. */
export function parseHorario(schedule: string | null | undefined): { inicio: string | null; fim: string | null } {
  if (!schedule) return { inicio: null, fim: null };
  const partes = schedule.split(/\s*[–—-]\s*|\s+a\s+|\s+às\s+/).map((p) => p.trim()).filter(Boolean);
  return { inicio: partes[0] ?? null, fim: partes[1] ?? null };
}

export function formatDuracao(min: number | null | undefined): string {
  if (!min || min <= 0) return "";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${String(m).padStart(2, "0")}` : `${h}h`;
}

/** Equipamento da sala: mostrado como etiquetas curtas e não repetido nas listas. */
const EQUIPAMENTO: { re: RegExp; label: string }[] = [
  { re: /^computador(es)?$/i, label: "PC" },
  { re: /^projetor(es)?$|^projeç(ão|ao)$/i, label: "Projetor" },
  { re: /^(sistema de )?som$/i, label: "Som" },
];

export function separarMateriais(materials: string | null | undefined): {
  equipamento: string[];
  materiais: string[];
} {
  const equipamento: string[] = [];
  const materiais: string[] = [];
  for (const l of linhas(materials)) {
    const eq = EQUIPAMENTO.find((e) => e.re.test(l));
    if (eq) {
      if (!equipamento.includes(eq.label)) equipamento.push(eq.label);
    } else materiais.push(l);
  }
  return { equipamento, materiais };
}

/** Lista única de materiais a preparar para a sessão inteira (sem equipamento). */
export function materiaisDaSessao(blocos: PlanoBloco[]): string[] {
  const vistos = new Map<string, string>();
  for (const b of blocos) {
    for (const m of separarMateriais(b.materials).materiais) {
      const k = m.toLowerCase();
      if (!vistos.has(k)) vistos.set(k, m);
    }
  }
  return Array.from(vistos.values());
}

export function resumoSessao(blocos: PlanoBloco[]) {
  const comHora = blocos.map((b) => parseHorario(b.schedule));
  const inicio = comHora.find((h) => h.inicio)?.inicio ?? null;
  const fim = [...comHora].reverse().find((h) => h.fim)?.fim ?? null;
  const duracao = blocos.reduce((n, b) => n + (b.duration_minutes ?? 0), 0);
  const momentos = blocos.filter((b) => !isPausa(b)).length;
  return { inicio, fim, duracao, momentos };
}
