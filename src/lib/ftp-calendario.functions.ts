import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { INSCRICOES_FECHADAS } from "@/lib/acoes-opcoes";
import {
  FTP_MAX_EDUCADORES,
  FTP_MIN_EDUCADORES,
  cabeNaFtp,
  disponivelParaEscola,
  escolhaAbertaParaEscola,
  estadoVagas,
  formatarDataPt,
  ftpAtiva,
  ftpEscolhivelPelaEscola,
  hojeISO,
  janelaFtc,
  vagasRestantes,
  type EstadoVagasFtp,
} from "@/lib/ftp-calendario";
import {
  assertEquipaOuAdmin,
  contarEducadoresPorCohort,
  contarEducadoresPorFtp,
  isEquipaOuAdmin,
  notificarContactos,
  notificarEducadoresDaFtp,
  sincronizarFtcDaEscola,
  sincronizarFtp,
} from "@/lib/ftp-calendario.server";

export type TipoData = "FTP" | "SU";

type DataRow = {
  id: string;
  action_type: string | null;
  program_id: string | null;
  start_date: string | null;
  end_date: string | null;
  localizacao: string | null;
  formato: string | null;
  status: string;
  min_capacity: number | null;
  max_capacity: number | null;
  acoes_projetos: { project_id: string }[] | null;
};

const DATA_COLS =
  "id, action_type, program_id, start_date, end_date, localizacao, formato, status, min_capacity, max_capacity, acoes_projetos(project_id)";

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

async function carregarDatasDoPrograma(programIds: string[]): Promise<DataRow[]> {
  if (programIds.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from("acoes")
    .select(DATA_COLS)
    .in("program_id", programIds)
    .in("action_type", ["FTP", "SU"])
    .is("entity_id", null)
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DataRow[];
}

async function carregarData(id: string): Promise<DataRow | null> {
  const { data, error } = await supabaseAdmin.from("acoes").select(`${DATA_COLS}, entity_id`).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || (data as { entity_id: string | null }).entity_id) return null;
  return data as unknown as DataRow;
}

async function escolasPorSlotSu(slotIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (slotIds.length === 0) return out;
  const { data } = await supabaseAdmin.from("entidades_programas").select("su_acao_id").in("su_acao_id", slotIds);
  for (const r of data ?? []) if (r.su_acao_id) out.set(r.su_acao_id, (out.get(r.su_acao_id) ?? 0) + 1);
  return out;
}

async function projetosDasEntidades(entityIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (entityIds.length === 0) return out;
  const { data, error } = await supabaseAdmin
    .from("entidades_projetos")
    .select("entity_id, project_id")
    .in("entity_id", entityIds)
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  for (const r of data ?? []) out.set(r.entity_id, [...(out.get(r.entity_id) ?? []), r.project_id]);
  return out;
}

function projetosDe(row: DataRow): string[] {
  return (row.acoes_projetos ?? []).map((p) => p.project_id);
}

function descreverData(row: Pick<DataRow, "start_date" | "localizacao">): string {
  return `${formatarDataPt(row.start_date)}${row.localizacao ? ` (${row.localizacao})` : ""}`;
}

// ============== Escola (pessoa de contacto) ==============

async function entidadeDoPedido(userId: string, entityId: string | undefined): Promise<{ entityId: string | null; equipa: boolean }> {
  const equipa = await isEquipaOuAdmin(userId);
  if (entityId) {
    if (!equipa) throw new Error("Apenas a equipa IPAV pode escolher a organização.");
    return { entityId, equipa };
  }
  const { data, error } = await supabaseAdmin.from("utilizadores").select("entity_id").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return { entityId: data?.entity_id ?? null, equipa };
}

export interface OpcaoData {
  id: string;
  start_date: string | null;
  end_date: string | null;
  localizacao: string | null;
  formato: string | null;
  /** FTP: Educadores; Semana Ubuntu: escolas. */
  ocupacao: number;
  max: number | null;
  min: number | null;
  vagas_restantes: number | null;
  disponivel: boolean;
  motivo: string | null;
  ativa: boolean;
}

