import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ETAPAS_BADGE, badgeValido, validadeTexto, type EtapaBadge } from "@/lib/badges-etapas";
import { assertEquipaOuAdmin, notificarUtilizadores } from "@/lib/ftp-calendario.server";
import { badgesDoPrograma, condicaoDaEtapa, darBadge, etapasDoBadge } from "@/lib/badges-etapas.server";

const etapaEnum = z.enum(["inscricao", "ftc", "presenca_ftp", "sessao_final"]);

// ============== Configuração por programa ==============

export interface BadgeEtapaInfo {
  etapa: EtapaBadge;
  label: string;
  quando: string;
  abre: string;
  badge: { id: string; title: string; cover_url: string | null } | null;
  origem: "programa" | "cluster" | "curso" | null;
  validade: string;
  quem_tem: number;
  excecoes: number;
}

export interface BadgesEtapasPrograma {
  etapas: BadgeEtapaInfo[];
  badges: { id: string; title: string }[];
  ftc_configurada: boolean;
  renovacao_ativa: boolean;
  badge_renovacao_id: string | null;
}

export const getBadgesEtapas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ programId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<BadgesEtapasPrograma> => {
    await assertEquipaOuAdmin(context.userId);
    const [b, { data: prog }, { data: todos }] = await Promise.all([
      badgesDoPrograma(data.programId),
      supabaseAdmin.from("programas").select("ftc_curso_id, renovacao_ativa, badge_renovacao_id").eq("id", data.programId).maybeSingle(),
      supabaseAdmin.from("badges").select("id, title, cover_url, validity_type, validity_years, validity_fixed_date").order("title"),
    ]);
    const porId = new Map((todos ?? []).map((x) => [x.id, x]));

    // Educadores do programa, para contar quem tem cada badge.
    const { data: cohorts } = await supabaseAdmin.from("entidades_programas").select("id").eq("program_id", data.programId);
    const cohortIds = (cohorts ?? []).map((c) => c.id);
    const { data: insc } = cohortIds.length
      ? await supabaseAdmin.from("inscritos_programa").select("user_id").in("cohort_id", cohortIds)
      : { data: [] as { user_id: string | null }[] };
    const userIds = Array.from(new Set((insc ?? []).map((i) => i.user_id).filter((id): id is string => !!id)));
    const badgeIds = Object.values(b).map((x) => x.id).filter((id): id is string => !!id);
    const { data: ub } =
      userIds.length && badgeIds.length
        ? await supabaseAdmin.from("user_badges").select("badge_id, user_id, expires_at").in("badge_id", badgeIds).in("user_id", userIds.slice(0, 1000))
        : { data: [] as { badge_id: string; user_id: string; expires_at: string | null }[] };
    const { data: exc } = await supabaseAdmin
      .from("badge_excecoes")
      .select("etapa")
      .eq("program_id", data.programId)
      .is("retirado_em", null);

    return {
      etapas: ETAPAS_BADGE.map((e) => {
        const id = b[e.id].id;
        const badge = id ? porId.get(id) ?? null : null;
        return {
          etapa: e.id,
          label: e.etapa,
          quando: e.quando,
          abre: e.abre,
          badge: badge ? { id: badge.id, title: badge.title, cover_url: badge.cover_url } : null,
          origem: b[e.id].origem,
          validade: validadeTexto(badge, e.id),
          quem_tem: id ? (ub ?? []).filter((x) => x.badge_id === id && badgeValido(x.expires_at)).length : 0,
          excecoes: (exc ?? []).filter((x) => x.etapa === e.id).length,
        };
      }),
      badges: (todos ?? []).map((x) => ({ id: x.id, title: x.title })),
      ftc_configurada: !!prog?.ftc_curso_id,
      renovacao_ativa: prog?.renovacao_ativa ?? false,
      badge_renovacao_id: prog?.badge_renovacao_id ?? null,
    };
  });

const idOuNulo = z.string().uuid().nullable();

