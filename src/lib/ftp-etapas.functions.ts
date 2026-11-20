import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  avaliarInscricaoFtp,
  emAvisoFimAcesso,
  fimAcessoAnoLetivo,
  formatarDataPt,
  ftcEmAtraso,
  ftpAtiva,
  hojeISO,
  janelaFtc,
  prazoFtc,
  type JanelaFtc,
  type ResultadoInscricaoFtp,
} from "@/lib/ftp-calendario";
import {
  assertEquipaOuAdmin,
  definirInscricaoFtp,
  estadoFtcDosEducadores,
  inscricoesNaFtp,
  notificarContactos,
  notificarUtilizadores,
  utilizadoresComBadge,
} from "@/lib/ftp-calendario.server";

/**
 * Fase 2 — etapas com condição: inscrição na FTP (2.ª semana, com badge da
 * FTC), alertas e desistências, presenças que abrem a Semana Ubuntu.
 * Regras puras em ftp-calendario.ts; estado guardado em inscritos_programa
 * (desistência, prazo extra) e inscritos_acoes (inscrição e presença na FTP).
 */

type ProgramaRegras = {
  id: string;
  title: string | null;
  ftc_curso_id: string | null;
  ftc_atraso_permitido: boolean;
  ftp_dias_decisao: number;
  su_badge_id: string | null;
  fim_acesso: string;
  aviso_fim_acesso_dias: number;
};

const PROGRAMA_COLS =
  "id, title, ftc_curso_id, ftc_atraso_permitido, ftp_dias_decisao, su_badge_id, fim_acesso, aviso_fim_acesso_dias";

// ============== Educador ==============

export interface MinhaFtp {
  inscricao_programa_id: string;
  program_title: string | null;
  escola: string | null;
  estado_programa: string | null;
  ftp: { id: string; start_date: string; localizacao: string | null; formato: string | null; ativa: boolean };
  janela: JanelaFtc;
  prazo_ftc: string;
  ftc: { curso_id: string | null; estado: string | null; concluida_em: string | null; tem_badge: boolean };
  inscricao_ftp: string | null;
  apto_semana_ubuntu: boolean;
  resultado: ResultadoInscricaoFtp;
  /** Fim do ano letivo: último dia de acesso à FTC e à Semana Ubuntu. */
  acesso_ate: string;
  aviso_acesso: boolean;
}

async function carregarMinhasFtp(userId: string): Promise<MinhaFtp[]> {
  const { data: inscricoes, error } = await supabaseAdmin
    .from("inscritos_programa")
    .select("id, status, ftc_prazo_extra_ate, cohort_id, entidades_programas(ftp_acao_id, program_id, entidades(name))")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  type Linha = {
    id: string;
    status: string | null;
    ftc_prazo_extra_ate: string | null;
    entidades_programas: { ftp_acao_id: string | null; program_id: string | null; entidades: { name: string } | null } | null;
  };
  const linhas = ((inscricoes ?? []) as unknown as Linha[]).filter(
    (l) => l.entidades_programas?.ftp_acao_id && l.entidades_programas.program_id,
  );
  if (linhas.length === 0) return [];

  const ftpIds = Array.from(new Set(linhas.map((l) => l.entidades_programas!.ftp_acao_id!)));
  const programIds = Array.from(new Set(linhas.map((l) => l.entidades_programas!.program_id!)));
  const [{ data: ftps }, { data: programas }] = await Promise.all([
    supabaseAdmin.from("acoes").select("id, start_date, localizacao, formato, status").in("id", ftpIds),
    supabaseAdmin.from("programas").select(PROGRAMA_COLS).in("id", programIds),
  ]);
  const ftpMap = new Map((ftps ?? []).map((f) => [f.id, f]));
  const progMap = new Map(((programas ?? []) as ProgramaRegras[]).map((p) => [p.id, p]));
  const hoje = hojeISO();
  const out: MinhaFtp[] = [];

  for (const l of linhas) {
    const ftp = ftpMap.get(l.entidades_programas!.ftp_acao_id!);
    const prog = progMap.get(l.entidades_programas!.program_id!);
    if (!ftp?.start_date || !prog) continue;
    const ftc = prog.ftc_curso_id
      ? (await estadoFtcDosEducadores(prog.ftc_curso_id, [userId])).get(userId) ?? null
      : null;
    const inscricao = (await inscricoesNaFtp(ftp.id, [userId])).get(userId) ?? null;
    const apto = prog.su_badge_id ? (await utilizadoresComBadge(prog.su_badge_id, [userId])).has(userId) : false;
    const inscritoAtivo = !!inscricao && inscricao.status !== "cancelado";
    out.push({
      inscricao_programa_id: l.id,
      program_title: prog.title,
      escola: l.entidades_programas?.entidades?.name ?? null,
      estado_programa: l.status,
      ftp: { id: ftp.id, start_date: ftp.start_date, localizacao: ftp.localizacao, formato: ftp.formato, ativa: ftpAtiva(ftp.status) },
      janela: janelaFtc(ftp.start_date),
      prazo_ftc: prazoFtc(ftp.start_date, prog.ftc_atraso_permitido, l.ftc_prazo_extra_ate),
      ftc: {
        curso_id: prog.ftc_curso_id,
        estado: ftc?.estado ?? null,
        concluida_em: ftc?.concluidaEm ?? null,
        tem_badge: ftc?.temBadge ?? false,
      },
      inscricao_ftp: inscricao?.status ?? null,
      apto_semana_ubuntu: apto,
      acesso_ate: fimAcessoAnoLetivo(ftp.start_date, prog.fim_acesso),
      aviso_acesso: emAvisoFimAcesso(fimAcessoAnoLetivo(ftp.start_date, prog.fim_acesso), prog.aviso_fim_acesso_dias, hoje),
      resultado: avaliarInscricaoFtp({
        hoje,
        ftpData: ftp.start_date,
        ftpAtiva: ftpAtiva(ftp.status),
        estadoPrograma: l.status,
        ftcConcluidaEm: ftc?.concluidaEm ?? null,
        temBadgeFtc: ftc?.temBadge ?? false,
        atrasoPermitido: prog.ftc_atraso_permitido,
        prazoExtraAte: l.ftc_prazo_extra_ate,
        jaInscrito: inscritoAtivo,
      }),
    });
  }
  return out.sort((a, b) => a.ftp.start_date.localeCompare(b.ftp.start_date));
}

