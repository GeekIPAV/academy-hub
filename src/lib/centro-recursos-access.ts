/**
 * User types that always have full access to the Centro de recursos
 * (all clusters, temas and resources). Mirrors the database function
 * public.has_centro_recursos_access.
 */
export const CENTRO_RECURSOS_ROLES = [
  "Utilizador",
  "Entidade",
  "Admin",
  "Equipa IPAV",
  "Teste",
] as const;

export function hasCentroRecursosAccess(roles: readonly string[] | null | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => (CENTRO_RECURSOS_ROLES as readonly string[]).includes(r));
}
