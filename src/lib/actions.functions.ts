import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listActions = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("acoes")
    .select(
      "id, title, description, action_date, category, max_capacity, registration_status, program_id, programas(title)",
    )
    .order("action_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getAction = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: action, error } = await supabaseAdmin
      .from("acoes")
      .select(
        "id, title, description, action_date, category, max_capacity, required_fields, registration_status, programas(title)",
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