export const getMinhaFtp = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => carregarMinhasFtp(context.userId));

export const inscreverNaFtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ inscricaoProgramaId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const item = (await carregarMinhasFtp(context.userId)).find((m) => m.inscricao_programa_id === data.inscricaoProgramaId);
    if (!item) throw new Error("Não encontrámos a tua FTP.");
    if (!item.resultado.pode) throw new Error(item.resultado.motivo);
    await definirInscricaoFtp(item.ftp.id, context.userId, "aceite");
    await notificarUtilizadores(
      [context.userId],
      "Inscrição na FTP confirmada",
      `Estás inscrito na FTP de ${formatarDataPt(item.ftp.start_date)}${item.ftp.localizacao ? ` (${item.ftp.localizacao})` : ""}.`,
      "/dashboard",
    );
    return { ok: true };
  });

// ============== Equipa IPAV: turma de cada FTP ==============

export interface EducadorTurma {
  inscricao_programa_id: string;
  user_id: string;
  nome: string;
  email: string | null;
  escola: string;
  estado_programa: string | null;
  ftc_estado: string | null;
  ftc_concluida_em: string | null;
  ftc_badge: boolean;
  ftc_em_atraso: boolean;
  prazo_extra_ate: string | null;
  inscricao_ftp: string | null;
  apto_semana_ubuntu: boolean;
}

export interface TurmaFtp {
  ftp: { id: string; start_date: string | null; localizacao: string | null; ativa: boolean };
  janela: JanelaFtc | null;
  programa: ProgramaRegras;
  educadores: EducadorTurma[];
}

