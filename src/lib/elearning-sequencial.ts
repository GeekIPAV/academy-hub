export type ModuloSequencial = { passos: { id: string; obrigatorio: boolean }[] };

/** Modules are ordered; every earlier module must have its mandatory moments completed. */
export function bloqueiosSequenciais(modulos: ModuloSequencial[], concluidos: Set<string>, ligado: boolean) {
  const bloqueios = new Map<string, string>();
  if (!ligado) return bloqueios;
  let moduloPendente: number | null = null;
  modulos.forEach((modulo, indice) => {
    modulo.passos.forEach((passo, posicao) => {
      if (moduloPendente !== null) bloqueios.set(passo.id, `Abre após concluir o Módulo ${moduloPendente + 1}`);
      else if (modulo.passos.slice(0, posicao).some((anterior) => !concluidos.has(anterior.id))) bloqueios.set(passo.id, "Conclui o momento anterior");
    });
    const obrigatorios = modulo.passos.filter((p) => p.obrigatorio);
    if (moduloPendente === null && (!modulo.passos.length || obrigatorios.some((p) => !concluidos.has(p.id)))) moduloPendente = indice;
  });
  return bloqueios;
}

export function entradaSubmetida(estado: string, resposta: unknown): string | null {
  if (estado !== "concluido" || !resposta || typeof resposta !== "object" || !("texto" in resposta)) return null;
  return typeof resposta.texto === "string" && resposta.texto.trim() ? resposta.texto : null;
}