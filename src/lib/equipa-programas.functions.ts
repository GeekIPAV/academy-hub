import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SITE_URL = "https://app.ipav.pt";

/** "25/26" para o ano letivo atual (começa em agosto). */
export function academicYearLabel(offset = 0): string {
  const d = new Date();
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  const start = (m >= 8 ? y : y - 1) + offset;
  return `${String(start).slice(-2)}/${String(start + 1).slice(-2)}`;
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fuzzyMatch(haystack: string, query: string): boolean {
  const nh = normalize(haystack);
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => nh.includes(t));
}

async function assertEquipa(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role_name")
    .eq("user_id", userId)
    .in("role_name", ["Admin", "Equipa IPAV"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Acesso restrito.");
}

function randomToken(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ───────────────────────── Público (link de inscrição) ─────────────────────────

const tokenSchema = z.object({ token: z.string().trim().min(4).max(128) });

export const getProgramaByPublicToken = createServerFn({ method: "GET" })
  .inputValidator((i) => tokenSchema.parse(i))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("programas")
      .select("id, title, is_active, enrollment_open, cluster_id, clusters(name, info_pdf_url)")
      .eq("public_enroll_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      is_active: row.is_active ?? false,
      enrollment_open: row.enrollment_open ?? false,
      cluster_name: row.clusters?.name ?? null,
      info_pdf_url: row.clusters?.info_pdf_url ?? null,
    };
  });

const searchSchema = z.object({
  token: z.string().trim().min(4).max(128),
  query: z.string().trim().min(3).max(120),
});

/** Pesquisa pública (limitada) de organizações, para o fluxo do link. */
export const searchEntidadesPublic = createServerFn({ method: "GET" })
  .inputValidator((i) => searchSchema.parse(i))
  .handler(async ({ data }) => {
    const { data: prog } = await supabaseAdmin
      .from("programas")
      .select("id")
      .eq("public_enroll_token", data.token)
      .maybeSingle();
    if (!prog) throw new Error("Link inválido.");

    const { data: rows, error } = await supabaseAdmin
      .from("entidades")
      .select("id, name, locality")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);

    return (rows ?? [])
      .filter((e) => fuzzyMatch(e.name ?? "", data.query))
      .slice(0, 10)
      .map((e) => ({ id: e.id, name: e.name, locality: e.locality }));
  });

/** Verifica se uma organização já está ativa (ano letivo atual ou anterior). */
export const checkEntidadeAtiva = createServerFn({ method: "GET" })
  .inputValidator((i) =>
    z.object({ token: z.string().trim().min(4), entity_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("entidades_programas")
      .select("id, status, programas(title)")
      .eq("entity_id", data.entity_id)
      .eq("status", "aprovada");
    if (error) throw new Error(error.message);
    const years = [academicYearLabel(0), academicYearLabel(-1)];
    const ativa = (rows ?? []).some((r) =>
      years.some((y) => (r.programas?.title ?? "").includes(y)),
    );
    return { ativa };
  });

const applySchema = z.object({
  token: z.string().trim().min(4).max(128),
  entity_id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(3).max(200),
  address: z.string().trim().max(300).optional().nullable(),
  postal_code: z
    .string()
    .trim()
    .max(20)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  locality: z.string().trim().max(150).optional().nullable(),
  contact_name: z.string().trim().min(2).max(200),
  contact_email: z.string().trim().email().max(255),
  contact_phone: z.string().trim().max(50).optional().nullable(),
});

export const submitEntidadeApplication = createServerFn({ method: "POST" })
  .inputValidator((i) => applySchema.parse(i))
  .handler(async ({ data }) => {
    const { data: prog, error: pErr } = await supabaseAdmin
      .from("programas")
      .select("id, title, enrollment_open")
      .eq("public_enroll_token", data.token)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!prog) throw new Error("Link inválido.");
    if (!prog.enrollment_open) throw new Error("As inscrições deste programa estão fechadas.");

    let entityId = data.entity_id ?? null;

    if (entityId) {
      const { data: ent } = await supabaseAdmin
        .from("entidades")
        .select("id")
        .eq("id", entityId)
        .maybeSingle();
      if (!ent) throw new Error("Organização não encontrada.");
      await supabaseAdmin
        .from("entidades")
        .update({
          contact_name: data.contact_name,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone ?? null,
          address: data.address ?? null,
          postal_code: data.postal_code ?? null,
          locality: data.locality ?? null,
        })
        .eq("id", entityId);
    } else {
      const newId = crypto.randomUUID();
      const { error: insErr } = await supabaseAdmin.from("entidades").insert({
        id: newId,
        name: data.name,
        status: "pendente",
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone ?? null,
        address: data.address ?? null,
        postal_code: data.postal_code ?? null,
        locality: data.locality ?? null,
      });
      if (insErr) throw new Error(insErr.message);
      entityId = newId;
    }

    const { data: existing } = await supabaseAdmin
      .from("entidades_programas")
      .select("id, status")
      .eq("entity_id", entityId)
      .eq("program_id", prog.id)
      .maybeSingle();

    if (existing) {
      if (existing.status === "aprovada") {
        return { ok: true, already: true };
      }
      await supabaseAdmin
        .from("entidades_programas")
        .update({ status: "pendente" })
        .eq("id", existing.id);
    } else {
      const { error: cErr } = await supabaseAdmin.from("entidades_programas").insert({
        entity_id: entityId,
        program_id: prog.id,
        status: "pendente",
        is_active: false,
      });
      if (cErr) throw new Error(cErr.message);
    }

    try {
      await supabaseAdmin.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          template_name: "program-enrollment-pending",
          recipient_email: data.contact_email,
          idempotency_key: `entity-apply-${entityId}-${prog.id}`,
          template_data: {
            recipientName: data.contact_name,
            entityName: data.name,
            programTitles: [prog.title ?? "Programa"],
          },
        },
      });
    } catch (err) {
      console.error("[submitEntidadeApplication] email enqueue failed", err);
    }

    return { ok: true, already: false };
  });