export interface CalendarioEscolaItem {
  cohort_id: string;
  program_id: string | null;
  program_title: string | null;
  educadores: number;
  ftc_configurada: boolean;
  ftp: (OpcaoData & { ftc: ReturnType<typeof janelaFtc> | null }) | null;
  su: OpcaoData | null;
  pode_mudar_ftp: boolean;
  opcoes_ftp: OpcaoData[];
  opcoes_su: OpcaoData[];
}

export const getCalendarioEscola = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ entityId: z.string().uuid().optional() }).optional().transform((v) => v ?? {}).parse(i))
  .handler(async ({ data, context }): Promise<CalendarioEscolaItem[]> => {
    const { entityId } = await entidadeDoPedido(context.userId, data.entityId);
    if (!entityId) return [];

    const { data: cohorts, error } = await supabaseAdmin
      .from("entidades_programas")
      .select("id, program_id, is_active, ftp_acao_id, su_acao_id, programas(title, ftc_curso_id)")
      .eq("entity_id", entityId)
      .eq("status", "aprovada");
    if (error) throw new Error(error.message);
    const ativos = (cohorts ?? []).filter((c) => c.is_active !== false);
    if (ativos.length === 0) return [];

    const programIds = Array.from(new Set(ativos.map((c) => c.program_id).filter((id): id is string => !!id)));
    const [datas, projetosEscola, educadoresPorCohort] = await Promise.all([
      carregarDatasDoPrograma(programIds),
      projetosDasEntidades([entityId]),
      contarEducadoresPorCohort(ativos.map((c) => c.id)),
    ]);
    const meusProjetos = projetosEscola.get(entityId) ?? [];
    const ftps = datas.filter((d) => d.action_type === "FTP");
    const slots = datas.filter((d) => d.action_type === "SU");
    const [educadoresPorFtp, escolasPorSlot] = await Promise.all([
      contarEducadoresPorFtp(ftps.map((f) => f.id)),
      escolasPorSlotSu(slots.map((s) => s.id)),
    ]);
    const hoje = hojeISO();

    return ativos.map((c) => {
      const educadores = educadoresPorCohort.get(c.id) ?? 0;
      const prog = c.programas as { title: string | null; ftc_curso_id: string | null } | null;

      const toOpcao = (d: DataRow, tipo: TipoData, escolhida: boolean): OpcaoData => {
        const ocupacaoBruta = tipo === "FTP" ? educadoresPorFtp.get(d.id) ?? 0 : escolasPorSlot.get(d.id) ?? 0;
        // Para ver as vagas que sobram para esta escola, não conta a própria escolha.
        const semEsta = escolhida ? ocupacaoBruta - (tipo === "FTP" ? educadores : 1) : ocupacaoBruta;
        const precisa = tipo === "FTP" ? educadores : 1;
        let motivo: string | null = null;
        if (!ftpAtiva(d.status)) motivo = "Cancelada";
        else if (!d.start_date) motivo = "Sem data";
        else if (tipo === "FTP" && !ftpEscolhivelPelaEscola(d.start_date, hoje)) motivo = "A FTC desta data já abriu";
        else if (tipo === "SU" && d.start_date < hoje) motivo = "Já passou";
        else if (!disponivelParaEscola(projetosDe(d), meusProjetos)) motivo = "Não é do vosso projeto";
        else if (!cabeNaFtp(semEsta, precisa, d.max_capacity)) motivo = "Sem vagas";
        return {
          id: d.id,
          start_date: d.start_date,
          end_date: d.end_date,
          localizacao: d.localizacao,
          formato: d.formato,
          ocupacao: ocupacaoBruta,
          max: d.max_capacity,
          min: d.min_capacity,
          vagas_restantes: vagasRestantes(semEsta, d.max_capacity),
          disponivel: motivo === null,
          motivo,
          ativa: ftpAtiva(d.status),
        };
      };

      const doPrograma = (lista: DataRow[]) => lista.filter((d) => d.program_id === c.program_id);
      const ftpRow = c.ftp_acao_id ? ftps.find((f) => f.id === c.ftp_acao_id) ?? null : null;
      const suRow = c.su_acao_id ? slots.find((s) => s.id === c.su_acao_id) ?? null : null;
      const ftp = ftpRow ? toOpcao(ftpRow, "FTP", true) : null;

      return {
        cohort_id: c.id,
        program_id: c.program_id,
        program_title: prog?.title ?? null,
        educadores,
        ftc_configurada: !!prog?.ftc_curso_id,
        ftp: ftp ? { ...ftp, ftc: ftpRow?.start_date ? janelaFtc(ftpRow.start_date) : null } : null,
        su: suRow ? toOpcao(suRow, "SU", true) : null,
        pode_mudar_ftp: escolhaAbertaParaEscola(ftpRow?.start_date ?? null, hoje),
        opcoes_ftp: doPrograma(ftps)
          .filter((f) => ftpAtiva(f.status) && (!f.start_date || f.start_date >= hoje))
          .map((f) => toOpcao(f, "FTP", f.id === c.ftp_acao_id)),
        opcoes_su: doPrograma(slots)
          .filter((s) => ftpAtiva(s.status) && (!s.start_date || s.start_date >= hoje))
          .map((s) => toOpcao(s, "SU", s.id === c.su_acao_id)),
      };
    });
  });

