import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { formatarDataPt, janelaFtc } from "@/lib/ftp-calendario";

/**
 * Lógica de servidor do calendário ancorado na FTP.
 *
 * A escolha da FTP vive em entidades_programas.ftp_acao_id. A partir dela,
 * cada Educador aprovado da escola fica inscrito na FTC do programa
 * (programas.ftc_curso_id) na turma dessa FTP (cursos_turmas.ftp_acao_id).
 * As datas de abertura calculam-se sempre a partir da data da FTP.
 */

type FtpRow = {
  id: string;
  start_date: string | null;
  localizacao: string | null;
  max_capacity: number | null;
};

export async function isEquipaOuAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role_name")
    .eq("user_id", userId)
    .in("role_name", ["Admin", "Equipa IPAV"]);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

export async function assertEquipaOuAdmin(userId: string) {
  if (!(await isEquipaOuAdmin(userId))) throw new Error("Acesso restrito.");
}

/** Educadores aprovados por inscrição de escola (entidades_programas.id). */
export async function contarEducadoresPorCohort(cohortIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (cohortIds.length === 0) return out;
  const { data, error } = await supabaseAdmin
    .from("inscritos_programa")
    .select("cohort_id")
    .in("cohort_id", cohortIds)
    .eq("status", "aprovada");
  if (error) throw new Error(error.message);
  for (const r of data ?? []) if (r.cohort_id) out.set(r.cohort_id, (out.get(r.cohort_id) ?? 0) + 1);
  return out;
}

/** Educadores ligados a cada FTP, somando as escolas que a escolheram. */
export async function contarEducadoresPorFtp(ftpIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (ftpIds.length === 0) return out;
  const { data: cohorts, error } = await supabaseAdmin
    .from("entidades_programas")
    .select("id, ftp_acao_id")
    .in("ftp_acao_id", ftpIds);
  if (error) throw new Error(error.message);
  const porCohort = await contarEducadoresPorCohort((cohorts ?? []).map((c) => c.id));
  for (const c of cohorts ?? []) {
    if (!c.ftp_acao_id) continue;
    out.set(c.ftp_acao_id, (out.get(c.ftp_acao_id) ?? 0) + (porCohort.get(c.id) ?? 0));
  }
  return out;
}

function nomeTurma(ftp: FtpRow): string {
  const data = ftp.start_date ? formatarDataPt(ftp.start_date, { day: "2-digit", month: "2-digit", year: "numeric" }) : "sem data";
  return `FTP ${data}${ftp.localizacao ? ` · ${ftp.localizacao}` : ""}`;
}

/**
 * Garante a turma da FTC para uma FTP e mantém as datas alinhadas com a FTP
 * (abre 14 dias antes, termina na véspera). Inscrições por esta via ficam
 * fechadas ao catálogo: só a escolha da escola põe Educadores nesta turma.
 */
