export type ProjetoImportRow = {
  title: string;
  data_inicio: string | null;
  data_fim: string | null;
  status: "planeado" | "em_curso" | "concluido" | "suspenso";
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[\s_-]+/g, " ");

const STATUS_MAP: Record<string, ProjetoImportRow["status"]> = {
  planeado: "planeado", planejado: "planeado", "por iniciar": "planeado", "nao iniciado": "planeado",
  "em curso": "em_curso", ativo: "em_curso", "em andamento": "em_curso", "em execucao": "em_curso",
  concluido: "concluido", terminado: "concluido", finalizado: "concluido", fechado: "concluido",
  suspenso: "suspenso", pausado: "suspenso", cancelado: "suspenso",
};

export function parseStatus(v: string): ProjetoImportRow["status"] | null {
  if (!v.trim()) return "em_curso";
  return STATUS_MAP[norm(v)] ?? null;
}

export function parseDate(v: string): string | null | undefined {
  const s = v.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return undefined; // inválida
}

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

/** Lê CSV/TSV com colunas Projeto, Data início, Data fim, Status. */
export function parseProjetosCsv(text: string): { rows: ProjetoImportRow[]; errors: string[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], errors: ["Ficheiro vazio."] };
  const h = lines[0];
  const sep = h.includes("\t") ? "\t" : h.split(";").length > h.split(",").length ? ";" : ",";
  const head = splitLine(h, sep).map(norm);
  const idx = (names: string[]) => head.findIndex((c) => names.includes(c));
  const iT = idx(["projeto", "project", "nome", "titulo"]);
  const iI = idx(["data inicio", "inicio", "start date"]);
  const iF = idx(["data fim", "fim", "end date"]);
  const iS = idx(["status", "estado"]);
  if (iT < 0) return { rows: [], errors: ["Falta a coluna «Projeto»."] };
  const rows: ProjetoImportRow[] = [];
  const errors: string[] = [];
  lines.slice(1).forEach((l, n) => {
    const c = splitLine(l, sep);
    const title = c[iT] ?? "";
    if (!title) return;
    const di = iI >= 0 ? parseDate(c[iI] ?? "") : null;
    const df = iF >= 0 ? parseDate(c[iF] ?? "") : null;
    const st = iS >= 0 ? parseStatus(c[iS] ?? "") : "em_curso";
    const linha = `Linha ${n + 2} (${title})`;
    if (di === undefined) errors.push(`${linha}: data de início inválida.`);
    else if (df === undefined) errors.push(`${linha}: data de fim inválida.`);
    else if (!st) errors.push(`${linha}: status «${c[iS]}» desconhecido.`);
    else rows.push({ title: title.slice(0, 200), data_inicio: di, data_fim: df, status: st });
  });
  return { rows, errors };
}