// ───────────────────────── Gestão (Equipa IPAV / Admin) ─────────────────────────

export const listEquipaProgramas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertEquipa(context.userId);
    const { data, error } = await supabaseAdmin
      .from("programas")
      .select("id, title, is_active, enrollment_open, public_enroll_token, cluster_id, clusters(name)")
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      is_active: p.is_active ?? false,
      enrollment_open: p.enrollment_open ?? false,
      public_enroll_token: p.public_enroll_token,
      cluster_name: p.clusters?.name ?? null,
    }));
  });

const programIdSchema = z.object({ programId: z.string().uuid() });

export const listProgramaOrganizacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => programIdSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertEquipa(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("entidades_programas")
      .select(
        "id, status, is_active, invite_token, created_at, entity_id, entidades(name, locality, contact_name, contact_email, contact_phone, status)",
      )
      .eq("program_id", data.programId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const cohortIds = (rows ?? []).map((r) => r.id);
    const counts = new Map<string, number>();
    if (cohortIds.length > 0) {
      const { data: ins } = await supabaseAdmin
        .from("inscritos_programa")
        .select("cohort_id")
        .in("cohort_id", cohortIds);
      for (const i of ins ?? []) {
        if (!i.cohort_id) continue;
        counts.set(i.cohort_id, (counts.get(i.cohort_id) ?? 0) + 1);
      }
    }

    return (rows ?? []).map((r) => ({
      cohort_id: r.id,
      entity_id: r.entity_id,
      entity_name: r.entidades?.name ?? "—",
      entity_locality: r.entidades?.locality ?? null,
      contact_name: r.entidades?.contact_name ?? null,
      contact_email: r.entidades?.contact_email ?? null,
      contact_phone: r.entidades?.contact_phone ?? null,
      status: r.status ?? "pendente",
      is_active: r.is_active ?? false,
      invite_token: r.invite_token,
      created_at: r.created_at,
      participantes: counts.get(r.id) ?? 0,
    }));
  });

