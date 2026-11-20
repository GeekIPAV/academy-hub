/**
 * Planos de subscrição A, B e C (novos protocolos): limites por projeto.
 * Os três dão os mesmos acessos; mudam os limites e o valor.
 */

export type PlanoId = "A" | "B" | "C";

export interface LimitesPlano {
  escolas: number;
  educadores: number;
  replicacoes: number;
  valor: number;
}

export const PLANOS: Record<PlanoId, LimitesPlano> = {
  A: { escolas: 3, educadores: 18, replicacoes: 18, valor: 18000 },
  B: { escolas: 2, educadores: 12, replicacoes: 12, valor: 12000 },
  C: { escolas: 1, educadores: 6, replicacoes: 6, valor: 7500 },
};

export const ACESSOS_PLANOS = [
  "Formação especializada online",
  "Conselho de Diretores",
  "Novos conteúdos formativos",
  "Conteúdos premium (Acolhimento Ubuntu, semana da Empatia, mês do Serviço, Ubuntu famílias)",
  "Acompanhamento do Clube Ubuntu",
  "Ubuntu Erasmus",
  "Prioridade em novos projetos e eventos nacionais",
] as const;

export type Limite = "escolas" | "educadores" | "replicacoes";

export const LIMITE_LABEL: Record<Limite, string> = {
  escolas: "Escolas envolvidas",
  educadores: "Educadores na formação certificada",
  replicacoes: "Replicações de Semana Ubuntu",
};

export type UsoPlano = Record<Limite, number>;

export function ePlano(v: string | null | undefined): v is PlanoId {
  return v === "A" || v === "B" || v === "C";
}

/** Quanto falta para cada limite (negativo = acima do limite). */
export function folgaPlano(plano: PlanoId, uso: UsoPlano): UsoPlano {
  const l = PLANOS[plano];
  return { escolas: l.escolas - uso.escolas, educadores: l.educadores - uso.educadores, replicacoes: l.replicacoes - uso.replicacoes };
}

/**
 * Pode acrescentar `quantos` ao limite? Sem plano, não há limite.
 * Com `bloqueia` falso, devolve sempre pode=true mas assinala o aviso.
 */
export function verificarLimite(
  plano: string | null | undefined,
  bloqueia: boolean,
  limite: Limite,
  usoAtual: number,
  quantos = 1,
): { pode: boolean; aviso: boolean; max: number | null } {
  if (!ePlano(plano)) return { pode: true, aviso: false, max: null };
  const max = PLANOS[plano][limite];
  const excede = usoAtual + quantos > max;
  return { pode: !(excede && bloqueia), aviso: usoAtual + quantos >= max, max };
}

export function formatarValor(v: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}