async function carregarTurma(ftpId: string): Promise<TurmaFtp> {
  const { data: ftp, error } = await supabaseAdmin
    .from("acoes")
    .select("id, start_date, localizacao, status, program_id, action_type")
    .eq("id", ftpId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!ftp || ftp.action_type !== "FTP" || !ftp.program_id) throw new Error("FTP não encontrada.");
  const { data: programa } = await supabaseAdmin.from("programas").select(PROGRAMA_COLS).eq("id", ftp.program_id).single();
  const prog = programa as ProgramaRegras;

  const { data: cohorts } = await supabaseAdmin
    .from("entidades_programas")
    .select("id, entidades(name)")
    .eq("ftp_acao_id", ftpId);
  const escolaDe = new Map(
    ((cohorts ?? []) as unknown as { id: string; entidades: { name: string } | null }[]).map((c) => [c.id, c.entidades?.name ?? "Organização"]),
  );
  const { data: inscritos } = escolaDe.size
    ? await supabaseAdmin
        .from("inscritos_programa")
        .select("id, user_id, status, cohort_id, ftc_prazo_extra_ate, utilizadores(full_name, email)")
        .in("cohort_id", Array.from(escolaDe.keys()))
        .in("status", ["aprovada", "desistiu", "concluido"])
    : { data: [] };
  type Insc = {
    id: string;
    user_id: string | null;
    status: string | null;
    cohort_id: string | null;
    ftc_prazo_extra_ate: string | null;
    utilizadores: { full_name: string | null; email: string | null } | null;
  };
  const lista = ((inscritos ?? []) as unknown as Insc[]).filter((i) => i.user_id);
  const userIds = lista.map((i) => i.user_id!);
  const [ftc, naFtp, aptos] = await Promise.all([
    prog.ftc_curso_id ? estadoFtcDosEducadores(prog.ftc_curso_id, userIds) : Promise.resolve(new Map()),
    inscricoesNaFtp(ftpId, userIds),
    prog.su_badge_id ? utilizadoresComBadge(prog.su_badge_id, userIds) : Promise.resolve(new Set<string>()),
  ]);
  const hoje = hojeISO();

  const educadores: EducadorTurma[] = lista.map((i) => {
    const f = ftc.get(i.user_id!) as { estado: string | null; concluidaEm: string | null; temBadge: boolean } | undefined;
    return {
      inscricao_programa_id: i.id,
      user_id: i.user_id!,
      nome: i.utilizadores?.full_name ?? i.utilizadores?.email ?? "Educador",
      email: i.utilizadores?.email ?? null,
      escola: escolaDe.get(i.cohort_id ?? "") ?? "Organização",
      estado_programa: i.status,
      ftc_estado: f?.estado ?? null,
      ftc_concluida_em: f?.concluidaEm ?? null,
      ftc_badge: f?.temBadge ?? false,
      ftc_em_atraso:
        i.status === "aprovada" && !!ftp.start_date && ftcEmAtraso(ftp.start_date, f?.concluidaEm ?? null, i.ftc_prazo_extra_ate, hoje),
      prazo_extra_ate: i.ftc_prazo_extra_ate,
      inscricao_ftp: naFtp.get(i.user_id!)?.status ?? null,
      apto_semana_ubuntu: aptos.has(i.user_id!),
    };
  });
  educadores.sort((a, b) => a.escola.localeCompare(b.escola, "pt-PT") || a.nome.localeCompare(b.nome, "pt-PT"));

  return {
    ftp: { id: ftp.id, start_date: ftp.start_date, localizacao: ftp.localizacao, ativa: ftpAtiva(ftp.status) },
    janela: ftp.start_date ? janelaFtc(ftp.start_date) : null,
    programa: prog,
    educadores,
  };
}

export const getTurmaFtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ ftpId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    return carregarTurma(data.ftpId);
  });

async function inscricaoComContexto(inscricaoProgramaId: string) {
  const { data, error } = await supabaseAdmin
    .from("inscritos_programa")
    .select("id, user_id, status, cohort_id, entidades_programas(entity_id, ftp_acao_id, program_id), utilizadores(full_name)")
    .eq("id", inscricaoProgramaId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.user_id) throw new Error("Inscrição não encontrada.");
  return data as unknown as {
    id: string;
    user_id: string;
    status: string | null;
    entidades_programas: { entity_id: string | null; ftp_acao_id: string | null; program_id: string | null } | null;
    utilizadores: { full_name: string | null } | null;
  };
}

export const registarDesistencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ inscricaoProgramaId: z.string().uuid(), desistiu: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const insc = await inscricaoComContexto(data.inscricaoProgramaId);
    const status = data.desistiu ? "desistiu" : "aprovada";
    const { error } = await supabaseAdmin.from("inscritos_programa").update({ status }).eq("id", insc.id);
    if (error) throw new Error(error.message);
    const ftpId = insc.entidades_programas?.ftp_acao_id ?? null;
    const nome = insc.utilizadores?.full_name ?? "Um Educador";
    if (data.desistiu) {
      // A etapa seguinte não abre: sai da FTP e perde o acesso à Semana Ubuntu.
      if (ftpId) {
        const atual = (await inscricoesNaFtp(ftpId, [insc.user_id])).get(insc.user_id);
        if (atual && atual.status !== "cancelado") await definirInscricaoFtp(ftpId, insc.user_id, "cancelado");
      }
      await retirarApto(insc.entidades_programas?.program_id ?? null, insc.user_id);
      await notificarContactos(
        insc.entidades_programas?.entity_id ?? null,
        "Desistência registada",
        `${nome} foi registado como desistência no programa. A Semana Ubuntu não abre para este Educador.`,
      );
      await notificarUtilizadores(
        [insc.user_id],
        "Desistência registada",
        "A equipa IPAV registou a tua desistência no programa. Se for um engano, fala com a equipa.",
        null,
      );
    }
    return { ok: true };
  });

