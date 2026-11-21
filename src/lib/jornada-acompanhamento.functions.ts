import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fimAcessoAnoLetivo, ftpAtiva, hojeISO, janelaFtc, type JanelaFtc } from "@/lib/ftp-calendario";
import { assertEquipaOuAdmin, notificarUtilizadores } from "@/lib/ftp-calendario.server";
import { calcularFase, type FaseCalculada } from "@/lib/jornada-fases";
import { badgesDoPrograma } from "@/lib/badges-etapas.server";
import { ETAPAS_BADGE, expiraAntes, type EtapaBadge } from "@/lib/badges-etapas";

export interface BadgeDaLinha {
  etapa: EtapaBadge;
  badge_id: string;
  titulo: string;
  tem: boolean;
  expira_em: string | null;
  excecao: { id: string; motivo: string; criado_em: string } | null;
}

/**
 * Acompanhamento da jornada (/admin/jornada): onde está cada Educador, o que
 * tem de acontecer a seguir e quem tem de agir. Lê tudo em lotes e calcula a
 * fase com calcularFase (jornada-fases.ts).
 */

export interface LinhaAcompanhamento extends FaseCalculada {
  inscricao_programa_id: string;
  user_id: string;
  nome: string;
  email: string | null;
  escola: string;
  cohort_id: string;
  program_id: string;
  program_title: string | null;
  estado_programa: string | null;
  ftp: { id: string; start_date: string | null; localizacao: string | null; ativa: boolean } | null;
  janela: JanelaFtc | null;
  ftc: { curso_id: string | null; estado: string | null; concluida_em: string | null; badge: boolean };
  inscricao_ftp: string | null;
  apto_semana_ubuntu: boolean;
  prazo_extra_ate: string | null;
  fim_acesso: string | null;
  badges: BadgeDaLinha[];
  /** Um badge que a pessoa tem acaba antes do fim do acesso. */
  aviso_badge: string | null;
}

export interface Acompanhamento {
  programas: { id: string; title: string | null }[];
  ftps: { id: string; program_id: string | null; start_date: string | null; localizacao: string | null }[];
  linhas: LinhaAcompanhamento[];
  gerado_em: string;
}

function lotes<T>(arr: T[], n = 150): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function emLotes<T, R>(ids: T[], fn: (lote: T[]) => Promise<R[]>): Promise<R[]> {
  const out: R[] = [];
  for (const l of lotes(ids)) out.push(...(await fn(l)));
  return out;
}

type Programa = {
  id: string;
  title: string | null;
  ftc_curso_id: string | null;
  ftc_atraso_permitido: boolean;
  su_badge_id: string | null;
  fim_acesso: string;
  renovacao_ativa: boolean;
};

