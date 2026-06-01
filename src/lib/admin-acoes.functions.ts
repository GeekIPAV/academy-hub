import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role_name")
    .eq("user_id", userId)
    .eq("role_name", "Admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito.");
}

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
const TRAINER_STATUS = ["Pendente", "Confirmado", "Cancelado"] as const;

// ---------- Acoes ----------

export const listAcoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("acoes")
      .select(
        "id, title, category, action_date, start_date, end_date, registration_status, entity_id, program_id",
      )
      .order("action_date", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const actionIdSchema = z.object({ actionId: z.string().uuid() });

export const getActionDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => actionIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const [actionRes, enrollRes, trainerRes, partRes] = await Promise.all([
      supabaseAdmin
        .from("acoes")
        .select(
          "id, notion_id, title, description, category, action_date, start_date, end_date, registration_status, max_capacity, entity_id, program_id, required_fields, tshirt_tracking_link, tshirt_value, fotos_link, avaliacao_satisfacao, avaliacao_satisfacao_link, avaliacao_impacto, avaliacao_impacto_link",
        )
        .eq("id", data.actionId)
        .maybeSingle(),
      supabaseAdmin
        .from("inscritos_acoes")
        .select(
          "id, user_id, status, submitted_at, tshirt_size, certificate_sent, certificate_url, certificate_sent_at",
        )
        .eq("action_id", data.actionId)
        .order("submitted_at", { ascending: true }),
      supabaseAdmin
        .from("formadores_acoes")
        .select(
          "id, user_id, status, tshirt_size, certificate_sent, certificate_url, certificate_sent_at, created_at",
        )
        .eq("action_id", data.actionId)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("participantes_acoes")
        .select("id, first_name, last_name, tshirt_size, attendance_confirmed, created_at")
        .eq("action_id", data.actionId)
        .order("created_at", { ascending: true }),
    ]);

    if (actionRes.error) throw new Error(actionRes.error.message);
    if (enrollRes.error) throw new Error(enrollRes.error.message);
    if (trainerRes.error) throw new Error(trainerRes.error.message);
    if (partRes.error) throw new Error(partRes.error.message);

    const userIds = Array.from(
      new Set([
        ...(enrollRes.data ?? []).map((e) => e.user_id).filter((v): v is string => !!v),
        ...(trainerRes.data ?? []).map((t) => t.user_id),
      ]),
    );

    const nameMap = new Map<string, string | null>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("utilizadores")
        .select("id, full_name")
        .in("id", userIds);
      for (const p of profiles ?? []) nameMap.set(p.id, p.full_name);
    }

    const emailMap = new Map<string, string>();
    await Promise.all(
      userIds.map(async (uid) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (u?.user?.email) emailMap.set(uid, u.user.email);
      }),
    );

    return {
      action: actionRes.data,
      enrollments: (enrollRes.data ?? []).map((e) => ({
        id: e.id,
        user_id: e.user_id,
        full_name: (e.user_id && nameMap.get(e.user_id)) ?? "—",
        email: e.user_id ? emailMap.get(e.user_id) ?? null : null,
        status: e.status,
        submitted_at: e.submitted_at,
        tshirt_size: e.tshirt_size,
        certificate_sent: e.certificate_sent,
        certificate_url: e.certificate_url,
        certificate_sent_at: e.certificate_sent_at,
      })),
      trainers: (trainerRes.data ?? []).map((t) => ({
        id: t.id,
        user_id: t.user_id,
        full_name: nameMap.get(t.user_id) ?? "—",
        email: emailMap.get(t.user_id) ?? null,
        status: t.status,
        tshirt_size: t.tshirt_size,
        certificate_sent: t.certificate_sent,
        certificate_url: t.certificate_url,
        certificate_sent_at: t.certificate_sent_at,
      })),
      participantes: partRes.data ?? [],
    };
  });

const updateActionSchema = z.object({
  actionId: z.string().uuid(),
  fields: z
    .object({
      start_date: z.string().nullable().optional(),
      end_date: z.string().nullable().optional(),
      tshirt_tracking_link: z.string().max(1000).nullable().optional(),
      tshirt_value: z.number().nullable().optional(),
      fotos_link: z.string().max(1000).nullable().optional(),
      avaliacao_satisfacao: z.number().min(0).max(10).nullable().optional(),
      avaliacao_satisfacao_link: z.string().max(1000).nullable().optional(),
      avaliacao_impacto: z.number().min(0).max(10).nullable().optional(),
      avaliacao_impacto_link: z.string().max(1000).nullable().optional(),
    })
    .strict(),
});

export const updateAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateActionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("acoes")
      .update(data.fields)
      .eq("id", data.actionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Inscritos (formandos) ----------

const updateEnrollmentSchema = z.object({
  enrollmentId: z.string().uuid(),
  fields: z
    .object({
      tshirt_size: z.enum(TSHIRT_SIZES).nullable().optional(),
      certificate_sent: z.boolean().optional(),
      certificate_url: z.string().max(1000).nullable().optional(),
    })
    .strict(),
});

export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;

export const updateEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateEnrollmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: {
      tshirt_size?: (typeof TSHIRT_SIZES)[number] | null;
      certificate_sent?: boolean;
      certificate_url?: string | null;
      certificate_sent_at?: string | null;
    } = { ...data.fields };
    if (data.fields.certificate_sent === true) {
      patch.certificate_sent_at = new Date().toISOString();
    } else if (data.fields.certificate_sent === false) {
      patch.certificate_sent_at = null;
    }
    const { error } = await supabaseAdmin
      .from("inscritos_acoes")
      .update(patch)
      .eq("id", data.enrollmentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Formadores ----------

export const listEligibleTrainers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: roleRows, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role_name")
      .in("role_name", ["Formador", "Admin"]);
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((roleRows ?? []).map((r) => r.user_id)));
    if (userIds.length === 0) return [];
    const { data: profiles } = await supabaseAdmin
      .from("utilizadores")
      .select("id, full_name")
      .in("id", userIds);
    return (profiles ?? [])
      .map((p) => ({ id: p.id, full_name: p.full_name }))
      .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
  });

const assignTrainerSchema = z.object({
  actionId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const assignTrainer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => assignTrainerSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("formadores_acoes")
      .insert({ action_id: data.actionId, user_id: data.userId });
    if (error && !/duplicate key/i.test(error.message)) {
      throw new Error(error.message);
    }
    return { ok: true };
  });

const updateTrainerSchema = z.object({
  trainerId: z.string().uuid(),
  fields: z
    .object({
      status: z.enum(TRAINER_STATUS).optional(),
      tshirt_size: z.enum(TSHIRT_SIZES).nullable().optional(),
      certificate_sent: z.boolean().optional(),
      certificate_url: z.string().max(1000).nullable().optional(),
    })
    .strict(),
});

export type UpdateTrainerInput = z.infer<typeof updateTrainerSchema>;

export const updateTrainer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateTrainerSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: {
      status?: (typeof TRAINER_STATUS)[number];
      tshirt_size?: (typeof TSHIRT_SIZES)[number] | null;
      certificate_sent?: boolean;
      certificate_url?: string | null;
      certificate_sent_at?: string | null;
    } = { ...data.fields };
    if (data.fields.certificate_sent === true) {
      patch.certificate_sent_at = new Date().toISOString();
    } else if (data.fields.certificate_sent === false) {
      patch.certificate_sent_at = null;
    }
    const { error } = await supabaseAdmin
      .from("formadores_acoes")
      .update(patch)
      .eq("id", data.trainerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeTrainer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ trainerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("formadores_acoes")
      .delete()
      .eq("id", data.trainerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
