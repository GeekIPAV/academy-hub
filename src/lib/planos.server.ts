import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notificarEquipa } from "@/lib/ftp-calendario.server";
import { LIMITE_LABEL, ePlano, verificarLimite, type Limite, type PlanoId, type UsoPlano } from "@/lib/planos-subscricao";

/** Tipos de ação que contam como replicação de Semana Ubuntu. */
export const TIPOS_REPLICACAO = ["Semana Ubuntu"];

export interface PlanoProjeto {
  id: string;
  title: string;
  plano: PlanoId | null;
  bloqueia: boolean;
  uso: UsoPlano;
}

/** Uso atual de um projeto: escolas ativas, Educadores aprovados e replicações. */
export async function usoPlanoProjeto(projectId: string): Promise<PlanoProjeto> {
  const { data: p, error } = await supabaseAdmin
    .from("projetos")
    .select("id, title, plano, plano_bloqueia, data_inicio, data_fim")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!p) throw new Error("Projeto não encontrado.");

  const { data: ents } = await supabaseAdmin
    .from("entidades_projetos")
    .select("entity_id")
    .eq("project_id", projectId)
    .eq("is_active", true);
  const entityIds = Array.from(new Set((ents ?? []).map((e) => e.entity_id)));

  let educadores = 0;
  let replicacoes = 0;
  if (entityIds.length) {
    const { data: cohorts } = await supabaseAdmin.from("entidades_programas").select("id").in("entity_id", entityIds);
    const cohortIds = (cohorts ?? []).map((c) => c.id);
    if (cohortIds.length) {
      const { data: insc } = await supabaseAdmin
        .from("inscritos_programa")
        .select("user_id")
        .in("cohort_id", cohortIds)
        .in("status", ["aprovada", "concluido"]);
      educadores = new Set((insc ?? []).map((i) => i.user_id).filter(Boolean)).size;
    }
    let q = supabaseAdmin
      .from("acoes")
      .select("id", { count: "exact", head: true })
      .in("entity_id", entityIds)
      .in("action_type", TIPOS_REPLICACAO)
      .neq("status", "Cancelada");
    if (p.data_inicio) q = q.gte("start_date", p.data_inicio);
    if (p.data_fim) q = q.lte("start_date", p.data_fim);
    const { count } = await q;
    replicacoes = count ?? 0;
  }

  return {
    id: p.id,
    title: p.title,
    plano: ePlano(p.plano) ? p.plano : null,
    bloqueia: p.plano_bloqueia,
    uso: { escolas: entityIds.length, educadores, replicacoes },
  };
}

/** Projetos com plano a que a escola pertence. */
async function projetosComPlanoDaEntidade(entityId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("entidades_projetos")
    .select("project_id, projetos!inner(plano)")
    .eq("entity_id", entityId)
    .eq("is_active", true)
    .not("projetos.plano", "is", null);
  return Array.from(new Set((data ?? []).map((r) => r.project_id)));
}

/**
 * Verifica um limite antes de acrescentar `quantos`. Se o projeto bloqueia
 * e passa do máximo, lança erro; ao chegar ao máximo, avisa a equipa.
 */
export async function garantirLimitePlano(projectIds: string[], limite: Limite, quantos = 1) {
  for (const id of projectIds) {
    const p = await usoPlanoProjeto(id);
    if (!p.plano) continue;
    const r = verificarLimite(p.plano, p.bloqueia, limite, p.uso[limite], quantos);
    if (!r.pode) {
      throw new Error(
        `O projeto ${p.title} (Plano ${p.plano}) já tem ${p.uso[limite]} de ${r.max} em «${LIMITE_LABEL[limite]}». Fala com a equipa IPAV.`,
      );
    }
    if (r.aviso) {
      await notificarEquipa(
        `Plano ${p.plano}: limite atingido`,
        `${p.title} chegou a ${p.uso[limite] + quantos} de ${r.max} em «${LIMITE_LABEL[limite]}».`,
        "/admin/projetos",
      );
    }
  }
}

export async function garantirLimitePlanoEntidade(entityId: string, limite: Limite, quantos = 1) {
  await garantirLimitePlano(await projetosComPlanoDaEntidade(entityId), limite, quantos);
}
