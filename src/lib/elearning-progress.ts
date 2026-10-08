/** Regras puras de progresso/conclusão do E-learning (partilhadas por cliente e servidor). */

/** Progresso do curso: média por módulo; módulos sem passos ("em breve") contam como 0%. */
export function pctPorModulos(modulos: { total: number; feitos: number }[]) {
  if (!modulos.length) return 0;
  const soma = modulos.reduce((n, m) => n + (m.total ? m.feitos / m.total : 0), 0);
  return Math.round((soma / modulos.length) * 100);
}

/**
 * Um curso só pode ser concluído se TODOS os módulos tiverem pelo menos um passo obrigatório
 * e todos os passos obrigatórios estiverem concluídos. Módulos vazios bloqueiam a conclusão.
 */
export function podeConcluirCurso(modulos: { passos: { id: string; obrigatorio: boolean }[] }[], concluidos: Set<string>) {
  if (!modulos.length) return false;
  if (!modulos.every((m) => m.passos.some((p) => p.obrigatorio))) return false;
  return modulos.every((m) => m.passos.filter((p) => p.obrigatorio).every((p) => concluidos.has(p.id)));
}

export type SituacaoInscrito = "nao_comecou" | "em_curso" | "parado" | "concluido" | "cancelado";
export const SITUACAO_LABEL: Record<SituacaoInscrito, string> = {
  nao_comecou: "Não começou",
  em_curso: "Em curso",
  parado: "Parado há +7 dias",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

/** Situação do inscrito para a gestão: "Não começou" = sem nenhuma atividade além da inscrição; parado = sem acesso há mais de 7 dias. */
export function situacaoInscrito(estado: string, comecou: boolean, ultimoAcesso: string | null, agora = Date.now()): SituacaoInscrito {
  if (estado === "concluido") return "concluido";
  if (estado === "cancelado") return "cancelado";
  if (!comecou) return "nao_comecou";
  if (ultimoAcesso && agora - new Date(ultimoAcesso).getTime() > 7 * 86_400_000) return "parado";
  return "em_curso";
}

/** "há 3 dias", "há 2 horas", "agora". */
export function tempoRelativo(iso: string | null, agora = Date.now()) {
  if (!iso) return "—";
  const s = Math.max(0, (agora - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  const rtf = new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" });
  if (s < 3600) return rtf.format(-Math.floor(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.floor(s / 3600), "hour");
  if (s < 30 * 86400) return rtf.format(-Math.floor(s / 86400), "day");
  if (s < 365 * 86400) return rtf.format(-Math.floor(s / (30 * 86400)), "month");
  return rtf.format(-Math.floor(s / (365 * 86400)), "year");
}