const escolherSchema = z.object({
  cohortId: z.string().uuid(),
  ftpId: z.string().uuid().nullable().optional(),
  suId: z.string().uuid().nullable().optional(),
});

export const escolherCalendarioEscola = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => escolherSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: cohort, error } = await supabaseAdmin
      .from("entidades_programas")
      .select("id, entity_id, program_id, status, ftp_acao_id, su_acao_id")
      .eq("id", data.cohortId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cohort || cohort.status !== "aprovada") throw new Error("Inscrição no programa não encontrada.");

    const { entityId, equipa } = await entidadeDoPedido(userId, undefined);
    if (!equipa && cohort.entity_id !== entityId) throw new Error("Sem acesso a esta inscrição.");

    const hoje = hojeISO();
    const projetos = cohort.entity_id ? (await projetosDasEntidades([cohort.entity_id])).get(cohort.entity_id) ?? [] : [];
    const educadores = (await contarEducadoresPorCohort([cohort.id])).get(cohort.id) ?? 0;
    const update: {
      ftp_acao_id?: string | null;
      su_acao_id?: string | null;
      ftp_escolhida_em?: string;
      ftp_escolhida_por?: string;
    } = {};
    let ftpEscolhida: DataRow | null = cohort.ftp_acao_id ? await carregarData(cohort.ftp_acao_id) : null;

    if (data.ftpId !== undefined && data.ftpId !== cohort.ftp_acao_id) {
      const atualAtiva = !!ftpEscolhida && ftpAtiva(ftpEscolhida.status);
      if (!equipa && atualAtiva && !escolhaAbertaParaEscola(ftpEscolhida?.start_date ?? null, hoje)) {
        throw new Error("A FTC desta data já abriu. Para mudar de FTP, fala com a equipa IPAV.");
      }
      if (data.ftpId) {
        const ftp = await carregarData(data.ftpId);
        if (!ftp || ftp.action_type !== "FTP" || ftp.program_id !== cohort.program_id) throw new Error("FTP inválida para este programa.");
        if (!ftpAtiva(ftp.status) || !ftp.start_date) throw new Error("Esta FTP já não está disponível.");
        if (!equipa && !ftpEscolhivelPelaEscola(ftp.start_date, hoje)) throw new Error("A FTC desta data já abriu. Escolhe outra FTP.");
        if (ftp.start_date < hoje) throw new Error("Esta FTP já passou.");
        if (!disponivelParaEscola(projetosDe(ftp), projetos)) throw new Error("Esta FTP não está aberta ao vosso projeto.");
        const ocupacao = (await contarEducadoresPorFtp([ftp.id])).get(ftp.id) ?? 0;
        if (!equipa && !cabeNaFtp(ocupacao, educadores, ftp.max_capacity)) {
          throw new Error(`Esta FTP só tem ${vagasRestantes(ocupacao, ftp.max_capacity)} vagas e a escola tem ${educadores} Educadores. Escolhe outra data.`);
        }
        ftpEscolhida = ftp;
      } else {
        ftpEscolhida = null;
      }
      update.ftp_acao_id = data.ftpId;
      update.ftp_escolhida_em = new Date().toISOString();
      update.ftp_escolhida_por = userId;
    }

    if (data.suId !== undefined && data.suId !== cohort.su_acao_id) {
      if (data.suId) {
        const su = await carregarData(data.suId);
        if (!su || su.action_type !== "SU" || su.program_id !== cohort.program_id) throw new Error("Semana Ubuntu inválida para este programa.");
        if (!ftpAtiva(su.status) || !su.start_date || su.start_date < hoje) throw new Error("Esta Semana Ubuntu já não está disponível.");
        if (!disponivelParaEscola(projetosDe(su), projetos)) throw new Error("Esta Semana Ubuntu não está aberta ao vosso projeto.");
        if (ftpEscolhida?.start_date && su.start_date <= ftpEscolhida.start_date) {
          throw new Error("A Semana Ubuntu tem de ser depois da FTP.");
        }
        const escolas = (await escolasPorSlotSu([su.id])).get(su.id) ?? 0;
        if (!equipa && !cabeNaFtp(escolas, 1, su.max_capacity)) throw new Error("Esta Semana Ubuntu já não tem vagas.");
      }
      update.su_acao_id = data.suId;
    }

    if (Object.keys(update).length === 0) return { ok: true, sincronizacao: null };

    const { error: uErr } = await supabaseAdmin.from("entidades_programas").update(update).eq("id", cohort.id);
    if (uErr) throw new Error(uErr.message);
    const sincronizacao = update.ftp_acao_id ? await sincronizarFtcDaEscola(cohort.id) : null;
    return { ok: true, sincronizacao };
  });

