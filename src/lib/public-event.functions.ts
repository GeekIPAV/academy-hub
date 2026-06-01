import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const identifierSchema = z.object({
  identifier: z.string().trim().min(8).max(80),
});

export interface RequiredField {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
}

export interface PublicEventDetails {
  id: string;
  notion_id: string | null;
  title: string | null;
  description: string | null;
  action_date: string | null;
  registration_status: string | null;
  max_capacity: number | null;
  required_fields: RequiredField[];
  aceite_count: number;
}

/**
 * Carrega os detalhes públicos de um evento pelo Notion Page ID.
 */
export const getPublicEventDetails = createServerFn({ method: "GET" })
  .inputValidator((input) => identifierSchema.parse(input))
  .handler(async ({ data }): Promise<PublicEventDetails> => {
    const { data: row, error } = await supabaseAdmin
      .from("acoes")
      .select(
        "id, notion_id, title, description, action_date, registration_status, max_capacity, required_fields",
      )
      .eq("notion_id", data.identifier)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Evento não encontrado.");

    const { count } = await supabaseAdmin
      .from("inscritos_acoes")
      .select("id", { count: "exact", head: true })
      .eq("action_id", row.id)
      .eq("status", "aceite");

    return {
      id: row.id,
      notion_id: row.notion_id,
      title: row.title,
      description: row.description,
      action_date: row.action_date,
      registration_status: row.registration_status,
      max_capacity: row.max_capacity,
      required_fields: Array.isArray(row.required_fields)
        ? (row.required_fields as unknown as RequiredField[])
        : [],
      aceite_count: count ?? 0,
    };
  });

const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  doc_type: z.enum(["nif", "passport"]),
  doc_number: z.string().trim().min(3).max(40),
});

export interface VerifyIdentityResult {
  exists: boolean;
  full_name: string | null;
  /** True se foi encontrado um perfil pelo NIF/Doc mas o email não bate certo. */
  conflict: boolean;
}

/**
 * Verifica se já existe um utilizador com este email + NIF/Passaporte.
 * Pública (sem auth). Usada para decidir se mostramos campo de password
 * (login) ou campos de criação de conta.
 */
export const verifyPublicUserIdentity = createServerFn({ method: "POST" })
  .inputValidator((input) => verifySchema.parse(input))
  .handler(async ({ data }): Promise<VerifyIdentityResult> => {
    // 1. Procurar perfil pelo documento.
    const docColumn = data.doc_type === "nif" ? "nif" : "id_doc_number";
    const { data: byDoc } = await supabaseAdmin
      .from("utilizadores")
      .select("id, full_name")
      .eq(docColumn, data.doc_number)
      .maybeSingle();

    // 2. Procurar utilizador pelo email (via auth admin).
    const { data: emailLookup } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const authUser =
      emailLookup?.users?.find(
        (u) => (u.email ?? "").toLowerCase() === data.email,
      ) ?? null;

    if (byDoc && authUser && byDoc.id === authUser.id) {
      return { exists: true, full_name: byDoc.full_name, conflict: false };
    }
    if (byDoc && authUser && byDoc.id !== authUser.id) {
      return { exists: false, full_name: null, conflict: true };
    }
    if (byDoc && !authUser) {
      // Doc registado com outro email → conflito.
      return { exists: false, full_name: null, conflict: true };
    }
    if (!byDoc && authUser) {
      // Email já registado mas com outro documento.
      return { exists: true, full_name: null, conflict: false };
    }
    return { exists: false, full_name: null, conflict: false };
  });

const enrollSchema = z.object({
  identifier: z.string().trim().min(8).max(80),
  additional_data: z
    .record(z.string().min(1).max(100), z.unknown())
    .default({}),
  user_observations: z.string().max(2000).optional(),
  // Para utilizadores novos — gravamos no perfil.
  profile: z
    .object({
      full_name: z.string().trim().min(2).max(160),
      doc_type: z.enum(["nif", "passport"]),
      doc_number: z.string().trim().min(3).max(40),
    })
    .optional(),
});

/**
 * Inscrição pública. Requer que o utilizador já esteja autenticado
 * (a autenticação é feita no cliente imediatamente antes desta chamada,
 * via signInWithPassword ou signUp).
 *
 * Usa o cliente admin para contornar RLS na escrita de perfil e inscrição
 * para evitar dependência de hidratação de sessão num formulário público.
 */
