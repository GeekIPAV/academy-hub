import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { formatarDataPt } from "@/lib/ftp-calendario";
import { isEquipaOuAdmin, notificarEquipa } from "@/lib/ftp-calendario.server";

/**
 * Semana Ubuntu e replicações (Fase 3, passo 10): a escola envia o Excel dos
 * alunos e descarrega o modelo de autorização dos Encarregados de Educação;
 * a equipa IPAV é avisada para preparar o material. Os ficheiros vivem no
 * bucket privado 'semana-ubuntu' e só se abrem com links assinados.
 */

const BUCKET = "semana-ubuntu";
const SLUG_DOCUMENTOS = "semana-ubuntu-documentos";
const TIPOS_REPLICACAO = ["Semana Ubuntu"];

export interface DocumentosSemanaUbuntu {
  autorizacao_url: string | null;
  autorizacao_nome: string | null;
  excel_url: string | null;
  excel_nome: string | null;
}

const VAZIO: DocumentosSemanaUbuntu = { autorizacao_url: null, autorizacao_nome: null, excel_url: null, excel_nome: null };

export const getDocumentosSemanaUbuntu = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<DocumentosSemanaUbuntu> => {
    const { data } = await supabaseAdmin.from("paginas_conteudo").select("content").eq("slug", SLUG_DOCUMENTOS).maybeSingle();
    return { ...VAZIO, ...((data?.content ?? {}) as Partial<DocumentosSemanaUbuntu>) };
  });

const urlOpcional = z.string().trim().url().max(1000).nullable();

