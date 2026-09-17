import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertRouteAccess } from "@/lib/admin-access.server";

async function assertAdmin(userId: string) {
  await assertRouteAccess(userId, "/admin/programas");
}


export const PROGRAMA_STATUS = [
  "Não começado",
  "Ativo",
  "Terminado",
  "Arquivado",
] as const;

export type ProgramaAdminRow = {
  id: string;
  title: string | null;
  is_active: boolean | null;
  enrollment_open: boolean | null;
  cluster_id: string | null;
  status: string | null;
  date_start: string | null;
  date_end: string | null;
  certificacao: boolean | null;
  acreditacao: boolean | null;
  email_contacto_ipav: string | null;
  produto_ids: string[];
};

const PROGRAMA_SELECT =
  "id, title, is_active, enrollment_open, cluster_id, status, date_start, date_end, certificacao, acreditacao, email_contacto_ipav, programas_produtos(produto_id)";

function mapPrograma(r: Record<string, unknown>): ProgramaAdminRow {
  const { programas_produtos: links, ...rest } = r as Record<string, unknown> & {
    programas_produtos?: Array<{ produto_id: string }> | null;
  };
  return {
    ...(rest as Omit<ProgramaAdminRow, "produto_ids">),
    produto_ids: (links ?? []).map((l) => l.produto_id),
  };
}

export const listProgramas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("programas")
      .select(PROGRAMA_SELECT)
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapPrograma(r as Record<string, unknown>));
  });

const toggleEnrollmentSchema = z.object({
  programId: z.string().uuid(),
  open: z.boolean(),
});

export const setProgramaEnrollmentOpen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => toggleEnrollmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("programas")
      .update({ enrollment_open: data.open })
      .eq("id", data.programId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const programaFieldsSchema = {
  cluster_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
  status: z.enum(PROGRAMA_STATUS).optional(),
  date_start: z.string().nullable().optional(),
  date_end: z.string().nullable().optional(),
  certificacao: z.boolean().optional(),
  acreditacao: z.boolean().optional(),
  email_contacto_ipav: z.string().max(255).nullable().optional(),
  produto_ids: z.array(z.string().uuid()).optional(),
};

const updateProgramaSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  ...programaFieldsSchema,
});

async function syncProdutos(programId: string, produtoIds: string[]) {
  const { error: delErr } = await supabaseAdmin
    .from("programas_produtos")
    .delete()
    .eq("program_id", programId);
  if (delErr) throw new Error(delErr.message);
  if (produtoIds.length === 0) return;
  const { error } = await supabaseAdmin
    .from("programas_produtos")
    .insert(produtoIds.map((produto_id) => ({ program_id: programId, produto_id })));
  if (error) throw new Error(error.message);
}

export const updateProgramaAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateProgramaSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: {
      title?: string;
      cluster_id?: string | null;
      is_active?: boolean;
      status?: string;
      date_start?: string | null;
      date_end?: string | null;
      certificacao?: boolean;
      acreditacao?: boolean;
      email_contacto_ipav?: string | null;
    } = {};
    if (data.title !== undefined) patch.title = data.title.trim();
    if (data.cluster_id !== undefined) patch.cluster_id = data.cluster_id;
    if (data.status !== undefined) {
      patch.status = data.status;
      patch.is_active = data.status === "Ativo";
    }
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    if (data.date_start !== undefined) patch.date_start = data.date_start || null;
    if (data.date_end !== undefined) patch.date_end = data.date_end || null;
    if (data.certificacao !== undefined) patch.certificacao = data.certificacao;
    if (data.acreditacao !== undefined) patch.acreditacao = data.acreditacao;
    if (data.email_contacto_ipav !== undefined) {
      patch.email_contacto_ipav = data.email_contacto_ipav || null;
    }
    if (Object.keys(patch).length > 0) {
      const { error } = await supabaseAdmin.from("programas").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
    }
    if (data.produto_ids) await syncProdutos(data.id, data.produto_ids);
    return { ok: true };
  });