// ============== Equipa IPAV ==============

export interface DataPrograma {
  id: string;
  tipo: TipoData;
  start_date: string | null;
  end_date: string | null;
  localizacao: string | null;
  formato: string | null;
  status: string;
  min: number | null;
  max: number | null;
  projetos: string[];
  ocupacao: number;
  estado_vagas: EstadoVagasFtp;
  ftc_abre: string | null;
  dias_para: number | null;
  escolas: { cohort_id: string; entity_name: string; educadores: number }[];
}

export interface CalendarioPrograma {
  programa: { id: string; title: string | null; ftc_curso_id: string | null };
  cursos: { id: string; title: string; estado: string; do_programa: boolean }[];
  projetos: { id: string; title: string }[];
  ftps: DataPrograma[];
  slots_su: DataPrograma[];
  escolas: {
    cohort_id: string;
    entity_name: string;
    educadores: number;
    projetos: string[];
    ftp_acao_id: string | null;
    su_acao_id: string | null;
  }[];
}

export const getCalendarioPrograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ programId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<CalendarioPrograma> => {
    await assertEquipaOuAdmin(context.userId);
    const [{ data: programa, error: pErr }, { data: cursos }, { data: projetos }, datas, { data: cohorts, error: cErr }] =
      await Promise.all([
        supabaseAdmin.from("programas").select("id, title, ftc_curso_id").eq("id", data.programId).maybeSingle(),
        supabaseAdmin.from("cursos").select("id, title, estado, program_id").neq("estado", "arquivado").order("title"),
        supabaseAdmin.from("projetos").select("id, title").order("title"),
        carregarDatasDoPrograma([data.programId]),
        supabaseAdmin
          .from("entidades_programas")
          .select("id, entity_id, is_active, ftp_acao_id, su_acao_id, entidades(name)")
          .eq("program_id", data.programId)
          .eq("status", "aprovada"),
      ]);
    if (pErr) throw new Error(pErr.message);
    if (cErr) throw new Error(cErr.message);
    if (!programa) throw new Error("Programa não encontrado.");

    const ativos = (cohorts ?? []).filter((c) => c.is_active !== false);
    const [educadores, projetosEsc] = await Promise.all([
      contarEducadoresPorCohort(ativos.map((c) => c.id)),
      projetosDasEntidades(ativos.map((c) => c.entity_id).filter((id): id is string => !!id)),
    ]);
    const escolas = ativos.map((c) => ({
      cohort_id: c.id,
      entity_name: (c.entidades as { name: string } | null)?.name ?? "Organização",
      educadores: educadores.get(c.id) ?? 0,
      projetos: c.entity_id ? projetosEsc.get(c.entity_id) ?? [] : [],
      ftp_acao_id: c.ftp_acao_id,
      su_acao_id: c.su_acao_id,
    }));
    escolas.sort((a, b) => a.entity_name.localeCompare(b.entity_name, "pt-PT"));
    const hoje = hojeISO();

    const toData = (d: DataRow): DataPrograma => {
      const tipo = d.action_type === "SU" ? "SU" : "FTP";
      const lig = escolas.filter((e) => (tipo === "FTP" ? e.ftp_acao_id : e.su_acao_id) === d.id);
      const ocupacao = tipo === "FTP" ? lig.reduce((n, e) => n + e.educadores, 0) : lig.length;
      return {
        id: d.id,
        tipo,
        start_date: d.start_date,
        end_date: d.end_date,
        localizacao: d.localizacao,
        formato: d.formato,
        status: d.status,
        min: d.min_capacity,
        max: d.max_capacity,
        projetos: projetosDe(d),
        ocupacao,
        estado_vagas: estadoVagas(ocupacao, tipo === "FTP" ? d.min_capacity : null, d.max_capacity),
        ftc_abre: tipo === "FTP" && d.start_date ? janelaFtc(d.start_date).abertura : null,
        dias_para: d.start_date
          ? Math.round((Date.parse(`${d.start_date}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000)
          : null,
        escolas: lig.map((e) => ({ cohort_id: e.cohort_id, entity_name: e.entity_name, educadores: e.educadores })),
      };
    };

    return {
      programa,
      cursos: (cursos ?? [])
        .map((c) => ({ id: c.id, title: c.title, estado: c.estado, do_programa: c.program_id === data.programId }))
        .sort((a, b) => Number(b.do_programa) - Number(a.do_programa)),
      projetos: projetos ?? [],
      ftps: datas.filter((d) => d.action_type === "FTP").map(toData),
      slots_su: datas.filter((d) => d.action_type === "SU").map(toData),
      escolas,
    };
  });

const guardarDataSchema = z
  .object({
    programId: z.string().uuid(),
    tipo: z.enum(["FTP", "SU"]),
    id: z.string().uuid().optional(),
    start_date: dataISO,
    end_date: dataISO.nullable().optional(),
    localizacao: z.string().trim().max(200).nullable().optional(),
    formato: z.enum(["Presencial", "Online"]).nullable().optional(),
    min: z.number().int().min(0).max(500).nullable().optional(),
    max: z.number().int().min(1).max(500).nullable().optional(),
    projetoIds: z.array(z.string().uuid()).max(100).default([]),
  })
  .refine((d) => !d.end_date || d.end_date >= d.start_date, {
    message: "A data de fim tem de ser igual ou posterior à de início.",
    path: ["end_date"],
  })
  .refine((d) => d.min == null || d.max == null || d.min <= d.max, {
    message: "O mínimo não pode ser maior que o máximo.",
    path: ["min"],
  });

export const guardarDataPrograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => guardarDataSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const { data: programa } = await supabaseAdmin.from("programas").select("title").eq("id", data.programId).maybeSingle();
    if (!programa) throw new Error("Programa não encontrado.");

    const campos = {
      title: `${data.tipo === "FTP" ? "FTP" : "Semana Ubuntu"} · ${programa.title ?? "Programa"}`,
      action_type: data.tipo,
      program_id: data.programId,
      entity_id: null,
      start_date: data.start_date,
      end_date: data.end_date ?? data.start_date,
      localizacao: data.localizacao?.trim() || null,
      formato: data.formato ?? null,
      min_capacity: data.tipo === "FTP" ? data.min ?? FTP_MIN_EDUCADORES : null,
      max_capacity: data.max ?? (data.tipo === "FTP" ? FTP_MAX_EDUCADORES : null),
      // As inscrições na FTP (com o badge da FTC) chegam na fase seguinte;
      // até lá a data não aparece na agenda nem aceita inscrições diretas.
      registration_status: INSCRICOES_FECHADAS,
      visibilidade: "projetos",
    };

    let id = data.id;
    let dataAnterior: string | null = null;
    if (id) {
      const existente = await carregarData(id);
      if (!existente || existente.program_id !== data.programId || existente.action_type !== data.tipo) {
        throw new Error("Data não encontrada neste programa.");
      }
      dataAnterior = existente.start_date;
      const { error } = await supabaseAdmin.from("acoes").update(campos).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data: criada, error } = await supabaseAdmin
        .from("acoes")
        .insert({ ...campos, status: "Marcada", created_by: context.userId })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = criada.id;
    }

    const { error: dErr } = await supabaseAdmin.from("acoes_projetos").delete().eq("action_id", id);
    if (dErr) throw new Error(dErr.message);
    if (data.projetoIds.length) {
      const { error: iErr } = await supabaseAdmin
        .from("acoes_projetos")
        .insert(Array.from(new Set(data.projetoIds)).map((project_id) => ({ action_id: id!, project_id })));
      if (iErr) throw new Error(iErr.message);
    }

    if (data.tipo === "FTP" && data.id) {
      // Mantém nome, vagas e datas da turma da FTC alinhados com a FTP.
      await sincronizarFtp(id, { notificar: false });
      if (dataAnterior && dataAnterior !== data.start_date) {
        const j = janelaFtc(data.start_date);
        await notificarEducadoresDaFtp(
          id,
          "A data da tua FTP mudou",
          `A FTP passou para ${formatarDataPt(j.ftp)}. A FTC abre a ${formatarDataPt(j.abertura)}.`,
        );
        const { data: cohorts } = await supabaseAdmin.from("entidades_programas").select("entity_id").eq("ftp_acao_id", id);
        for (const c of cohorts ?? []) {
          await notificarContactos(c.entity_id, "A data da FTP mudou", `A FTP da escola passou para ${formatarDataPt(j.ftp)}.`);
        }
      }
    }
    return { id };
  });

export const definirFtcPrograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ programId: z.string().uuid(), cursoId: z.string().uuid().nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const { error } = await supabaseAdmin.from("programas").update({ ftc_curso_id: data.cursoId }).eq("id", data.programId);
    if (error) throw new Error(error.message);
    if (!data.cursoId) return { escolas: 0 };
    const { data: cohorts } = await supabaseAdmin
      .from("entidades_programas")
      .select("id")
      .eq("program_id", data.programId)
      .not("ftp_acao_id", "is", null);
    for (const c of cohorts ?? []) await sincronizarFtcDaEscola(c.id);
    return { escolas: (cohorts ?? []).length };
  });

export const moverEscolaData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ cohortId: z.string().uuid(), tipo: z.enum(["FTP", "SU"]), destinoId: z.string().uuid().nullable() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const { data: cohort } = await supabaseAdmin
      .from("entidades_programas")
      .select("id, entity_id, program_id")
      .eq("id", data.cohortId)
      .maybeSingle();
    if (!cohort) throw new Error("Inscrição não encontrada.");
    let destino: DataRow | null = null;
    if (data.destinoId) {
      destino = await carregarData(data.destinoId);
      if (!destino || destino.action_type !== data.tipo || destino.program_id !== cohort.program_id) {
        throw new Error("Data inválida para este programa.");
      }
      if (!ftpAtiva(destino.status)) throw new Error("Essa data está cancelada.");
    }
    const { error } = await supabaseAdmin
      .from("entidades_programas")
      .update(
        data.tipo === "FTP"
          ? { ftp_acao_id: data.destinoId, ftp_escolhida_em: new Date().toISOString(), ftp_escolhida_por: context.userId }
          : { su_acao_id: data.destinoId },
      )
      .eq("id", cohort.id);
    if (error) throw new Error(error.message);
    if (data.tipo === "FTP" && data.destinoId) await sincronizarFtcDaEscola(cohort.id);
    const nome = data.tipo === "FTP" ? "FTP" : "Semana Ubuntu";
    await notificarContactos(
      cohort.entity_id,
      `A ${nome} da escola mudou`,
      destino
        ? `A equipa IPAV passou a escola para a ${nome} de ${descreverData(destino)}.`
        : `A equipa IPAV retirou a escola da ${nome}. Escolham uma nova data na página da organização.`,
    );
    let acimaDoMaximo = false;
    if (destino && data.tipo === "FTP") {
      const ocupacao = (await contarEducadoresPorFtp([destino.id])).get(destino.id) ?? 0;
      acimaDoMaximo = destino.max_capacity != null && ocupacao > destino.max_capacity;
    }
    return { ok: true, acimaDoMaximo };
  });

/**
 * Cancela uma FTP ou slot de Semana Ubuntu. Com destino, junta as escolas
 * nessa data; sem destino, as escolas voltam a escolher.
 */
export const cancelarDataPrograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid(), destinoId: z.string().uuid().nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertEquipaOuAdmin(context.userId);
    const origem = await carregarData(data.id);
    if (!origem || (origem.action_type !== "FTP" && origem.action_type !== "SU")) throw new Error("Data não encontrada.");
    const tipo = origem.action_type as TipoData;
    let destino: DataRow | null = null;
    if (data.destinoId) {
      if (data.destinoId === data.id) throw new Error("Escolhe outra data para juntar.");
      destino = await carregarData(data.destinoId);
      if (!destino || destino.action_type !== tipo || destino.program_id !== origem.program_id || !ftpAtiva(destino.status)) {
        throw new Error("Data de destino inválida.");
      }
    }
    const coluna = tipo === "FTP" ? "ftp_acao_id" : "su_acao_id";
    const { data: cohorts, error: cErr } = await supabaseAdmin
      .from("entidades_programas")
      .select("id, entity_id")
      .eq(coluna, data.id);
    if (cErr) throw new Error(cErr.message);

    const { error: uErr } = await supabaseAdmin
      .from("entidades_programas")
      .update(tipo === "FTP" ? { ftp_acao_id: data.destinoId } : { su_acao_id: data.destinoId })
      .eq(coluna, data.id);
    if (uErr) throw new Error(uErr.message);
    const { error: aErr } = await supabaseAdmin.from("acoes").update({ status: "Cancelada" }).eq("id", data.id);
    if (aErr) throw new Error(aErr.message);

    const nome = tipo === "FTP" ? "FTP" : "Semana Ubuntu";
    for (const c of cohorts ?? []) {
      if (tipo === "FTP" && destino) await sincronizarFtcDaEscola(c.id);
      await notificarContactos(
        c.entity_id,
        `A ${nome} de ${formatarDataPt(origem.start_date)} foi cancelada`,
        destino
          ? `A escola passou para a ${nome} de ${descreverData(destino)}.`
          : `Escolham uma nova data na página da organização.`,
      );
    }
    return { escolas: (cohorts ?? []).length };
  });