export const enrollInPublicEvent = createServerFn({ method: "POST" })
  .inputValidator((input) => enrollSchema.parse(input))
  .handler(async ({ data }) => {
    // O cliente envia user_id derivado do session.user.id após auth.
    // Aceitamos via campo separado no header? — Não. Em vez disso pedimos
    // explicitamente no payload (já que a sessão acabou de ser criada no
    // cliente). Validamos que o email do payload corresponde ao do auth.
    throw new Error("Use enrollInPublicEventForUser instead.");
  });

const enrollForUserSchema = z.object({
  identifier: z.string().trim().min(8).max(80),
  user_id: z.string().uuid(),
  email: z.string().trim().toLowerCase().email().max(255),
  additional_data: z
    .record(z.string().min(1).max(100), z.unknown())
    .default({}),
  user_observations: z.string().max(2000).optional(),
  profile: z
    .object({
      full_name: z.string().trim().min(2).max(160),
      doc_type: z.enum(["nif", "passport"]),
      doc_number: z.string().trim().min(3).max(40),
    })
    .optional(),
});

export const enrollInPublicEventForUser = createServerFn({ method: "POST" })
  .inputValidator((input) => enrollForUserSchema.parse(input))
  .handler(async ({ data }) => {
    // Confirma que o user_id corresponde mesmo ao email indicado.
    const { data: u, error: uErr } =
      await supabaseAdmin.auth.admin.getUserById(data.user_id);
    if (uErr || !u?.user) throw new Error("Utilizador inválido.");
    if ((u.user.email ?? "").toLowerCase() !== data.email) {
      throw new Error("Identidade não corresponde à conta autenticada.");
    }

    const { data: action, error: aErr } = await supabaseAdmin
      .from("acoes")
      .select("id, max_capacity, title, registration_status")
      .eq("notion_id", data.identifier)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!action) throw new Error("Evento não encontrado.");
    if (action.registration_status && action.registration_status !== "Aberto") {
      throw new Error("As inscrições para este evento não estão abertas.");
    }

    // Upsert do perfil (caso seja conta nova).
    if (data.profile) {
      const patch: Record<string, unknown> = {
        id: data.user_id,
        full_name: data.profile.full_name,
      };
      if (data.profile.doc_type === "nif") {
        patch.nif = data.profile.doc_number;
      } else {
        patch.id_doc_type = "Passaporte";
        patch.id_doc_number = data.profile.doc_number;
      }
      await supabaseAdmin
        .from("utilizadores")
        .upsert(patch as never, { onConflict: "id" });
    }

    // Já inscrito?
    const { data: existing } = await supabaseAdmin
      .from("inscritos_acoes")
      .select("id, status")
      .eq("action_id", action.id)
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (existing) {
      return { id: existing.id, status: existing.status, alreadyEnrolled: true };
    }

    const { count } = await supabaseAdmin
      .from("inscritos_acoes")
      .select("id", { count: "exact", head: true })
      .eq("action_id", action.id)
      .eq("status", "aceite");
    const aceite = count ?? 0;
    const max = action.max_capacity ?? null;
    const status = max != null && aceite >= max ? "suplente" : "aceite";

    const { data: enr, error: iErr } = await supabaseAdmin
      .from("inscritos_acoes")
      .insert({
        user_id: data.user_id,
        action_id: action.id,
        status,
        additional_data: data.additional_data as never,
        user_observations: data.user_observations ?? null,
      })
      .select("id, status")
      .single();
    if (iErr) throw new Error(iErr.message);

    await supabaseAdmin.from("notificacoes").insert({
      user_id: data.user_id,
      title:
        status === "aceite"
          ? "Inscrição confirmada"
          : "Inscrição em lista de espera",
      message:
        status === "aceite"
          ? `A tua inscrição em "${action.title ?? "evento"}" foi aceite.`
          : `O evento "${action.title ?? ""}" está cheio. Ficaste como suplente.`,
      link: `/evento/${data.identifier}`,
    });

    return { id: enr.id, status: enr.status, alreadyEnrolled: false };
  });
