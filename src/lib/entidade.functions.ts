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

// ============== Detalhe da Ação (Entidade) ==============

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

async function assertActionBelongsToUserEntity(userId: string, actionId: string) {
  const { data: user, error: uErr } = await supabaseAdmin
    .from("utilizadores")
    .select("entity_id, role")
    .eq("id", userId)
    .maybeSingle();
  if (uErr) throw new Error(uErr.message);
  const isAdmin = user?.role === "Admin";
  const { data: action, error: aErr } = await supabaseAdmin
    .from("acoes")
    .select("id, entity_id")
    .eq("id", actionId)
    .maybeSingle();
  if (aErr) throw new Error(aErr.message);
  if (!action) throw new Error("Ação não encontrada.");
  if (!isAdmin && action.entity_id !== user?.entity_id) {
    throw new Error("Sem acesso a esta ação.");
  }
  return { isAdmin, entityId: user?.entity_id ?? null };
}

const actionIdSchema = z.object({ actionId: z.string().uuid() });

export const getEntidadeActionDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => actionIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertActionBelongsToUserEntity(context.userId, data.actionId);

    const [actionRes, trainerRes, partRes] = await Promise.all([
      supabaseAdmin
        .from("acoes")
        .select(
          "id, title, action_type, status, start_date, end_date, entity_id, created_by, fotos_link, avaliacao_satisfacao_link, avaliacao_impacto_link",
        )
        .eq("id", data.actionId)
        .maybeSingle(),
      supabaseAdmin
        .from("formadores_acoes")
        .select("id, user_id, status, created_at")
        .eq("action_id", data.actionId)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("participantes_acoes")
        .select(
          "id, first_name, last_name, tshirt_size, attendance_confirmed, certificate_sent, certificate_url, certificate_sent_at, created_at",
        )
        .eq("action_id", data.actionId)
        .order("created_at", { ascending: true }),
    ]);

    if (actionRes.error) throw new Error(actionRes.error.message);
    if (trainerRes.error) throw new Error(trainerRes.error.message);
    if (partRes.error) throw new Error(partRes.error.message);

    const trainerIds = (trainerRes.data ?? []).map((t) => t.user_id);
    const extraIds: string[] = [];
    if (actionRes.data?.created_by) extraIds.push(actionRes.data.created_by);
    const allIds = Array.from(new Set([...trainerIds, ...extraIds]));
    const nameMap = new Map<string, string | null>();
    const emailMap = new Map<string, string | null>();
    if (allIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("utilizadores")
        .select("id, full_name")
        .in("id", allIds);
      for (const p of profiles ?? []) nameMap.set(p.id, p.full_name);
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      for (const u of authList?.users ?? []) {
        if (allIds.includes(u.id)) emailMap.set(u.id, u.email ?? null);
      }
    }

    let entityName: string | null = null;
    if (actionRes.data?.entity_id) {
      const { data: ent } = await supabaseAdmin
        .from("entidades")
        .select("name")
        .eq("id", actionRes.data.entity_id)
        .maybeSingle();
      entityName = ent?.name ?? null;
    }

    return {
      action: actionRes.data,
      entityName,
      createdByName: actionRes.data?.created_by
        ? nameMap.get(actionRes.data.created_by) ?? null
        : null,
      trainers: (trainerRes.data ?? []).map((t) => ({
        id: t.id,
        user_id: t.user_id,
        full_name: nameMap.get(t.user_id) ?? "—",
        email: emailMap.get(t.user_id) ?? null,
        status: t.status,
      })),
      participantes: partRes.data ?? [],
    };
  });

const addParticipanteSchema = z.object({
  actionId: z.string().uuid(),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  tshirt_size: z.enum(TSHIRT_SIZES),
});

