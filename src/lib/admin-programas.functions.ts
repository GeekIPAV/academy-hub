import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertRouteAccess } from "@/lib/admin-access.server";

async function assertAdmin(userId: string) {
  await assertRouteAccess(userId, "/admin/programas");
}


export const listProgramas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("programas")
      .select("id, title, is_active, enrollment_open, cluster_id")
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
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

const updateProgramaSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  cluster_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const updateProgramaAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateProgramaSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: { title?: string; cluster_id?: string | null; is_active?: boolean } = {};
    if (data.title !== undefined) patch.title = data.title.trim();
    if (data.cluster_id !== undefined) patch.cluster_id = data.cluster_id;
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin.from("programas").update(patch).eq("id", data.id);
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
      .select("id, name, description, cover_url, cover_position, cover_scale, sort_order")
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
    } = { name: data.name.trim() };
    if (data.description !== undefined) payload.description = data.description;
    if (data.cover_url !== undefined) payload.cover_url = data.cover_url;
    if (data.cover_position !== undefined) payload.cover_position = data.cover_position ?? "50% 50%";
    if (data.cover_scale !== undefined) payload.cover_scale = data.cover_scale ?? 1;

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
  cluster_id: z.string().uuid(),
  is_active: z.boolean().optional(),
});

export const createPrograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createProgramaSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("programas")
      .insert({
        title: data.title.trim(),
        cluster_id: data.cluster_id,
        is_active: data.is_active ?? true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
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