/** Elimina um programa, bloqueando quando há dependências reais. */
export const deletePrograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: cohorts, error: cErr } = await supabaseAdmin
      .from("entidades_programas")
      .select("id")
      .eq("program_id", data.id);
    if (cErr) throw new Error(cErr.message);
    const cohortIds = (cohorts ?? []).map((c) => c.id);

    if (cohortIds.length > 0) {
      const { count, error: iErr } = await supabaseAdmin
        .from("inscritos_programa")
        .select("id", { count: "exact", head: true })
        .in("cohort_id", cohortIds);
      if (iErr) throw new Error(iErr.message);
      if ((count ?? 0) > 0) {
        throw new Error(
          `Este programa tem ${count} inscrição(ões) de participantes. Remove-as antes de eliminar o programa.`,
        );
      }
    }

    const { count: acoesCount, error: aErr } = await supabaseAdmin
      .from("acoes")
      .select("id", { count: "exact", head: true })
      .eq("program_id", data.id);
    if (aErr) throw new Error(aErr.message);
    if ((acoesCount ?? 0) > 0) {
      throw new Error(
        `Este programa tem ${acoesCount} ação(ões) associada(s). Desassocia-as antes de eliminar o programa.`,
      );
    }

    if (cohortIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("entidades_programas")
        .delete()
        .eq("program_id", data.id);
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("programas_produtos").delete().eq("program_id", data.id);

    const { error } = await supabaseAdmin.from("programas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


// ===== Clusters management (scoped to programas admin) =====

export const listClustersWithProgramas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: clusters, error: cErr } = await supabaseAdmin
      .from("clusters")
      .select("id, name, description, cover_url, cover_position, cover_scale, sort_order, info_pdf_url, formando_badge_id, final_badge_id")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (cErr) throw new Error(cErr.message);

    const { data: programs, error: pErr } = await supabaseAdmin
      .from("programas")
      .select("id, title, is_active, enrollment_open, cluster_id")
      .order("title", { ascending: true });
    if (pErr) throw new Error(pErr.message);

    return (clusters ?? []).map((c) => ({
      ...c,
      programs: (programs ?? [])
        .filter((p) => p.cluster_id === c.id)
        .sort((a, b) => {
          const av = a.is_active ? 0 : 1;
          const bv = b.is_active ? 0 : 1;
          if (av !== bv) return av - bv;
          return (a.title ?? "").localeCompare(b.title ?? "");
        }),
    }));
  });

const clusterUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  cover_url: z.string().max(1024).nullable().optional(),
  cover_position: z.string().max(32).nullable().optional(),
  cover_scale: z.number().min(1).max(4).nullable().optional(),
  info_pdf_url: z.string().max(1024).nullable().optional(),
  formando_badge_id: z.string().uuid().nullable().optional(),
  final_badge_id: z.string().uuid().nullable().optional(),
});

export const upsertClusterAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => clusterUpsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const payload: {
      name: string;
      description?: string | null;
      cover_url?: string | null;
      cover_position?: string;
      cover_scale?: number;
      info_pdf_url?: string | null;
      formando_badge_id?: string | null;
      final_badge_id?: string | null;
    } = { name: data.name.trim() };
    if (data.description !== undefined) payload.description = data.description;
    if (data.cover_url !== undefined) payload.cover_url = data.cover_url;
    if (data.cover_position !== undefined) payload.cover_position = data.cover_position ?? "50% 50%";
    if (data.cover_scale !== undefined) payload.cover_scale = data.cover_scale ?? 1;
    if (data.info_pdf_url !== undefined) payload.info_pdf_url = data.info_pdf_url;
    if (data.formando_badge_id !== undefined) payload.formando_badge_id = data.formando_badge_id;
    if (data.final_badge_id !== undefined) payload.final_badge_id = data.final_badge_id;

    if (data.id) {
      const { error } = await supabaseAdmin.from("clusters").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("clusters")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

const bulkClustersSchema = z.object({
  names: z.array(z.string().min(1).max(255)).min(1).max(100),
});

export const bulkCreateClusters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => bulkClustersSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const rows = data.names.map((n) => ({ name: n.trim() })).filter((r) => r.name.length > 0);
    if (rows.length === 0) return { ok: true, inserted: 0 };
    const { error } = await supabaseAdmin.from("clusters").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, inserted: rows.length };
  });