export const addParticipante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => addParticipanteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertActionBelongsToUserEntity(context.userId, data.actionId);
    const { data: row, error } = await supabaseAdmin
      .from("participantes_acoes")
      .insert({
        action_id: data.actionId,
        first_name: data.first_name,
        last_name: data.last_name,
        tshirt_size: data.tshirt_size,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const bulkAddSchema = z.object({
  actionId: z.string().uuid(),
  default_tshirt_size: z.enum(TSHIRT_SIZES).default("M"),
  participantes: z
    .array(
      z.object({
        first_name: z.string().trim().min(1).max(100),
        last_name: z.string().trim().min(1).max(100),
        tshirt_size: z.enum(TSHIRT_SIZES).optional(),
      }),
    )
    .min(1, "Adicione pelo menos um nome.")
    .max(200, "Máximo de 200 participantes por importação."),
});

export const bulkAddParticipantes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => bulkAddSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertActionBelongsToUserEntity(context.userId, data.actionId);
    const rows = data.participantes.map((p) => ({
      action_id: data.actionId,
      first_name: p.first_name,
      last_name: p.last_name,
      tshirt_size: p.tshirt_size ?? data.default_tshirt_size,
    }));
    const { error, data: inserted } = await supabaseAdmin
      .from("participantes_acoes")
      .insert(rows)
      .select("id");
    if (error) throw new Error(error.message);
    return { count: inserted?.length ?? 0 };
  });

const updateParticipanteSchema = z.object({
  participanteId: z.string().uuid(),
  fields: z
    .object({
      tshirt_size: z.enum(TSHIRT_SIZES).optional(),
      attendance_confirmed: z.boolean().optional(),
      first_name: z.string().trim().min(1).max(100).optional(),
      last_name: z.string().trim().min(1).max(100).optional(),
    })
    .strict(),
});

export type UpdateParticipanteInput = z.infer<typeof updateParticipanteSchema>;

export const updateParticipante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateParticipanteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing, error: fErr } = await supabaseAdmin
      .from("participantes_acoes")
      .select("action_id")
      .eq("id", data.participanteId)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!existing) throw new Error("Participante não encontrado.");
    await assertActionBelongsToUserEntity(context.userId, existing.action_id);

    const { error } = await supabaseAdmin
      .from("participantes_acoes")
      .update(data.fields)
      .eq("id", data.participanteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeParticipante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ participanteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing, error: fErr } = await supabaseAdmin
      .from("participantes_acoes")
      .select("action_id")
      .eq("id", data.participanteId)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!existing) throw new Error("Participante não encontrado.");
    await assertActionBelongsToUserEntity(context.userId, existing.action_id);

    const { error } = await supabaseAdmin
      .from("participantes_acoes")
      .delete()
      .eq("id", data.participanteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== Certificados ==============

async function buildAndUploadFor(participanteId: string, regenerate = false) {
  const { generateCertificatePdf, uploadCertificate, getExistingCertificateUrl } =
    await import("./certificate.server");
  const { data: p, error: pErr } = await supabaseAdmin
    .from("participantes_acoes")
    .select("id, first_name, last_name, action_id")
    .eq("id", participanteId)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!p) throw new Error("Participante não encontrado.");

  // Cache short-circuit: skip pdf-lib CPU work if the file already exists.
  if (!regenerate) {
    const cached = await getExistingCertificateUrl(p.action_id, p.id);
    if (cached) {
      await supabaseAdmin
        .from("participantes_acoes")
        .update({
          certificate_url: cached,
          certificate_sent: true,
        })
        .eq("id", p.id);
      return { url: cached, action_id: p.action_id };
    }
  }

  const { data: a, error: aErr } = await supabaseAdmin
    .from("acoes")
    .select("id, title, action_type, start_date, end_date, entity_id")
    .eq("id", p.action_id)
    .maybeSingle();
  if (aErr) throw new Error(aErr.message);
  if (!a) throw new Error("Ação não encontrada.");

  let entityName: string | null = null;
  if (a.entity_id) {
    const { data: ent } = await supabaseAdmin
      .from("entidades")
      .select("name")
      .eq("id", a.entity_id)
      .maybeSingle();
    entityName = ent?.name ?? null;
  }

  const bytes = await generateCertificatePdf({
    participantName: `${p.first_name} ${p.last_name}`,
    actionTitle: a.title ?? "Ação",
    actionType: a.action_type,
    entityName,
    startDate: a.start_date,
    endDate: a.end_date,
  });

  const publicUrl = await uploadCertificate(a.id, p.id, bytes);

  const { error: updErr } = await supabaseAdmin
    .from("participantes_acoes")
    .update({
      certificate_url: publicUrl,
      certificate_sent: true,
      certificate_sent_at: new Date().toISOString(),
    })
    .eq("id", p.id);
  if (updErr) throw new Error(updErr.message);

  return { url: publicUrl, action_id: a.id };
}