export const guardarBadgesEtapas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        programId: z.string().uuid(),
        inscricao: idOuNulo,
        ftc: idOuNulo,
        presenca_ftp: idOuNulo,
        sessao_final: idOuNulo,
        renovacao_ativa: z.boolean(),
        badge_renovacao_id: idOuNulo,
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const { data: prog, error: pErr } = await supabaseAdmin
      .from("programas")
      .update({
        badge_inscricao_id: data.inscricao,
        su_badge_id: data.presenca_ftp,
        badge_final_id: data.sessao_final,
        renovacao_ativa: data.renovacao_ativa,
        badge_renovacao_id: data.badge_renovacao_id,
      })
      .eq("id", data.programId)
      .select("ftc_curso_id")
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    // O badge da FTC vive no curso: muda-se lá, para o curso continuar a dá-lo.
    if (prog?.ftc_curso_id) {
      const { error } = await supabaseAdmin.from("cursos").update({ badge_final_id: data.ftc }).eq("id", prog.ftc_curso_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ============== Atribuição manual de um badge de etapa ==============

export interface AnaliseBadgeManual {
  etapas: {
    programId: string;
    programTitle: string | null;
    etapa: EtapaBadge;
    cumprida: boolean;
    ftp: { id: string; start_date: string | null } | null;
  }[];
  /** Badge de etapa cuja etapa ainda não foi cumprida neste programa. */
  precisaDecisao: boolean;
}

export const analisarBadgeManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ badgeId: z.string().uuid(), userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<AnaliseBadgeManual> => {
    await assertEquipaOuAdmin(context.userId);
    const etapas = await etapasDoBadge(data.badgeId);
    const out: AnaliseBadgeManual["etapas"] = [];
    for (const e of etapas) {
      const c = await condicaoDaEtapa(data.userId, e.programId, e.etapa);
      // Só conta o programa em que a pessoa está inscrita.
      if (!c.inscricaoProgramaId) continue;
      out.push({ programId: e.programId, programTitle: e.programTitle, etapa: e.etapa, cumprida: c.cumprida, ftp: c.ftp });
    }
    return { etapas: out, precisaDecisao: out.some((e) => !e.cumprida) };
  });

export const atribuirBadgeComExcecao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        badgeId: z.string().uuid(),
        userId: z.string().uuid(),
        programId: z.string().uuid(),
        etapa: etapaEnum,
        motivo: z.string().trim().min(3, "Indica o motivo.").max(500),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const { error } = await supabaseAdmin.from("badge_excecoes").insert({
      user_id: data.userId,
      badge_id: data.badgeId,
      program_id: data.programId,
      etapa: data.etapa,
      motivo: data.motivo,
      criado_por: context.userId,
    });
    if (error) throw new Error(error.message);
    await darBadge(data.userId, data.badgeId, context.userId);
    return { ok: true };
  });

export const retirarExcecaoBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ excecaoId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const { data: exc, error } = await supabaseAdmin
      .from("badge_excecoes")
      .update({ retirado_em: new Date().toISOString(), retirado_por: context.userId })
      .eq("id", data.excecaoId)
      .is("retirado_em", null)
      .select("user_id, badge_id, program_id, etapa")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!exc) throw new Error("Exceção não encontrada.");
    // Retira o badge só se a etapa continuar por cumprir.
    const c = exc.program_id ? await condicaoDaEtapa(exc.user_id, exc.program_id, exc.etapa as EtapaBadge) : { cumprida: false };
    if (!c.cumprida) {
      await supabaseAdmin.from("user_badges").delete().eq("user_id", exc.user_id).eq("badge_id", exc.badge_id);
    }
    return { ok: true, badgeRetirado: !c.cumprida };
  });

export const prolongarBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ userId: z.string().uuid(), badgeId: z.string().uuid(), ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("user_badges")
      .update({ expires_at: data.ate ? `${data.ate}T23:59:59Z` : null })
      .eq("user_id", data.userId)
      .eq("badge_id", data.badgeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Sessão Final concluída: fecha o percurso e dá o badge final do programa. */
export const concluirSessaoFinal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ inscricaoProgramaId: z.string().uuid(), concluida: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const { data: insc, error } = await supabaseAdmin
      .from("inscritos_programa")
      .select("id, user_id, status, entidades_programas(program_id)")
      .eq("id", data.inscricaoProgramaId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = insc as unknown as { id: string; user_id: string | null; status: string | null; entidades_programas: { program_id: string | null } | null } | null;
    if (!row?.user_id) throw new Error("Inscrição não encontrada.");
    if (data.concluida && row.status === "desistiu") throw new Error("Este Educador está registado como desistência.");
    const { error: uErr } = await supabaseAdmin
      .from("inscritos_programa")
      .update({ status: data.concluida ? "concluido" : "aprovada" })
      .eq("id", row.id);
    if (uErr) throw new Error(uErr.message);
    const programId = row.entidades_programas?.program_id ?? null;
    const b = programId ? await badgesDoPrograma(programId) : null;
    if (b?.sessao_final.id) {
      if (data.concluida) {
        await darBadge(row.user_id, b.sessao_final.id, context.userId);
        await notificarUtilizadores([row.user_id], "Percurso concluído", "Concluíste a Formação de Educadores Ubuntu. Parabéns!", "/dashboard");
      } else {
        await supabaseAdmin.from("user_badges").delete().eq("user_id", row.user_id).eq("badge_id", b.sessao_final.id);
      }
    }
    return { ok: true, semBadge: !b?.sessao_final.id };
  });