const clusterIdSchema = z.object({ id: z.string().uuid() });

export const deleteClusterAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => clusterIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("clusters").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Programas creation =====

const createProgramaSchema = z.object({
  title: z.string().min(1).max(255),
  ...programaFieldsSchema,
});

export const createPrograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createProgramaSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const status = data.status ?? "Não começado";
    const { data: row, error } = await supabaseAdmin
      .from("programas")
      .insert({
        title: data.title.trim(),
        cluster_id: data.cluster_id ?? null,
        status,
        date_start: data.date_start || null,
        date_end: data.date_end || null,
        certificacao: data.certificacao ?? false,
        acreditacao: data.acreditacao ?? false,
        email_contacto_ipav: data.email_contacto_ipav || null,
        is_active: data.is_active ?? status === "Ativo",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (data.produto_ids?.length) await syncProdutos(row.id, data.produto_ids);
    return { ok: true, id: row.id };
  });


const bulkProgramasSchema = z.object({
  cluster_id: z.string().uuid(),
  titles: z.array(z.string().min(1).max(255)).min(1).max(100),
});

export const bulkCreateProgramas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => bulkProgramasSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const rows = data.titles
      .map((t) => ({ title: t.trim(), cluster_id: data.cluster_id, is_active: true }))
      .filter((r) => r.title.length > 0);
    if (rows.length === 0) return { ok: true, inserted: 0 };
    const { error } = await supabaseAdmin.from("programas").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, inserted: rows.length };
  });


const programIdSchema = z.object({ programId: z.string().uuid() });

export const listProgramaEntidades = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => programIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: cohorts, error } = await supabaseAdmin
      .from("entidades_programas")
      .select("id, entity_id, is_active, created_at, entidades(id, name, locality, status)")
      .eq("program_id", data.programId);
    if (error) throw new Error(error.message);
    return (cohorts ?? []).map((c) => ({
      cohort_id: c.id,
      entity_id: c.entity_id,
      is_active: c.is_active,
      created_at: c.created_at,
      entity_name: c.entidades?.name ?? "—",
      entity_locality: c.entidades?.locality ?? null,
      entity_status: c.entidades?.status ?? null,
    }));
  });

export const listProgramaParticipantes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => programIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: cohorts, error: cErr } = await supabaseAdmin
      .from("entidades_programas")
      .select("id, entidades(name)")
      .eq("program_id", data.programId);
    if (cErr) throw new Error(cErr.message);

    const cohortIds = (cohorts ?? []).map((c) => c.id);
    if (cohortIds.length === 0) return [];
    const cohortToEntity = new Map(
      (cohorts ?? []).map((c) => [c.id, c.entidades?.name ?? "—"]),
    );

    const { data: enrolls, error: eErr } = await supabaseAdmin
      .from("inscritos_programa")
      .select("id, status, created_at, cohort_id, user_id, utilizadores(full_name)")
      .in("cohort_id", cohortIds)
      .order("created_at", { ascending: false });
    if (eErr) throw new Error(eErr.message);

    const userIds = Array.from(
      new Set((enrolls ?? []).map((e) => e.user_id).filter((v): v is string => !!v)),
    );
    const emailMap = new Map<string, string>();
    await Promise.all(
      userIds.map(async (uid) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (u?.user?.email) emailMap.set(uid, u.user.email);
      }),
    );

    return (enrolls ?? []).map((e) => ({
      id: e.id,
      status: e.status,
      created_at: e.created_at,
      full_name: e.utilizadores?.full_name ?? "—",
      email: e.user_id ? emailMap.get(e.user_id) ?? null : null,
      entity_name: cohortToEntity.get(e.cohort_id ?? "") ?? "—",
    }));
  });
