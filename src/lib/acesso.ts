/**
 * Níveis de acesso, partilhados entre ecrãs e servidor.
 *
 * - Admin e Equipa IPAV: acesso a tudo (gestão e plataforma). Igual a
 *   `PAPEIS_ACESSO_TOTAL` em admin-access.server.ts e à função SQL `is_admin`.
 * - Utilizador, Entidade e Teste: só as rotas da matriz `permissoes_roles`
 *   (ver ROTAS_POR_PAPEL, a referência aplicada na migração 0014).
 */
export const PAPEIS_ACESSO_TOTAL = ["Admin", "Equipa IPAV"] as const;

export function temAcessoTotalPapeis(papeis: readonly string[]): boolean {
  return papeis.some((p) => (PAPEIS_ACESSO_TOTAL as readonly string[]).includes(p));
}

/** O que cada papel sem acesso total vê na plataforma. */
export const ROTAS_POR_PAPEL: Record<"Utilizador" | "Entidade" | "Teste", readonly string[]> = {
  Utilizador: [
    "/dashboard",
    "/acoes",
    "/actions",
    "/elearning",
    "/recursos",
    "/publicacoes/revistas",
    "/publicacoes/biblioteca",
    "/comunicacao/propriedade-intelectual",
    "/faqs",
  ],
  Entidade: [
    "/dashboard",
    "/entidade/dashboard",
    "/acoes",
    "/actions",
    "/recursos",
    "/publicacoes/revistas",
    "/publicacoes/biblioteca",
    "/comunicacao/propriedade-intelectual",
    "/faqs",
  ],
  Teste: [
    "/dashboard",
    "/acoes",
    "/actions",
    "/elearning",
    "/recursos",
    "/publicacoes/revistas",
    "/publicacoes/biblioteca",
    "/comunicacao/propriedade-intelectual",
    "/faqs",
  ],
};