async function carregarAcompanhamento(programId: string | null): Promise<Acompanhamento> {
  const pq = supabaseAdmin
    .from("programas")
    .select("id, title, ftc_curso_id, ftc_atraso_permitido, su_badge_id, fim_acesso, renovacao_ativa, is_active")
    .order("title");
  const { data: todosProgramas, error: pErr } = await pq;
  if (pErr) throw new Error(pErr.message);
  const programasAtivos = (todosProgramas ?? []).filter((p) => p.is_active !== false) as unknown as Programa[];
  const programas = programId ? programasAtivos.filter((p) => p.id === programId) : programasAtivos;
  const progMap = new Map(programas.map((p) => [p.id, p]));
  const vazio: Acompanhamento = {
    programas: programasAtivos.map((p) => ({ id: p.id, title: p.title })),
    ftps: [],
    linhas: [],
    gerado_em: new Date().toISOString(),
  };
  if (programas.length === 0) return vazio;

  const { data: cohorts, error: cErr } = await supabaseAdmin
    .from("entidades_programas")
    .select("id, entity_id, program_id, ftp_acao_id, is_active, entidades(name)")
    .in("program_id", programas.map((p) => p.id))
    .eq("status", "aprovada");
  if (cErr) throw new Error(cErr.message);
  const ativos = ((cohorts ?? []) as unknown as {
    id: string;
    entity_id: string | null;
    program_id: string | null;
    ftp_acao_id: string | null;
    is_active: boolean | null;
    entidades: { name: string } | null;
  }[]).filter((c) => c.is_active !== false && c.program_id);
  const cohortMap = new Map(ativos.map((c) => [c.id, c]));
  if (ativos.length === 0) return vazio;

  type Insc = {
    id: string;
    user_id: string | null;
    status: string | null;
    cohort_id: string | null;
    ftc_prazo_extra_ate: string | null;
    utilizadores: { full_name: string | null; email: string | null } | null;
  };
  const inscricoes = (await emLotes(ativos.map((c) => c.id), async (l) => {
    const { data, error } = await supabaseAdmin
      .from("inscritos_programa")
      .select("id, user_id, status, cohort_id, ftc_prazo_extra_ate, utilizadores(full_name, email)")
      .in("cohort_id", l)
      .in("status", ["aprovada", "lista_espera", "pendente", "desistiu", "concluido"]);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Insc[];
  })).filter((i) => i.user_id && i.cohort_id);

  const userIds = Array.from(new Set(inscricoes.map((i) => i.user_id!)));
  const ftpIds = Array.from(new Set(ativos.map((c) => c.ftp_acao_id).filter((id): id is string => !!id)));
  const cursoIds = Array.from(new Set(programas.map((p) => p.ftc_curso_id).filter((id): id is string => !!id)));

  const [{ data: ftps }, { data: cursos }, { data: todasFtpsPrograma }] = await Promise.all([
    ftpIds.length
      ? supabaseAdmin.from("acoes").select("id, start_date, localizacao, status").in("id", ftpIds)
      : Promise.resolve({ data: [] as { id: string; start_date: string | null; localizacao: string | null; status: string }[] }),
    cursoIds.length
      ? supabaseAdmin.from("cursos").select("id, badge_final_id").in("id", cursoIds)
      : Promise.resolve({ data: [] as { id: string; badge_final_id: string | null }[] }),
    supabaseAdmin
      .from("acoes")
      .select("id, program_id, start_date, localizacao, status")
      .in("program_id", programas.map((p) => p.id))
      .eq("action_type", "FTP")
      .is("entity_id", null)
      .order("start_date"),
  ]);
  const ftpMap = new Map((ftps ?? []).map((f) => [f.id, f]));
  const badgeFtcDe = new Map((cursos ?? []).map((c) => [c.id, c.badge_final_id]));

  const badgesProg = new Map(
    await Promise.all(programas.map(async (p) => [p.id, await badgesDoPrograma(p.id)] as const)),
  );
  const badgeIds = Array.from(
    new Set([
      ...(cursos ?? []).map((c) => c.badge_final_id),
      ...programas.map((p) => p.su_badge_id),
      ...Array.from(badgesProg.values()).flatMap((b) => Object.values(b).map((x) => x.id)),
    ].filter((id): id is string => !!id)),
  );
  const [{ data: badgeTitulos }, excecoes] = await Promise.all([
    badgeIds.length
      ? supabaseAdmin.from("badges").select("id, title").in("id", badgeIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    emLotes(userIds, async (l) => {
      const { data } = await supabaseAdmin
        .from("badge_excecoes")
        .select("id, user_id, badge_id, program_id, etapa, motivo, criado_em")
        .in("user_id", l)
        .is("retirado_em", null);
      return data ?? [];
    }),
  ]);
  const tituloBadge = new Map((badgeTitulos ?? []).map((b) => [b.id, b.title]));
  const excecaoDe = new Map(excecoes.map((x) => [`${x.user_id}:${x.badge_id}:${x.program_id}`, x]));

  const [ftcInsc, badges, naFtp] = await Promise.all([
    cursoIds.length
      ? emLotes(userIds, async (l) => {
          const { data } = await supabaseAdmin
            .from("cursos_inscricoes")
            .select("user_id, curso_id, estado, concluido_em")
            .in("curso_id", cursoIds)
            .in("user_id", l)
            .neq("estado", "cancelado");
          return data ?? [];
        })
      : Promise.resolve([] as { user_id: string; curso_id: string; estado: string; concluido_em: string | null }[]),
    badgeIds.length
      ? emLotes(userIds, async (l) => {
          const { data } = await supabaseAdmin
            .from("user_badges")
            .select("user_id, badge_id, expires_at")
            .in("badge_id", badgeIds)
            .in("user_id", l);
          return data ?? [];
        })
      : Promise.resolve([] as { user_id: string; badge_id: string; expires_at: string | null }[]),
    ftpIds.length
      ? emLotes(userIds, async (l) => {
          const { data } = await supabaseAdmin
            .from("inscritos_acoes")
            .select("user_id, action_id, status")
            .in("action_id", ftpIds)
            .in("user_id", l);
          return data ?? [];
        })
      : Promise.resolve([] as { user_id: string | null; action_id: string | null; status: string | null }[]),
  ]);

  const agora = Date.now();
  const temBadge = new Set(
    badges.filter((b) => !b.expires_at || Date.parse(b.expires_at) > agora).map((b) => `${b.user_id}:${b.badge_id}`),
  );
  const expiraDe = new Map(badges.map((b) => [`${b.user_id}:${b.badge_id}`, b.expires_at]));
  const ftcDe = new Map(ftcInsc.map((i) => [`${i.user_id}:${i.curso_id}`, i]));
  const ftpDe = new Map(naFtp.map((i) => [`${i.user_id}:${i.action_id}`, i.status]));
  const hoje = hojeISO();

  const linhas: LinhaAcompanhamento[] = inscricoes.map((i) => {
    const cohort = cohortMap.get(i.cohort_id!)!;
    const prog = progMap.get(cohort.program_id!)!;
    const ftpRow = cohort.ftp_acao_id ? ftpMap.get(cohort.ftp_acao_id) ?? null : null;
    const cursoId = prog.ftc_curso_id;
    const ftcI = cursoId ? ftcDe.get(`${i.user_id}:${cursoId}`) ?? null : null;
    const concluida = ftcI?.estado === "concluido";
    const badgeFtc = cursoId ? badgeFtcDe.get(cursoId) ?? null : null;
    const ftcBadge = badgeFtc ? temBadge.has(`${i.user_id}:${badgeFtc}`) : concluida;
    const inscricaoFtp = ftpRow ? ftpDe.get(`${i.user_id}:${ftpRow.id}`) ?? null : null;
    const apto = prog.su_badge_id ? temBadge.has(`${i.user_id}:${prog.su_badge_id}`) : false;
    const fimAcesso = ftpRow?.start_date ? fimAcessoAnoLetivo(ftpRow.start_date, prog.fim_acesso) : null;
    const bp = badgesProg.get(prog.id);
    const badgesLinha: BadgeDaLinha[] = bp
      ? ETAPAS_BADGE.filter((e) => bp[e.id].id).map((e) => {
          const id = bp[e.id].id!;
          const exc = excecaoDe.get(`${i.user_id}:${id}:${prog.id}`) ?? null;
          return {
            etapa: e.id,
            badge_id: id,
            titulo: tituloBadge.get(id) ?? "Badge",
            tem: temBadge.has(`${i.user_id}:${id}`),
            expira_em: expiraDe.get(`${i.user_id}:${id}`) ?? null,
            excecao: exc ? { id: exc.id, motivo: exc.motivo, criado_em: exc.criado_em } : null,
          };
        })
      : [];
    const aExpirar = i.status === "concluido" ? null : badgesLinha.find((b) => b.tem && expiraAntes(b.expira_em, fimAcesso));
    const excecaoSu = badgesLinha.find((b) => b.etapa === "presenca_ftp" && b.excecao && b.tem);
    const fase = calcularFase({
      hoje,
      estadoPrograma: i.status,
      ftpData: ftpRow?.start_date ?? null,
      ftpAtiva: ftpRow ? ftpAtiva(ftpRow.status) : false,
      ftcConfigurada: !!cursoId,
      ftcEstado: ftcI?.estado ?? null,
      ftcConcluidaEm: concluida ? (ftcI?.concluido_em ?? hoje).slice(0, 10) : null,
      inscricaoFtp: inscricaoFtp === "cancelado" ? null : inscricaoFtp,
      aptoSemanaUbuntu: apto,
      prazoExtraAte: i.ftc_prazo_extra_ate,
      atrasoPermitido: prog.ftc_atraso_permitido,
      fimAcesso,
      excecaoSemanaUbuntu: !!excecaoSu,
      renovacaoAtiva: prog.renovacao_ativa,
    });
    return {
      ...fase,
      inscricao_programa_id: i.id,
      user_id: i.user_id!,
      nome: i.utilizadores?.full_name ?? i.utilizadores?.email ?? "Educador",
      email: i.utilizadores?.email ?? null,
      escola: cohort.entidades?.name ?? "Organização",
      cohort_id: cohort.id,
      program_id: prog.id,
      program_title: prog.title,
      estado_programa: i.status,
      ftp: ftpRow ? { id: ftpRow.id, start_date: ftpRow.start_date, localizacao: ftpRow.localizacao, ativa: ftpAtiva(ftpRow.status) } : null,
      janela: ftpRow?.start_date ? janelaFtc(ftpRow.start_date) : null,
      ftc: { curso_id: cursoId, estado: ftcI?.estado ?? null, concluida_em: concluida ? (ftcI?.concluido_em ?? null) : null, badge: ftcBadge },
      inscricao_ftp: inscricaoFtp,
      apto_semana_ubuntu: apto,
      prazo_extra_ate: i.ftc_prazo_extra_ate,
      fim_acesso: fimAcesso,
      badges: badgesLinha,
      aviso_badge: aExpirar && fimAcesso
        ? `«${aExpirar.titulo}» acaba a ${aExpirar.expira_em!.slice(0, 10).split("-").reverse().join("/")}, antes do fim do acesso (${fimAcesso.split("-").reverse().join("/")}).`
        : null,
    };
  });
  linhas.sort((a, b) => Number(b.alerta) - Number(a.alerta) || a.escola.localeCompare(b.escola, "pt-PT") || a.nome.localeCompare(b.nome, "pt-PT"));

  return {
    programas: programasAtivos.map((p) => ({ id: p.id, title: p.title })),
    ftps: (todasFtpsPrograma ?? [])
      .filter((f) => ftpAtiva(f.status))
      .map((f) => ({ id: f.id, program_id: f.program_id, start_date: f.start_date, localizacao: f.localizacao })),
    linhas,
    gerado_em: new Date().toISOString(),
  };
}

export const getAcompanhamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ programId: z.string().uuid().nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    return carregarAcompanhamento(data.programId);
  });

/** Envia a cada Educador escolhido o seu próximo passo (só quando é ele que tem de agir). */
export const lembrarEducadores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ programId: z.string().uuid().nullable(), inscricaoIds: z.array(z.string().uuid()).min(1).max(500) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const { linhas } = await carregarAcompanhamento(data.programId);
    const escolhidos = new Set(data.inscricaoIds);
    let enviados = 0;
    for (const l of linhas) {
      if (!escolhidos.has(l.inscricao_programa_id) || l.quem !== "Educador") continue;
      await notificarUtilizadores([l.user_id], "O teu próximo passo na formação", l.proximo, "/dashboard");
      enviados++;
    }
    return { enviados, ignorados: data.inscricaoIds.length - enviados };
  });