export const generateCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        participanteId: z.string().uuid(),
        regenerate: z.boolean().optional().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: existing, error } = await supabaseAdmin
      .from("participantes_acoes")
      .select("action_id")
      .eq("id", data.participanteId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!existing) throw new Error("Participante não encontrado.");
    await assertActionBelongsToUserEntity(context.userId, existing.action_id);

    const { url } = await buildAndUploadFor(data.participanteId, data.regenerate);
    return { url };
  });

export const generateAllCertificates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        actionId: z.string().uuid(),
        onlyMissing: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertActionBelongsToUserEntity(context.userId, data.actionId);

    let query = supabaseAdmin
      .from("participantes_acoes")
      .select("id, certificate_url")
      .eq("action_id", data.actionId);
    if (data.onlyMissing) query = query.is("certificate_url", null);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    let generated = 0;
    const errors: string[] = [];
    for (const row of rows ?? []) {
      try {
        await buildAndUploadFor(row.id);
        generated++;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    return { generated, failed: errors.length, errors };
  });

// ─── Admin: gestão de entidades ──────────────────────────────────────────────

async function assertAdminUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("utilizadores")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.role !== "Admin") throw new Error("Acesso restrito.");
}

export const adminListEntidades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminUser(context.userId);
    const { data, error } = await supabaseAdmin
      .from("entidades")
      .select(
        "id, name, status, contact_name, contact_email, contact_phone, locality",
      )
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Retorna (ou cria, se ainda não existir) um convite reutilizável para
 * registo com role "Entidade", sem entidade associada.
 */
export const getOrCreateEntidadeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminUser(context.userId);

    const LABEL = "Convite genérico — Entidade";

    const { data: existing, error: fErr } = await supabaseAdmin
      .from("convites")
      .select("token, is_active, expires_at, roles, entity_id, label")
      .eq("label", LABEL)
      .is("entity_id", null)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);

    if (
      existing &&
      Array.isArray(existing.roles) &&
      existing.roles.includes("Entidade") &&
      (!existing.expires_at || new Date(existing.expires_at).getTime() > Date.now())
    ) {
      return { token: existing.token as string };
    }

    const { data: created, error: cErr } = await supabaseAdmin
      .from("convites")
      .insert({
        roles: ["Entidade"],
        label: LABEL,
        created_by: context.userId,
        expires_at: null,
        max_uses: null,
        entity_id: null,
      })
      .select("token")
      .single();
    if (cErr) throw new Error(cErr.message);
    return { token: created.token as string };
  });

const createEntidadesSchema = z.object({
  items: z
    .array(
      z.object({
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
        locality: z.string().trim().max(150).optional().nullable(),
      }),
    )
    .min(1)
    .max(500),
});

export const adminCreateEntidades = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => createEntidadesSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdminUser(context.userId);
    const rows = data.items.map((it) => ({
      id: crypto.randomUUID(),
      name: it.name,
      contact_name: it.contact_name ?? null,
      contact_email: it.contact_email ?? null,
      contact_phone: it.contact_phone ?? null,
      locality: it.locality ?? null,
    }));
    const { data: inserted, error } = await supabaseAdmin
      .from("entidades")
      .insert(rows)
      .select("id");
    if (error) throw new Error(error.message);
    return { created: inserted?.length ?? 0 };
  });
