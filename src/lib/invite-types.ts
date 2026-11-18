/**
 * Tipos de link de convite. O tipo define automaticamente o perfil (role)
 * de quem entra pelo link — não é preciso escolher perfis à mão.
 *
 * O tipo não é guardado à parte: é deduzido dos perfis do convite, por isso
 * os convites antigos continuam a funcionar e a ser classificados.
 */
export type InviteTipo = "utilizador" | "entidade";
export type InviteTipoOuPersonalizado = InviteTipo | "personalizado";

export const INVITE_TYPES: Record<
  InviteTipo,
  { label: string; singular: string; role: string; genericLabel: string; description: string }
> = {
  utilizador: {
    label: "Utilizadores",
    singular: "Utilizador",
    role: "Utilizador",
    genericLabel: "Convite genérico: Utilizador",
    description: "Pessoas que criam conta individual (formandos, participantes).",
  },
  entidade: {
    label: "Entidades",
    singular: "Entidade",
    role: "Entidade",
    genericLabel: "Convite genérico: Entidade",
    description: "Escolas e organizações parceiras. Ao entrar, fazem o registo da entidade.",
  },
};

export const INVITE_TIPOS: InviteTipo[] = ["utilizador", "entidade"];

export function rolesForInviteTipo(tipo: InviteTipo): string[] {
  return [INVITE_TYPES[tipo].role];
}

export function inviteTipoFromRoles(roles: readonly string[] | null | undefined): InviteTipoOuPersonalizado {
  const list = (roles ?? []).filter(Boolean);
  if (list.length === 1) {
    if (list[0] === INVITE_TYPES.utilizador.role) return "utilizador";
    if (list[0] === INVITE_TYPES.entidade.role) return "entidade";
  }
  return "personalizado";
}
