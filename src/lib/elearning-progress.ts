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
