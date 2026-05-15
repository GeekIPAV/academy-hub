import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("utilizadores")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.role !== "admin") throw new Error("Acesso restrito.");
}

export const listProgramas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("programas")
      .select("id, title, is_active")
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
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
