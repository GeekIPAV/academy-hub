import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const identifierSchema = z.object({
  identifier: z.string().trim().min(8).max(80),
});

export interface PublicEventDetails {
  id: string;
  notion_id: string | null;
  title: string | null;
  description: string | null;
  action_date: string | null;
  registration_status: string | null;
  max_capacity: number | null;
  required_fields: unknown;
  aceite_count: number;
}

/**
 * Carrega os detalhes públicos de um evento pelo Notion Page ID.
 * Não exige autenticação — é o ponto de entrada para o link público
 * gerado a partir da fórmula do Notion (/evento/<NOTION_PAGE_ID>).
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
      required_fields: row.required_fields,
      aceite_count: count ?? 0,
    };
  });

const enrollSchema = z.object({
  identifier: z.string().trim().min(8).max(80),
  additional_data: z
    .record(z.string().min(1).max(100), z.unknown())
    .default({}),
  user_observations: z.string().max(2000).optional(),
});

/**
 * Inscrição pública num evento via Notion Page ID.
 * Mapeia o notion_id → id interno e cria o registo em inscritos_acoes
 * para o utilizador autenticado.
 */
export const enrollInPublicEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => enrollSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

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

    const { data: existing } = await supabaseAdmin
      .from("inscritos_acoes")
      .select("id, status")
      .eq("action_id", action.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      return {
        id: existing.id,
        status: existing.status,
        alreadyEnrolled: true,
      };
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
        user_id: userId,
        action_id: action.id,
        status,
        additional_data: data.additional_data as never,
        user_observations: data.user_observations ?? null,
      })
      .select("id, status")
      .single();
    if (iErr) throw new Error(iErr.message);

    await supabaseAdmin.from("notificacoes").insert({
      user_id: userId,
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