export const darMaisTempoFtc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({ inscricaoProgramaId: z.string().uuid(), ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const insc = await inscricaoComContexto(data.inscricaoProgramaId);
    const { error } = await supabaseAdmin
      .from("inscritos_programa")
      .update({ ftc_prazo_extra_ate: data.ate })
      .eq("id", insc.id);
    if (error) throw new Error(error.message);
    if (data.ate) {
      await notificarUtilizadores(
        [insc.user_id],
        "Tens mais tempo para a FTC",
        `A equipa IPAV deu-te até ${formatarDataPt(data.ate)} para concluíres a Formação Teórico-Conceptual.`,
        "/dashboard",
      );
    }
    return { ok: true };
  });

async function retirarApto(programId: string | null, userId: string) {
  if (!programId) return;
  const { data: p } = await supabaseAdmin.from("programas").select("su_badge_id").eq("id", programId).maybeSingle();
  if (p?.su_badge_id) {
    await supabaseAdmin.from("user_badges").delete().eq("user_id", userId).eq("badge_id", p.su_badge_id);
  }
}

/**
 * Presença na FTP. Presente → badge «Apto para a Semana Ubuntu» (abre o
 * bloco no Centro de recursos). Faltou → sem badge e a escola é avisada.
 */
export const marcarPresencaFtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ ftpId: z.string().uuid(), userId: z.string().uuid(), presenca: z.enum(["presente", "faltou", "aceite"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const turma = await carregarTurma(data.ftpId);
    const ed = turma.educadores.find((e) => e.user_id === data.userId);
    if (!ed) throw new Error("Este Educador não pertence a nenhuma escola desta FTP.");
    if (data.presenca === "presente" && ed.estado_programa === "desistiu") {
      throw new Error("Este Educador está registado como desistência. Retira a desistência primeiro.");
    }
    await definirInscricaoFtp(data.ftpId, data.userId, data.presenca);

    const badgeId = turma.programa.su_badge_id;
    if (data.presenca === "presente") {
      if (badgeId) {
        // Válido até ao fim do ano letivo da FTP (fecha a Semana Ubuntu em agosto).
        const ate = turma.ftp.start_date ? fimAcessoAnoLetivo(turma.ftp.start_date, turma.programa.fim_acesso) : null;
        const { error } = await supabaseAdmin
          .from("user_badges")
          .upsert(
            {
              user_id: data.userId,
              badge_id: badgeId,
              granted_by: context.userId,
              granted_at: new Date().toISOString(),
              expires_at: ate ? `${ate}T23:59:59Z` : null,
            },
            { onConflict: "user_id,badge_id" },
          );
        if (error) throw new Error(error.message);
        await notificarUtilizadores(
          [data.userId],
          "A Semana Ubuntu está aberta",
          "Obrigado pela presença na FTP. Já tens acesso ao bloco da Semana Ubuntu no Centro de recursos.",
          "/recursos",
        );
      }
    } else {
      if (badgeId) await supabaseAdmin.from("user_badges").delete().eq("user_id", data.userId).eq("badge_id", badgeId);
      if (data.presenca === "faltou") {
        const { data: cohort } = await supabaseAdmin
          .from("inscritos_programa")
          .select("entidades_programas(entity_id)")
          .eq("id", ed.inscricao_programa_id)
          .maybeSingle();
        await notificarContactos(
          (cohort as unknown as { entidades_programas: { entity_id: string | null } | null } | null)?.entidades_programas?.entity_id ?? null,
          "Falta na FTP",
          `${ed.nome} faltou à FTP de ${formatarDataPt(turma.ftp.start_date)}. A Semana Ubuntu não abre para este Educador.`,
        );
      }
    }
    return { ok: true, semBadge: !badgeId };
  });

