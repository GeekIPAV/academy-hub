/**
 * Empty temas (no text, no resources, no session blocks) are hidden from
 * people whose only user type is "Utilizador". Any other type still sees
 * them, so the team can keep preparing them. They reappear automatically
 * once content is added.
 */
export interface TemaConteudo {
  description?: string | null;
  intro?: string | null;
  context?: string | null;
  objectives?: string | null;
  processo_u?: string | null;
  recursosCount: number;
  blocosCount: number;
}

export function temaSemConteudo(t: TemaConteudo): boolean {
  const temTexto = [t.description, t.intro, t.context, t.objectives, t.processo_u].some(
    (v) => !!v && v.replace(/<[^>]*>/g, "").trim().length > 0,
  );
  return !temTexto && t.recursosCount === 0 && t.blocosCount === 0;
}

export function escondeTemasVazios(roles: readonly string[] | null | undefined): boolean {
  if (!roles?.length) return true;
  return roles.every((r) => r === "Utilizador");
}
