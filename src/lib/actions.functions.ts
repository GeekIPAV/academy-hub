import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listActions = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("acoes")
    .select(
      "id, title, description, start_date, formato, max_capacity, registration_status, program_id, programas(title)",
    )
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getAction = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: action, error } = await supabaseAdmin
      .from("acoes")
      .select(
        "id, title, description, start_date, formato, max_capacity, required_fields, registration_status, programas(title)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!action) return null;

    const { count } = await supabaseAdmin
      .from("inscritos_acoes")
      .select("id", { count: "exact", head: true })
      .eq("action_id", data.id)
      .eq("status", "aceite");

    return { ...action, aceite_count: count ?? 0 };
  });

export type AcaoPublicaRow = {
  id: string;
  title: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  formato: string | null;
  localizacao: string | null;
  pais: string | null;
  produto: string | null;
  action_type: string | null;
  max_capacity: number | null;
  registration_status: string | null;
  cover_url: string | null;
  cover_position: string | null;
  cover_scale: number | null;
  programa_title: string | null;
};

/**
 * Ações visíveis publicamente na galeria: apenas com inscrições abertas
 * ou que já foram/ainda vão acontecer com inscrições anunciadas.
 * Nunca devolve ações fechadas/canceladas ou sem estado de inscrição.
 */
export const listAcoesPublicas = createServerFn({ method: "GET" }).handler(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin
    .from("acoes")
    .select(
      "id, title, description, start_date, end_date, formato, localizacao, pais, produto, action_type, max_capacity, registration_status, cover_url, cover_position, cover_scale, programas(title)",
    )
    .or(`registration_status.eq.Aberto,and(registration_status.eq.Em breve,start_date.gte.${today})`)
    .order("start_date", { ascending: true, nullsFirst: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>): AcaoPublicaRow => {
    const { programas, ...rest } = r as Record<string, unknown> & {
      programas: { title?: string | null } | null;
    };
    return {
      ...(rest as Omit<AcaoPublicaRow, "programa_title">),
      programa_title: programas?.title ?? null,
    };
  });
});
