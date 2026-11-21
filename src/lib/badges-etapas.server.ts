import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { EtapaBadge } from "@/lib/badges-etapas";

/**
 * Badges das etapas (servidor). Cada programa diz que badge dá cada etapa;
 * quando não diz, valem os que já existiam: badge de formando e badge final
 * do cluster, badge final do curso da FTC.
 */

export type BadgesDoPrograma = Record<EtapaBadge, { id: string | null; origem: "programa" | "cluster" | "curso" | null }>;

export async function badgesDoPrograma(programId: string): Promise<BadgesDoPrograma> {
  const { data: p } = await supabaseAdmin
    .from("programas")
    .select("badge_inscricao_id, badge_final_id, su_badge_id, ftc_curso_id, cluster_id")
    .eq("id", programId)
    .maybeSingle();
  const [{ data: cluster }, { data: curso }] = await Promise.all([
    p?.cluster_id
      ? supabaseAdmin.from("clusters").select("formando_badge_id, final_badge_id").eq("id", p.cluster_id).maybeSingle()
      : Promise.resolve({ data: null as { formando_badge_id: string | null; final_badge_id: string | null } | null }),
    p?.ftc_curso_id
      ? supabaseAdmin.from("cursos").select("badge_final_id").eq("id", p.ftc_curso_id).maybeSingle()
      : Promise.resolve({ data: null as { badge_final_id: string | null } | null }),
  ]);
  const de = (proprio: string | null | undefined, alternativo: string | null | undefined, origemAlt: "cluster" | "curso") =>
    proprio ? { id: proprio, origem: "programa" as const } : alternativo ? { id: alternativo, origem: origemAlt } : { id: null, origem: null };
  return {
    inscricao: de(p?.badge_inscricao_id, cluster?.formando_badge_id, "cluster"),
    ftc: curso?.badge_final_id ? { id: curso.badge_final_id, origem: "curso" } : { id: null, origem: null },
    presenca_ftp: p?.su_badge_id ? { id: p.su_badge_id, origem: "programa" } : { id: null, origem: null },
    sessao_final: de(p?.badge_final_id, cluster?.final_badge_id, "cluster"),
  };
}

/** Etapas (de programas ativos) que dão este badge. */
export async function etapasDoBadge(badgeId: string): Promise<{ programId: string; programTitle: string | null; etapa: EtapaBadge }[]> {
  const { data: programas } = await supabaseAdmin
    .from("programas")
    .select("id, title, is_active")
    .neq("is_active", false);
  const out: { programId: string; programTitle: string | null; etapa: EtapaBadge }[] = [];
  for (const p of programas ?? []) {
    const b = await badgesDoPrograma(p.id);
    for (const etapa of Object.keys(b) as EtapaBadge[]) {
      if (b[etapa].id === badgeId) out.push({ programId: p.id, programTitle: p.title, etapa });
    }
  }
  return out;
}

export interface CondicaoEtapa {
  cumprida: boolean;
  /** Inscrição do utilizador neste programa, se existir. */
  inscricaoProgramaId: string | null;
  /** Quando a condição é a presença na FTP e a pessoa tem FTP, a FTP para a marcar. */
  ftp: { id: string; start_date: string | null } | null;
}

/** A pessoa cumpriu a etapa que dá este badge, neste programa? */
export async function condicaoDaEtapa(userId: string, programId: string, etapa: EtapaBadge): Promise<CondicaoEtapa> {
  const { data: cohorts } = await supabaseAdmin
    .from("entidades_programas")
    .select("id, ftp_acao_id")
    .eq("program_id", programId);
  const cohortIds = (cohorts ?? []).map((c) => c.id);
  const { data: insc } = cohortIds.length
    ? await supabaseAdmin
        .from("inscritos_programa")
        .select("id, status, cohort_id")
        .eq("user_id", userId)
        .in("cohort_id", cohortIds)
        .limit(1)
        .maybeSingle()
    : { data: null };
  const cohort = insc ? (cohorts ?? []).find((c) => c.id === insc.cohort_id) ?? null : null;
  const base: CondicaoEtapa = { cumprida: false, inscricaoProgramaId: insc?.id ?? null, ftp: null };

  if (etapa === "inscricao") return { ...base, cumprida: insc?.status === "aprovada" || insc?.status === "concluido" };
  if (etapa === "sessao_final") return { ...base, cumprida: insc?.status === "concluido" };
  if (etapa === "ftc") {
    const { data: p } = await supabaseAdmin.from("programas").select("ftc_curso_id").eq("id", programId).maybeSingle();
    if (!p?.ftc_curso_id) return base;
    const { data: ci } = await supabaseAdmin
      .from("cursos_inscricoes")
      .select("id")
      .eq("user_id", userId)
      .eq("curso_id", p.ftc_curso_id)
      .eq("estado", "concluido")
      .limit(1);
    return { ...base, cumprida: (ci ?? []).length > 0 };
  }
  // presenca_ftp
  if (!cohort?.ftp_acao_id) return base;
  const { data: ftp } = await supabaseAdmin.from("acoes").select("id, start_date").eq("id", cohort.ftp_acao_id).maybeSingle();
  const { data: ia } = await supabaseAdmin
    .from("inscritos_acoes")
    .select("status")
    .eq("user_id", userId)
    .eq("action_id", cohort.ftp_acao_id)
    .maybeSingle();
  return { ...base, cumprida: ia?.status === "presente", ftp: ftp ?? null };
}

/** Dá (ou renova) um badge; sem `expiresAt`, a validade vem da configuração do badge. */
export async function darBadge(userId: string, badgeId: string, grantedBy: string | null, expiresAt?: string | null) {
  const { data: existente } = await supabaseAdmin
    .from("user_badges")
    .select("id")
    .eq("user_id", userId)
    .eq("badge_id", badgeId)
    .maybeSingle();
  if (existente) {
    if (expiresAt !== undefined) {
      const { error } = await supabaseAdmin.from("user_badges").update({ expires_at: expiresAt }).eq("id", existente.id);
      if (error) throw new Error(error.message);
    }
    return;
  }
  const { error } = await supabaseAdmin
    .from("user_badges")
    .insert({ user_id: userId, badge_id: badgeId, granted_by: grantedBy, ...(expiresAt !== undefined ? { expires_at: expiresAt } : {}) });
  if (error && !/duplicate key|unique/i.test(error.message)) throw new Error(error.message);
}

/** Badge da etapa «Inscrição no programa» (programa, ou formando do cluster). */
export async function darBadgeInscricao(programId: string | null, userId: string) {
  if (!programId) return;
  const b = await badgesDoPrograma(programId);
  if (b.inscricao.id) await darBadge(userId, b.inscricao.id, null);
}