export async function garantirTurmaFtc(cursoId: string, ftp: FtpRow): Promise<string> {
  const janela = ftp.start_date ? janelaFtc(ftp.start_date) : null;
  const campos = {
    nome: nomeTurma(ftp),
    data_inicio: janela?.abertura ?? null,
    data_fim: janela?.inscricaoFim ?? null,
    vagas: ftp.max_capacity,
    inscricoes_abertas: false,
  };
  const { data: existente, error } = await supabaseAdmin
    .from("cursos_turmas")
    .select("id")
    .eq("curso_id", cursoId)
    .eq("ftp_acao_id", ftp.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (existente) {
    const { error: uErr } = await supabaseAdmin.from("cursos_turmas").update(campos).eq("id", existente.id);
    if (uErr) throw new Error(uErr.message);
    return existente.id;
  }
  const { data: criada, error: iErr } = await supabaseAdmin
    .from("cursos_turmas")
    .insert({ ...campos, curso_id: cursoId, ftp_acao_id: ftp.id })
    .select("id")
    .single();
  if (iErr) throw new Error(iErr.message);
  return criada.id;
}

async function notificar(userIds: string[], title: string, message: string, link: string | null) {
  const unicos = Array.from(new Set(userIds));
  if (unicos.length === 0) return;
  const { error } = await supabaseAdmin
    .from("notificacoes")
    .insert(unicos.map((user_id) => ({ user_id, title, message, link })));
  if (error) console.error("[ftp-calendario] notificação falhou", error.message);
}

/** Pessoas de contacto (papel Entidade) de uma escola. */
export async function contactosDaEntidade(entityId: string): Promise<string[]> {
  const { data: users } = await supabaseAdmin.from("utilizadores").select("id").eq("entity_id", entityId);
  const ids = (users ?? []).map((u) => u.id);
  if (ids.length === 0) return [];
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .in("user_id", ids)
    .eq("role_name", "Entidade");
  return (roles ?? []).map((r) => r.user_id);
}

export async function notificarContactos(entityId: string | null, title: string, message: string) {
  if (!entityId) return;
  await notificar(await contactosDaEntidade(entityId), title, message, "/entidade/dashboard");
}

/**
 * Põe os Educadores aprovados da escola na turma da FTC da FTP escolhida.
 * Inscrições já concluídas não mudam; as restantes mudam de turma e mantêm o
 * progresso. Sem FTP ou sem FTC configurada no programa, não faz nada.
 *
 * @param userIds limita a sincronização a estes Educadores (ex.: novo inscrito).
 */
export async function sincronizarFtcDaEscola(
  cohortId: string,
  opts: { userIds?: string[]; notificar?: boolean } = {},
): Promise<{ inscritos: number; movidos: number; semFtc: boolean }> {
  const resultado = { inscritos: 0, movidos: 0, semFtc: false };
  const { data: cohort, error } = await supabaseAdmin
    .from("entidades_programas")
    .select("id, program_id, ftp_acao_id")
    .eq("id", cohortId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!cohort?.ftp_acao_id || !cohort.program_id) return resultado;

  const [{ data: programa }, { data: ftp }] = await Promise.all([
    supabaseAdmin.from("programas").select("ftc_curso_id").eq("id", cohort.program_id).maybeSingle(),
    supabaseAdmin
      .from("acoes")
      .select("id, start_date, localizacao, max_capacity")
      .eq("id", cohort.ftp_acao_id)
      .maybeSingle(),
  ]);
  const cursoId = programa?.ftc_curso_id ?? null;
  if (!cursoId || !ftp) return { ...resultado, semFtc: !cursoId };

  const turmaId = await garantirTurmaFtc(cursoId, ftp);

  let q = supabaseAdmin
    .from("inscritos_programa")
    .select("user_id")
    .eq("cohort_id", cohortId)
    .eq("status", "aprovada");
  if (opts.userIds?.length) q = q.in("user_id", opts.userIds);
  const { data: educadores, error: eErr } = await q;
  if (eErr) throw new Error(eErr.message);
  const userIds = Array.from(new Set((educadores ?? []).map((e) => e.user_id).filter((id): id is string => !!id)));
  if (userIds.length === 0) return resultado;

  const { data: inscricoes, error: iErr } = await supabaseAdmin
    .from("cursos_inscricoes")
    .select("id, user_id, turma_id, estado")
    .eq("curso_id", cursoId)
    .in("user_id", userIds)
    .neq("estado", "cancelado");
  if (iErr) throw new Error(iErr.message);
  const porUser = new Map((inscricoes ?? []).map((i) => [i.user_id, i]));

  const alterados: string[] = [];
  for (const userId of userIds) {
    const atual = porUser.get(userId);
    if (!atual) {
      const { error: insErr } = await supabaseAdmin
        .from("cursos_inscricoes")
        .insert({ user_id: userId, curso_id: cursoId, turma_id: turmaId });
      if (insErr) throw new Error(insErr.message);
      resultado.inscritos++;
      alterados.push(userId);
    } else if (atual.estado !== "concluido" && atual.turma_id !== turmaId) {
      const { error: upErr } = await supabaseAdmin
        .from("cursos_inscricoes")
        .update({ turma_id: turmaId })
        .eq("id", atual.id);
      if (upErr) throw new Error(upErr.message);
      resultado.movidos++;
      alterados.push(userId);
    }
  }

  if (opts.notificar !== false && alterados.length && ftp.start_date) {
    const j = janelaFtc(ftp.start_date);
    await notificar(
      alterados,
      "A tua FTC tem data",
      `A Formação Teórico-Conceptual abre a ${formatarDataPt(j.abertura)}. Tens até ${formatarDataPt(j.fimConclusao)} para a concluir; depois inscreves-te na FTP de ${formatarDataPt(j.ftp)}.`,
      `/elearning/${cursoId}`,
    );
  }
  return resultado;
}

/** Volta a sincronizar todas as escolas ligadas a uma FTP (ex.: mudou a data). */
export async function sincronizarFtp(ftpId: string, opts: { notificar?: boolean } = {}) {
  const { data } = await supabaseAdmin.from("entidades_programas").select("id").eq("ftp_acao_id", ftpId);
  for (const c of data ?? []) await sincronizarFtcDaEscola(c.id, opts);
}

/** Data da FTP de cada turma ancorada (para calcular a abertura da FTC). */
export async function datasFtpDasTurmas(turmaIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (turmaIds.length === 0) return out;
  const { data } = await supabaseAdmin
    .from("cursos_turmas")
    .select("id, ftp_acao_id, acoes:acoes!cursos_turmas_ftp_acao_id_fkey(start_date)")
    .in("id", turmaIds)
    .not("ftp_acao_id", "is", null);
  for (const t of (data ?? []) as { id: string; acoes: { start_date: string | null } | null }[]) {
    if (t.acoes?.start_date) out.set(t.id, t.acoes.start_date);
  }
  return out;
}

export async function notificarEducadoresDaFtp(ftpId: string, title: string, message: string) {
  const { data: cohorts } = await supabaseAdmin.from("entidades_programas").select("id").eq("ftp_acao_id", ftpId);
  const ids = (cohorts ?? []).map((c) => c.id);
  if (ids.length === 0) return;
  const { data } = await supabaseAdmin
    .from("inscritos_programa")
    .select("user_id")
    .in("cohort_id", ids)
    .eq("status", "aprovada");
  await notificar((data ?? []).map((r) => r.user_id).filter((id): id is string => !!id), title, message, null);
}