export const decidirOrganizacaoInscricao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        cohortId: z.string().uuid(),
        decision: z.enum(["aprovada", "rejeitada", "pendente"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertEquipa(context.userId);

    const { data: cohort, error: cErr } = await supabaseAdmin
      .from("entidades_programas")
      .select(
        "id, entity_id, invite_token, program_id, entidades(name, contact_name, contact_email), programas(title)",
      )
      .eq("id", data.cohortId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cohort) throw new Error("Inscrição não encontrada.");

    if (data.decision === "rejeitada" || data.decision === "pendente") {
      const { error } = await supabaseAdmin
        .from("entidades_programas")
        .update({ status: data.decision, is_active: false })
        .eq("id", data.cohortId);
      if (error) throw new Error(error.message);
      return { ok: true, decision: data.decision };
    }


    const inviteToken = cohort.invite_token ?? randomToken();
    const { error: uErr } = await supabaseAdmin
      .from("entidades_programas")
      .update({ status: "aprovada", is_active: true, invite_token: inviteToken })
      .eq("id", data.cohortId);
    if (uErr) throw new Error(uErr.message);

    const entityId = cohort.entity_id;
    if (!entityId) throw new Error("Inscrição sem organização associada.");

    await supabaseAdmin.from("entidades").update({ status: "Ativo" }).eq("id", entityId);

    // Convite de acesso para a pessoa de contacto (role Entidade)
    let conviteToken: string | null = null;
    const { data: existingInvite } = await supabaseAdmin
      .from("convites")
      .select("token, is_active")
      .eq("entity_id", entityId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingInvite?.token) {
      conviteToken = existingInvite.token;
    } else {
      const { data: created, error: ciErr } = await supabaseAdmin
        .from("convites")
        .insert({
          roles: ["Entidade"],
          label: `Acesso — ${cohort.entidades?.name ?? "Organização"}`,
          created_by: context.userId,
          entity_id: entityId,
          expires_at: null,
          max_uses: null,
        })
        .select("token")
        .single();
      if (ciErr) throw new Error(ciErr.message);
      conviteToken = created.token as string;
    }

    const email = cohort.entidades?.contact_email ?? null;
    if (email && conviteToken) {
      try {
        await supabaseAdmin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            template_name: "entity-application-approved",
            recipient_email: email,
            idempotency_key: `entity-approved-${data.cohortId}`,
            template_data: {
              recipientName: cohort.entidades?.contact_name ?? null,
              entityName: cohort.entidades?.name ?? "",
              programTitle: cohort.programas?.title ?? "",
              inviteUrl: `${SITE_URL}/convite/${conviteToken}`,
            },
          },
        });
      } catch (err) {
        console.error("[decidirOrganizacaoInscricao] email enqueue failed", err);
      }
    }

    return { ok: true, decision: "aprovada" as const, invite_token: inviteToken };
  });

export const listProgramaParticipantesEquipa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({ programId: z.string().uuid(), cohortId: z.string().uuid().optional() })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertEquipa(context.userId);

    let cohortIds: string[] = [];
    if (data.cohortId) {
      cohortIds = [data.cohortId];
    } else {
      const { data: cohorts, error } = await supabaseAdmin
        .from("entidades_programas")
        .select("id")
        .eq("program_id", data.programId);
      if (error) throw new Error(error.message);
      cohortIds = (cohorts ?? []).map((c) => c.id);
    }
    if (cohortIds.length === 0) return [];

    const { data: rows, error: iErr } = await supabaseAdmin
      .from("inscritos_programa")
      .select(
        "id, status, created_at, cohort_id, user_id, utilizadores(full_name, email, phone), entidades_programas(entity_id, entidades(name))",
      )
      .in("cohort_id", cohortIds)
      .order("created_at", { ascending: false });
    if (iErr) throw new Error(iErr.message);

    return (rows ?? []).map((r) => ({
      id: r.id,
      status: r.status ?? "aprovada",
      created_at: r.created_at,
      cohort_id: r.cohort_id,
      user_id: r.user_id,
      full_name: r.utilizadores?.full_name ?? "—",
      email: r.utilizadores?.email ?? null,
      phone: r.utilizadores?.phone ?? null,
      entity_id: r.entidades_programas?.entity_id ?? null,
      entity_name: r.entidades_programas?.entidades?.name ?? "—",
    }));
  });

export const atualizarEstadoParticipante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["aprovada", "lista_espera", "desistiu", "concluido"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertEquipa(context.userId);
    const { error } = await supabaseAdmin
      .from("inscritos_programa")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const toggleEnrollmentEquipaSchema = z.object({
  programId: z.string().uuid(),
  open: z.boolean(),
});

export const setProgramaEnrollmentOpenEquipa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => toggleEnrollmentEquipaSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertEquipa(context.userId);
    const { error } = await supabaseAdmin
      .from("programas")
      .update({ enrollment_open: data.open })
      .eq("id", data.programId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
