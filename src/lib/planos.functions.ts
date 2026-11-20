import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertRouteAccess } from "@/lib/admin-access.server";
import { usoPlanoProjeto } from "@/lib/planos.server";

export const getPlanoProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ projectId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertRouteAccess(context.userId, "/admin/projetos");
    return usoPlanoProjeto(data.projectId);
  });

export const guardarPlanoProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ projectId: z.string().uuid(), plano: z.enum(["A", "B", "C"]).nullable(), bloqueia: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertRouteAccess(context.userId, "/admin/projetos");
    const { error } = await supabaseAdmin
      .from("projetos")
      .update({ plano: data.plano, plano_bloqueia: data.bloqueia })
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