export const guardarDocumentosSemanaUbuntu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        autorizacao_url: urlOpcional,
        autorizacao_nome: z.string().trim().max(200).nullable(),
        excel_url: urlOpcional,
        excel_nome: z.string().trim().max(200).nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    if (!(await isEquipaOuAdmin(context.userId))) throw new Error("Acesso restrito.");
    const { error } = await supabaseAdmin
      .from("paginas_conteudo")
      .upsert({ slug: SLUG_DOCUMENTOS, content: data, updated_by: context.userId, updated_at: new Date().toISOString() }, { onConflict: "slug" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const alvoSchema = z
  .object({ cohortId: z.string().uuid().optional(), acaoId: z.string().uuid().optional() })
  .refine((d) => !!d.cohortId !== !!d.acaoId, { message: "Indica a inscrição no programa ou a ação." });

type Alvo = { entityId: string; cohortId: string | null; acaoId: string | null; descricao: string; dataSemana: string | null; linkEquipa: string };

/** Valida o acesso e descreve a Semana Ubuntu (da formação ou replicação). */
async function resolverAlvo(userId: string, alvo: z.infer<typeof alvoSchema>): Promise<Alvo & { equipa: boolean }> {
  const equipa = await isEquipaOuAdmin(userId);
  const { data: user } = await supabaseAdmin.from("utilizadores").select("entity_id").eq("id", userId).maybeSingle();
  const minha = user?.entity_id ?? null;

  if (alvo.cohortId) {
    const { data: c, error } = await supabaseAdmin
      .from("entidades_programas")
      .select("id, entity_id, su_acao_id, programas(title), entidades(name), su:acoes!entidades_programas_su_acao_id_fkey(start_date)")
      .eq("id", alvo.cohortId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = c as unknown as {
      id: string;
      entity_id: string | null;
      programas: { title: string | null } | null;
      entidades: { name: string } | null;
      su: { start_date: string | null } | null;
    } | null;
    if (!row?.entity_id) throw new Error("Inscrição não encontrada.");
    if (!equipa && row.entity_id !== minha) throw new Error("Sem acesso a esta inscrição.");
    return {
      equipa,
      entityId: row.entity_id,
      cohortId: row.id,
      acaoId: null,
      descricao: `${row.entidades?.name ?? "Escola"} · ${row.programas?.title ?? "Programa"}`,
      dataSemana: row.su?.start_date ?? null,
      linkEquipa: "/equipa/programas",
    };
  }

  const { data: a, error } = await supabaseAdmin
    .from("acoes")
    .select("id, entity_id, action_type, start_date, title, entidades(name)")
    .eq("id", alvo.acaoId!)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const acao = a as unknown as { id: string; entity_id: string | null; action_type: string | null; start_date: string | null; title: string | null; entidades: { name: string } | null } | null;
  if (!acao?.entity_id || !TIPOS_REPLICACAO.includes(acao.action_type ?? "")) throw new Error("Ação de Semana Ubuntu não encontrada.");
  if (!equipa && acao.entity_id !== minha) throw new Error("Sem acesso a esta ação.");
  return {
    equipa,
    entityId: acao.entity_id,
    cohortId: null,
    acaoId: acao.id,
    descricao: `${acao.entidades?.name ?? "Escola"} · ${acao.title ?? "Semana Ubuntu"}`,
    dataSemana: acao.start_date,
    linkEquipa: `/admin/acoes/${acao.id}`,
  };
}

export interface EnvioAlunos {
  id: string;
  ficheiro_nome: string;
  enviado_em: string;
}

export const listarEnviosAlunos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => alvoSchema.parse(i))
  .handler(async ({ data, context }): Promise<EnvioAlunos[]> => {
    const alvo = await resolverAlvo(context.userId, data);
    let q = supabaseAdmin.from("semana_ubuntu_alunos").select("id, ficheiro_nome, enviado_em").order("enviado_em", { ascending: false });
    q = alvo.cohortId ? q.eq("cohort_id", alvo.cohortId) : q.eq("acao_id", alvo.acaoId!);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

function nomeSeguro(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-120);
}

const EXTENSOES = /\.(xlsx|xls|csv|ods)$/i;

export const pedirUploadAlunos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({ cohortId: z.string().uuid().optional(), acaoId: z.string().uuid().optional(), nome: z.string().trim().min(1).max(200) })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    if (!EXTENSOES.test(data.nome)) throw new Error("Envia uma folha de cálculo (.xlsx, .xls, .csv ou .ods).");
    const alvo = await resolverAlvo(context.userId, { cohortId: data.cohortId, acaoId: data.acaoId });
    const path = `${alvo.entityId}/${alvo.cohortId ?? alvo.acaoId}/${Date.now()}-${nomeSeguro(data.nome)}`;
    const { data: up, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !up) throw new Error(error?.message ?? "Não foi possível preparar o envio.");
    return { path, token: up.token };
  });

export const confirmarEnvioAlunos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        cohortId: z.string().uuid().optional(),
        acaoId: z.string().uuid().optional(),
        path: z.string().min(1).max(400),
        nome: z.string().trim().min(1).max(200),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const alvo = await resolverAlvo(context.userId, { cohortId: data.cohortId, acaoId: data.acaoId });
    const prefixo = `${alvo.entityId}/${alvo.cohortId ?? alvo.acaoId}/`;
    if (!data.path.startsWith(prefixo) || data.path.includes("..")) throw new Error("Ficheiro inválido.");
    const { error } = await supabaseAdmin.from("semana_ubuntu_alunos").insert({
      entity_id: alvo.entityId,
      cohort_id: alvo.cohortId,
      acao_id: alvo.acaoId,
      ficheiro_path: data.path,
      ficheiro_nome: data.nome,
      enviado_por: context.userId,
    });
    if (error) throw new Error(error.message);
    await notificarEquipa(
      "Dados dos alunos recebidos",
      `${alvo.descricao} enviou o Excel dos alunos para a Semana Ubuntu${alvo.dataSemana ? ` de ${formatarDataPt(alvo.dataSemana)}` : ""}. Já podem preparar o material.`,
      alvo.linkEquipa,
    );
    return { ok: true };
  });

export const urlEnvioAlunos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row } = await supabaseAdmin
      .from("semana_ubuntu_alunos")
      .select("ficheiro_path, cohort_id, acao_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Ficheiro não encontrado.");
    await resolverAlvo(context.userId, row.cohort_id ? { cohortId: row.cohort_id } : { acaoId: row.acao_id! });
    const { data: signed, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(row.ficheiro_path, 60 * 10);
    if (error || !signed) throw new Error(error?.message ?? "Não foi possível abrir o ficheiro.");
    return { url: signed.signedUrl };
  });
