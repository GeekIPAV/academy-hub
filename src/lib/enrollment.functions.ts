import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/attach-auth-client";

const enrollSchema = z.object({
  action_id: z.string().uuid(),
  additional_data: z.record(z.string().min(1).max(100), z.unknown()).default({}),
  user_observations: z.string().max(2000).optional(),
});

export const enrollInAction = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input) => enrollSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Carrega ação
    const { data: action, error: aErr } = await supabase
      .from("acoes")
      .select("id, max_capacity, title")
      .eq("id", data.action_id)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!action) throw new Error("Ação não encontrada.");

    // Verifica se já existe inscrição deste utilizador para esta ação
    const { data: existing, error: eErr } = await supabase
      .from("inscritos_acoes")
      .select("id, status")
      .eq("action_id", data.action_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);
    if (existing) {
      return { id: existing.id, status: existing.status, alreadyEnrolled: true };
    }

    // Conta inscrições já aceites
    const { count, error: cErr } = await supabase
      .from("inscritos_acoes")
      .select("id", { count: "exact", head: true })
      .eq("action_id", data.action_id)
      .eq("status", "aceite");
    if (cErr) throw new Error(cErr.message);

    const aceiteCount = count ?? 0;
    const max = action.max_capacity ?? null;
    const status = max != null && aceiteCount >= max ? "suplente" : "aceite";

    const { data: enr, error: iErr } = await supabase
      .from("inscritos_acoes")
      .insert({
        user_id: userId,
        action_id: data.action_id,
        status,
        additional_data: data.additional_data as never,
        user_observations: data.user_observations ?? null,
      })
      .select("id, status")
      .single();
    if (iErr) throw new Error(iErr.message);

    // Notificação
    await supabase.from("notificacoes").insert({
      user_id: userId,
      title: status === "aceite" ? "Inscrição confirmada" : "Inscrição em lista de espera",
      message:
        status === "aceite"
          ? `A tua inscrição em "${action.title ?? "ação"}" foi aceite.`
          : `A ação "${action.title ?? ""}" está cheia. Ficaste como suplente.`,
      link: `/actions/${action.id}`,
    });

    return { id: enr.id, status: enr.status };
  });
