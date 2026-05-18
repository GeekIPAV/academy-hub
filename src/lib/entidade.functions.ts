import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const updateSchema = z.object({
  entityId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  contact_name: z.string().trim().max(200).optional().nullable(),
  contact_email: z
    .string()
    .trim()
    .max(255)
    .email()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  contact_phone: z.string().trim().max(50).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  postal_code: z
    .string()
    .trim()
    .max(20)
    .regex(/^\d{4}-\d{3}$/, "Formato esperado: 1234-567")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  locality: z.string().trim().max(150).optional().nullable(),
});

const optionalEntityIdSchema = z
  .object({ entityId: z.string().uuid().optional() })
  .optional()
  .transform((v) => v ?? {});

async function resolveEntityId(
  userId: string,
  requestedEntityId: string | undefined,
): Promise<string | null> {
  const { data: user, error } = await supabaseAdmin
    .from("utilizadores")
    .select("entity_id, role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const isAdmin = user?.role === "Admin";
  if (requestedEntityId) {
    if (!isAdmin) throw new Error("Apenas admins podem escolher entidade.");
    return requestedEntityId;
  }
  return user?.entity_id ?? null;
}

export const listAllEntidades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: user, error: uErr } = await supabaseAdmin
      .from("utilizadores")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (uErr) throw new Error(uErr.message);
    if (user?.role !== "Admin") throw new Error("Acesso restrito.");

    const { data, error } = await supabaseAdmin
      .from("entidades")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyEntidade = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => optionalEntityIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const entityId = await resolveEntityId(userId, data.entityId);
    if (!entityId) return null;

    const { data: row, error } = await supabaseAdmin
      .from("entidades")
      .select(
        "id, name, status, contact_name, contact_email, contact_phone, address, postal_code, locality",
      )
      .eq("id", entityId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMyEntidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const entityId = await resolveEntityId(userId, data.entityId);
    if (!entityId) throw new Error("Utilizador sem entidade associada.");

    const { error, data: updated } = await supabase
      .from("entidades")
      .update({
        name: data.name,
        contact_name: data.contact_name ?? null,
        contact_email: data.contact_email ?? null,
        contact_phone: data.contact_phone ?? null,
        address: data.address ?? null,
        postal_code: data.postal_code ?? null,
        locality: data.locality ?? null,
      })
      .eq("id", entityId)
      .select(
        "id, name, status, contact_name, contact_email, contact_phone, address, postal_code, locality",
      )
      .maybeSingle();
    if (error) throw new Error(error.message);
    return updated;
  });

export const listMyCohorts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => optionalEntityIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const entityId = await resolveEntityId(userId, data.entityId);
    if (!entityId) return [];

    const { data: rows, error } = await supabaseAdmin
      .from("entidades_programas")
      .select("id, invite_token, is_active, program_id, programas(title)")
      .eq("entity_id", entityId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listMyTrainees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => optionalEntityIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const entityId = await resolveEntityId(userId, data.entityId);
    if (!entityId) return [];

    const { data: cohorts, error: cErr } = await supabaseAdmin
      .from("entidades_programas")
      .select("id, programas(title)")
      .eq("entity_id", entityId);
    if (cErr) throw new Error(cErr.message);
    const cohortIds = (cohorts ?? []).map((c) => c.id);
    if (cohortIds.length === 0) return [];
    const cohortMap = new Map(
      (cohorts ?? []).map((c) => [c.id, c.programas?.title ?? null]),
    );

    const { data: enrolls, error: eErr } = await supabaseAdmin
      .from("inscritos_programa")
      .select("id, status, created_at, cohort_id, user_id, utilizadores(full_name)")
      .in("cohort_id", cohortIds)
      .order("created_at", { ascending: false });
    if (eErr) throw new Error(eErr.message);

    return (enrolls ?? []).map((e) => ({
      id: e.id,
      status: e.status,
      created_at: e.created_at,
      full_name: e.utilizadores?.full_name ?? "—",
      program_title: cohortMap.get(e.cohort_id ?? "") ?? null,
    }));
  });

// ============== Ações (propostas pela Entidade) ==============

export const listMyAcoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => optionalEntityIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const entityId = await resolveEntityId(userId, data.entityId);
    if (!entityId) return [];

    const { data: rows, error } = await supabaseAdmin
      .from("acoes")
      .select("id, title, action_type, status, start_date, end_date, created_at")
      .eq("entity_id", entityId)
      .order("start_date", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const createAcaoSchema = z
  .object({
    entityId: z.string().uuid().optional(),
    action_type: z.string().trim().min(1, "Tipo obrigatório").max(100),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "Data fim deve ser igual ou posterior à data início",
    path: ["end_date"],
  });

export const createAcaoProposta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createAcaoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const entityId = await resolveEntityId(userId, data.entityId);
    if (!entityId) throw new Error("Utilizador sem entidade associada.");

    const { data: row, error } = await supabaseAdmin
      .from("acoes")
      .insert({
        entity_id: entityId,
        action_type: data.action_type,
        title: data.action_type,
        start_date: data.start_date,
        end_date: data.end_date,
        action_date: data.start_date,
        status: "Pendente",
        created_by: userId,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const cancelAcaoSchema = z.object({ actionId: z.string().uuid() });

export const cancelAcaoProposta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => cancelAcaoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: existing, error: fErr } = await supabaseAdmin
      .from("acoes")
      .select("id, entity_id, start_date, status")
      .eq("id", data.actionId)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!existing) throw new Error("Ação não encontrada.");

    const { data: user, error: uErr } = await supabaseAdmin
      .from("utilizadores")
      .select("entity_id, role")
      .eq("id", userId)
      .maybeSingle();
    if (uErr) throw new Error(uErr.message);
    const isAdmin = user?.role === "Admin";
    if (!isAdmin && existing.entity_id !== user?.entity_id) {
      throw new Error("Não pode cancelar ações de outra entidade.");
    }

    // Regra: 14 dias de antecedência (servidor valida também)
    if (!isAdmin && existing.start_date) {
      const start = new Date(existing.start_date + "T00:00:00Z").getTime();
      const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
      const days = Math.floor((start - today) / (1000 * 60 * 60 * 24));
      if (days < 14) {
        throw new Error(
          "Cancelamento não permitido com menos de 14 dias de antecedência.",
        );
      }
    }

    const { error } = await supabaseAdmin
      .from("acoes")
      .update({ status: "Cancelada" })
      .eq("id", data.actionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