export const enviarLembretesFtc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ ftpId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const turma = await carregarTurma(data.ftpId);
    if (!turma.janela) throw new Error("FTP sem data.");
    const alvo = turma.educadores.filter((e) => e.estado_programa === "aprovada" && !e.ftc_concluida_em);
    const prazo = turma.janela.inscricaoFim;
    await notificarUtilizadores(
      alvo.map((e) => e.user_id),
      "Lembrete: conclui a FTC",
      `Ainda não concluíste a Formação Teórico-Conceptual. Precisas dela para te inscreveres na FTP de ${formatarDataPt(turma.janela.ftp)} (até ${formatarDataPt(prazo)}).`,
      turma.programa.ftc_curso_id ? `/elearning/${turma.programa.ftc_curso_id}` : null,
    );
    return { enviados: alvo.length };
  });

export const guardarRegrasPrograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        programId: z.string().uuid(),
        ftc_atraso_permitido: z.boolean(),
        ftp_dias_decisao: z.number().int().min(0).max(120),
        su_badge_id: z.string().uuid().nullable(),
        fim_acesso: z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/, "Dia inválido (MM-DD)"),
        aviso_fim_acesso_dias: z.number().int().min(0).max(120),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("programas")
      .update({
        ftc_atraso_permitido: data.ftc_atraso_permitido,
        ftp_dias_decisao: data.ftp_dias_decisao,
        su_badge_id: data.su_badge_id,
        fim_acesso: data.fim_acesso,
        aviso_fim_acesso_dias: data.aviso_fim_acesso_dias,
      })
      .eq("id", data.programId);
    if (error) throw new Error(error.message);
    // O badge da Semana Ubuntu acompanha o novo fim do ano letivo.
    if (data.su_badge_id) await realinharValidadeSemanaUbuntu(data.programId, data.su_badge_id, data.fim_acesso);
    return { ok: true };
  });

async function realinharValidadeSemanaUbuntu(programId: string, badgeId: string, fim: string) {
  const { data: ftps } = await supabaseAdmin
    .from("acoes")
    .select("id, start_date")
    .eq("program_id", programId)
    .eq("action_type", "FTP")
    .not("start_date", "is", null);
  for (const f of ftps ?? []) {
    const { data: presentes } = await supabaseAdmin
      .from("inscritos_acoes")
      .select("user_id")
      .eq("action_id", f.id)
      .eq("status", "presente");
    const ids = (presentes ?? []).map((p) => p.user_id).filter((id): id is string => !!id);
    if (!ids.length || !f.start_date) continue;
    await supabaseAdmin
      .from("user_badges")
      .update({ expires_at: `${fimAcessoAnoLetivo(f.start_date, fim)}T23:59:59Z` })
      .eq("badge_id", badgeId)
      .in("user_id", ids);
  }
}

// ============== Centro de recursos: bloco Semana Ubuntu ==============

/**
 * Para a interface: o bloco Semana Ubuntu deste cluster está fechado ao
 * utilizador? A base de dados aplica a mesma regra aos recursos
 * (recurso_bloqueado_semana_ubuntu, migração 0011).
 */
export const getBloqueioSemanaUbuntu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clusterId: z.string().uuid().nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    const aberto = { bloqueado: false as boolean, badge: null as string | null };
    if (!data.clusterId) return aberto;
    const [{ data: roles }, { data: user }, { data: programas }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("role_name").eq("user_id", context.userId),
      supabaseAdmin.from("utilizadores").select("role").eq("id", context.userId).maybeSingle(),
      supabaseAdmin
        .from("programas")
        .select("su_badge_id, badges:badges!programas_su_badge_id_fkey(title)")
        .eq("cluster_id", data.clusterId)
        .not("su_badge_id", "is", null),
    ]);
    const tipos = [...(roles ?? []).map((r) => r.role_name), ...(user?.role ? [user.role] : [])];
    if (tipos.some((t) => t !== "Utilizador")) return aberto;
    const lista = (programas ?? []) as unknown as { su_badge_id: string; badges: { title: string } | null }[];
    if (lista.length === 0) return aberto;
    for (const p of lista) {
      if ((await utilizadoresComBadge(p.su_badge_id, [context.userId])).has(context.userId)) return aberto;
    }
    return { bloqueado: true, badge: lista[0].badges?.title ?? "Apto para a Semana Ubuntu" };
  });
