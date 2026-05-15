import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const tokenSchema = z.object({ token: z.string().trim().min(4).max(128) });

export const getCohortByToken = createServerFn({ method: "GET" })
  .inputValidator((input) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("entidades_programas")
      .select(
        "id, is_active, entity_id, program_id, entidades(name), programas(title)",
      )
      .eq("invite_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      cohort_id: row.id,
      is_active: row.is_active,
      entity_name: row.entidades?.name ?? null,
      program_title: row.programas?.title ?? null,
    };
  });

export const enrollWithToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => tokenSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: cohort, error: cErr } = await supabaseAdmin
      .from("entidades_programas")
      .select("id, is_active")
      .eq("invite_token", data.token)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cohort) throw new Error("Link de inscrição inválido.");
    if (cohort.is_active === false)
      throw new Error("Esta inscrição já não está ativa.");

    const { data: existing } = await supabaseAdmin
      .from("inscritos_programa")
      .select("id, status")
      .eq("cohort_id", cohort.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return { ok: true, alreadyEnrolled: true, id: existing.id };

    const { data: inserted, error: iErr } = await supabaseAdmin
      .from("inscritos_programa")
      .insert({ cohort_id: cohort.id, user_id: userId, status: "pendente" })
      .select("id")
      .maybeSingle();
    if (iErr) throw new Error(iErr.message);
    return { ok: true, alreadyEnrolled: false, id: inserted?.id };
  });
