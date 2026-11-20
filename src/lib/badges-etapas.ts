/**
 * Badges das etapas da jornada: que badge cada etapa dá, o que abre e
 * quando um badge expira antes do fim do percurso. Regras puras, usadas
 * pelo servidor e pela interface.
 */
import { formatarDataPt } from "@/lib/ftp-calendario";

export type EtapaBadge = "inscricao" | "ftc" | "presenca_ftp" | "sessao_final";

export const ETAPAS_BADGE: { id: EtapaBadge; etapa: string; quando: string; abre: string }[] = [
  { id: "inscricao", etapa: "Inscrição no programa", quando: "Automático ao aprovar a inscrição", abre: "Centro de recursos da formação" },
  { id: "ftc", etapa: "FTC concluída", quando: "Automático ao concluir a FTC", abre: "Inscrição na FTP (2.ª semana)" },
  { id: "presenca_ftp", etapa: "Presença na FTP", quando: "Ao marcar «Presente» na turma da FTP", abre: "Bloco Semana Ubuntu no Centro de recursos" },
  { id: "sessao_final", etapa: "Sessão Final", quando: "Ao marcar a Sessão Final como concluída", abre: "Certificado e acreditação" },
];

export const ETAPA_BADGE_LABEL: Record<EtapaBadge, string> = Object.fromEntries(
  ETAPAS_BADGE.map((e) => [e.id, e.etapa]),
) as Record<EtapaBadge, string>;

export interface ValidadeBadge {
  validity_type: string | null;
  validity_years: number | null;
  validity_fixed_date: string | null;
}

/** A validade configurada no badge, em linguagem simples. */
export function validadeTexto(b: ValidadeBadge | null | undefined, etapa?: EtapaBadge): string {
  if (etapa === "presenca_ftp") return "Até ao fim do ano letivo da FTP";
  if (!b) return "—";
  if (b.validity_type === "relative_years" && b.validity_years) {
    return b.validity_years === 1 ? "1 ano a partir da atribuição" : `${b.validity_years} anos a partir da atribuição`;
  }
  if (b.validity_type === "fixed_date" && b.validity_fixed_date) return `Até ${formatarDataPt(b.validity_fixed_date)}`;
  return "Permanente";
}

/**
 * Um badge que a pessoa tem expira antes do limite (por omissão, o fim do
 * acesso ao percurso)? Devolve a data em que expira, ou null.
 */
export function expiraAntes(expiresAt: string | null | undefined, limite: string | null | undefined): string | null {
  if (!expiresAt || !limite) return null;
  const dia = expiresAt.slice(0, 10);
  return dia < limite.slice(0, 10) ? dia : null;
}

/** Badge válido agora (sem data de fim ou com fim no futuro). */
export function badgeValido(expiresAt: string | null | undefined, agora: number = Date.now()): boolean {
  return !expiresAt || Date.parse(expiresAt) > agora;
}
