import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { formatarDataPt } from "@/lib/ftp-calendario";
import { assertEquipaOuAdmin, definirInscricaoFtp, notificarUtilizadores } from "@/lib/ftp-calendario.server";
import { darBadge } from "@/lib/badges-etapas.server";

/**
 * Gestão de uma pessoa, etapa a etapa, a partir da ficha da jornada
 * (/admin/jornada). Só a equipa IPAV. Complementa as ações que já existiam
 * (aprovar, presença, prazo extra, Sessão Final, desistência).
 */

type Contexto = {
  inscricaoId: string;
  userId: string;
  cohortId: string;
  programId: string;
  ftcCursoId: string | null;
  ftpId: string | null;
};

async function carregarContexto(inscricaoProgramaId: string): Promise<Contexto> {
  const { data, error } = await supabaseAdmin
    .from("inscritos_programa")
    .select("id, user_id, cohort_id, entidades_programas(id, program_id, ftp_acao_id, programas(ftc_curso_id))")
    .eq("id", inscricaoProgramaId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const c = (data as unknown as {
    id: string;
    user_id: string | null;
    entidades_programas: { id: string; program_id: string | null; ftp_acao_id: string | null; programas: { ftc_curso_id: string | null } | null } | null;
  } | null);
  if (!c?.user_id || !c.entidades_programas?.program_id) throw new Error("Inscrição não encontrada.");
  return {
    inscricaoId: c.id,
    userId: c.user_id,
    cohortId: c.entidades_programas.id,
    programId: c.entidades_programas.program_id,
    ftcCursoId: c.entidades_programas.programas?.ftc_curso_id ?? null,
    ftpId: c.entidades_programas.ftp_acao_id,
  };
}

/**
 * Marca a FTC como concluída pela equipa (ou desfaz). Conclui a inscrição no
 * curso, dá o badge final do curso e regista a exceção com o motivo, para a
 * jornada a mostrar como «Por decisão da equipa».
 */
export const marcarFtcPelaEquipa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        inscricaoProgramaId: z.string().uuid(),
        concluida: z.boolean(),
        motivo: z.string().trim().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const ctx = await carregarContexto(data.inscricaoProgramaId);
    if (!ctx.ftcCursoId) throw new Error("Este programa ainda não tem FTC definida no calendário.");
    const { data: curso } = await supabaseAdmin.from("cursos").select("badge_final_id").eq("id", ctx.ftcCursoId).maybeSingle();
    const badgeId = curso?.badge_final_id ?? null;
    const { data: insc } = await supabaseAdmin
      .from("cursos_inscricoes")
      .select("id, iniciado_em")
      .eq("user_id", ctx.userId)
      .eq("curso_id", ctx.ftcCursoId)
      .maybeSingle();

    if (data.concluida) {
      const motivo = data.motivo?.trim();
      if (!motivo || motivo.length < 3) throw new Error("Indica o motivo.");
      const agora = new Date().toISOString();
      const { error } = insc
        ? await supabaseAdmin.from("cursos_inscricoes").update({ estado: "concluido", concluido_em: agora }).eq("id", insc.id)
        : await supabaseAdmin
            .from("cursos_inscricoes")
            .insert({ user_id: ctx.userId, curso_id: ctx.ftcCursoId, estado: "concluido", concluido_em: agora });
      if (error) throw new Error(error.message);
      if (badgeId) {
        await supabaseAdmin.from("badge_excecoes").insert({
          user_id: ctx.userId,
          badge_id: badgeId,
          program_id: ctx.programId,
          etapa: "ftc",
          motivo,
          criado_por: context.userId,
        });
        await darBadge(ctx.userId, badgeId, context.userId);
      }
      await notificarUtilizadores(
        [ctx.userId],
        "FTC concluída",
        "A equipa IPAV marcou a tua Formação Teórico-Conceptual como concluída. Já te podes inscrever na FTP.",
        "/dashboard",
      );
      return { ok: true };
    }

    if (insc) {
      const { error } = await supabaseAdmin
        .from("cursos_inscricoes")
        .update({ estado: insc.iniciado_em ? "em_curso" : "inscrito", concluido_em: null })
        .eq("id", insc.id);
      if (error) throw new Error(error.message);
    }
    if (badgeId) {
      await supabaseAdmin.from("user_badges").delete().eq("user_id", ctx.userId).eq("badge_id", badgeId);
      await supabaseAdmin
        .from("badge_excecoes")
        .update({ retirado_em: new Date().toISOString(), retirado_por: context.userId })
        .eq("user_id", ctx.userId)
        .eq("badge_id", badgeId)
        .eq("program_id", ctx.programId)
        .is("retirado_em", null);
    }
    return { ok: true };
  });

/**
 * Inscreve (ou retira) a pessoa na FTP da sua escola, pela equipa. Não aplica
 * as condições do próprio Educador (2.ª semana, badge da FTC): é uma decisão
 * da equipa.
 */
export const inscreverNaFtpPelaEquipa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ inscricaoProgramaId: z.string().uuid(), inscrito: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const ctx = await carregarContexto(data.inscricaoProgramaId);
    if (!ctx.ftpId) throw new Error("A escola ainda não escolheu a FTP.");
    const { data: atual } = await supabaseAdmin
      .from("inscritos_acoes")
      .select("status")
      .eq("action_id", ctx.ftpId)
      .eq("user_id", ctx.userId)
      .maybeSingle();
    if (!data.inscrito && atual?.status === "presente") {
      throw new Error("A presença já está marcada. Retira a presença primeiro.");
    }
    await definirInscricaoFtp(ctx.ftpId, ctx.userId, data.inscrito ? "aceite" : "cancelado");
    if (data.inscrito) {
      const { data: ftp } = await supabaseAdmin.from("acoes").select("start_date, localizacao").eq("id", ctx.ftpId).maybeSingle();
      await notificarUtilizadores(
        [ctx.userId],
        "Inscrição na FTP confirmada",
        `A equipa IPAV inscreveu-te na FTP${ftp?.start_date ? ` de ${formatarDataPt(ftp.start_date)}` : ""}${ftp?.localizacao ? ` (${ftp.localizacao})` : ""}.`,
        "/dashboard",
      );
    }
    return { ok: true };
  });
