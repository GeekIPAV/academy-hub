import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const identifierSchema = z.object({
  identifier: z.string().trim().min(8).max(80),
});

export interface RequiredField {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  options?: string[];
}


type JsonVal =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonVal }
  | JsonVal[];

export interface PublicEventDetails {
  id: string;
  notion_id: string | null;
  title: string | null;
  description: string | null;
  start_date: string | null;
  registration_status: string | null;
  max_capacity: number | null;
  required_fields: RequiredField[];
  aceite_count: number;
  conteudo_pagina_inscricao: JsonVal | null;
}

/**
 * Carrega os detalhes públicos de um evento pelo Notion Page ID.
 */
export const getPublicEventDetails = createServerFn({ method: "GET" })
  .inputValidator((input) => identifierSchema.parse(input))
  .handler(async ({ data }): Promise<PublicEventDetails> => {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        data.identifier,
      );
    const query = supabaseAdmin
      .from("acoes")
      .select(
        "id, notion_id, title, description, start_date, registration_status, max_capacity, required_fields, conteudo_pagina_inscricao",
      );
    const { data: row, error } = await (isUuid
      ? query.eq("id", data.identifier)
      : query.eq("notion_id", data.identifier)
    ).maybeSingle();
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
      start_date: row.start_date,
      registration_status: row.registration_status,
      max_capacity: row.max_capacity,
      required_fields: Array.isArray(row.required_fields)
        ? (row.required_fields as unknown as RequiredField[])
        : [],
      aceite_count: count ?? 0,
      conteudo_pagina_inscricao:
        ((row as { conteudo_pagina_inscricao?: unknown }).conteudo_pagina_inscricao ?? null) as JsonVal | null,
    };
  });

const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  doc_type: z.enum(["nif", "passport"]),
  doc_number: z.string().trim().min(3).max(40),
});

export interface VerifyIdentityResult {
  exists: boolean;
  /** True se o email e o documento existem mas pertencem a contas diferentes. */
  conflict: boolean;
  conflict_message?: string;
}

const GENERIC_CONFLICT_MESSAGE =
  "Os dados indicados não correspondem a uma conta única. Inicia sessão com a conta correta ou contacta-nos.";

/**
 * Verifica se já existe um utilizador com este email, NIF ou passaporte.
 * Não devolve PII (nome) para evitar enumeração não autenticada.
 */
export const verifyPublicUserIdentity = createServerFn({ method: "POST" })
  .inputValidator((input) => verifySchema.parse(input))
  .handler(async ({ data }): Promise<VerifyIdentityResult> => {
    const docColumn = data.doc_type === "nif" ? "nif" : "passport_num";

    const { data: users, error } = await supabaseAdmin
      .from("utilizadores")
      .select("id, email, nif, passport_num")
      .or(`email.eq.${data.email},${docColumn}.eq.${data.doc_number}`);
    if (error) throw new Error(error.message);

    const rows = users ?? [];

    if (rows.length > 1) {
      return {
        exists: false,
        conflict: true,
        conflict_message: GENERIC_CONFLICT_MESSAGE,
      };
    }

    if (rows.length === 1) {
      const u = rows[0];
      const emailMatches = (u.email ?? "").toLowerCase() === data.email;
      const docMatches =
        (u as Record<string, unknown>)[docColumn] === data.doc_number;
      if (emailMatches && !docMatches && (u as Record<string, unknown>)[docColumn]) {
        return {
          exists: false,
          conflict: true,
          conflict_message: GENERIC_CONFLICT_MESSAGE,
        };
      }
      if (!emailMatches && docMatches && u.email) {
        return {
          exists: false,
          conflict: true,
          conflict_message: GENERIC_CONFLICT_MESSAGE,
        };
      }
      return { exists: true, conflict: false };
    }

    return { exists: false, conflict: false };
  });



const enrollForUserSchema = z.object({
  identifier: z.string().trim().min(8).max(80),
  user_id: z.string().uuid(),
  email: z.string().trim().toLowerCase().email().max(255),
  additional_data: z
    .record(z.string().min(1).max(100), z.unknown())
    .default({}),
  user_observations: z.string().max(2000).optional(),
  tshirt_size: z.string().trim().max(10).optional(),
  profile: z
    .object({
      full_name: z.string().trim().min(2).max(160).optional(),
      doc_type: z.enum(["nif", "passport"]).optional(),
      doc_number: z.string().trim().min(3).max(40).optional(),
    })
    .optional(),
});

export const enrollInPublicEventForUser = createServerFn({ method: "POST" })
  .inputValidator((input) => enrollForUserSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: u, error: uErr } =
      await supabaseAdmin.auth.admin.getUserById(data.user_id);
    if (uErr || !u?.user) throw new Error("Utilizador inválido.");
    if ((u.user.email ?? "").toLowerCase() !== data.email) {
      throw new Error("Identidade não corresponde à conta autenticada.");
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        data.identifier,
      );
    const actionQuery = supabaseAdmin
      .from("acoes")
      .select("id, max_capacity, title, registration_status");
    const { data: action, error: aErr } = await (isUuid
      ? actionQuery.eq("id", data.identifier)
      : actionQuery.eq("notion_id", data.identifier)
    ).maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!action) throw new Error("Evento não encontrado.");
    if (action.registration_status && action.registration_status !== "Aberto") {
      throw new Error("As inscrições para este evento não estão abertas.");
    }

    // Garante sempre o email no perfil (pesquisa nativa por email).
    const baseProfilePatch: Record<string, unknown> = {
      id: data.user_id,
      email: data.email.toLowerCase(),
    };
    if (data.profile) {
      if (data.profile.full_name) baseProfilePatch.full_name = data.profile.full_name;
      if (data.profile.doc_type && data.profile.doc_number) {
        if (data.profile.doc_type === "nif") {
          baseProfilePatch.nif = data.profile.doc_number;
        } else {
          baseProfilePatch.passport_num = data.profile.doc_number;
          baseProfilePatch.id_doc_type = "Passaporte";
        }
      }
    }
    await supabaseAdmin
      .from("utilizadores")
      .upsert(baseProfilePatch as never, { onConflict: "id" });


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
        tshirt_size: data.tshirt_size ?? null,
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

/**
 * Para o fluxo pós-Google: verifica se o utilizador autenticado tem
 * NIF ou passaporte preenchido. Caso não tenha, o formulário pede.
 */
export const getCurrentUserDocStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("utilizadores")
      .select("full_name, nif, passport_num")
      .eq("id", userId)
      .maybeSingle();
    return {
      user_id: userId,
      full_name: data?.full_name ?? null,
      has_document: Boolean(data?.nif || data?.passport_num),
    };
  });
