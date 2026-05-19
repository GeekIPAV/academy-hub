import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("utilizadores")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.role !== "admin" && data?.role !== "Admin") {
    throw new Error("Acesso restrito.");
  }
}

export const listPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("permissoes_roles")
      .select("id, role_name, resource_id, tipo");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const toggleSchema = z.object({
  role_name: z.string().trim().min(1).max(40),
  resource_id: z.string().trim().min(1).max(200),
  tipo: z.enum(["rota", "componente"]),
  is_allowed: z.boolean(),
});

export const togglePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => toggleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    if (data.is_allowed) {
      const { error } = await supabaseAdmin
        .from("permissoes_roles")
        .upsert(
          {
            role_name: data.role_name,
            resource_id: data.resource_id,
            tipo: data.tipo,
          },
          { onConflict: "role_name,resource_id,tipo", ignoreDuplicates: true },
        );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("permissoes_roles")
        .delete()
        .eq("role_name", data.role_name)
        .eq("resource_id", data.resource_id)
        .eq("tipo", data.tipo);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

const cleanupSchema = z.object({
  validRouteIds: z.array(z.string().min(1).max(200)).max(500),
  validComponentIds: z.array(z.string().min(1).max(200)).max(2000),
});

/**
 * Remove permission rows that point to resources no longer present in the app
 * (routes that were deleted, components that were removed from PAGE_COMPONENTS).
 * Idempotent: a no-op when everything is in sync.
 */
export const cleanupStalePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => cleanupSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("permissoes_roles")
      .select("id, resource_id, tipo");
    if (error) throw new Error(error.message);

    const validRoutes = new Set(data.validRouteIds);
    const validComponents = new Set(data.validComponentIds);
    const staleIds = (rows ?? [])
      .filter((r) => {
        if (r.tipo === "rota") return !validRoutes.has(r.resource_id);
        if (r.tipo === "componente") return !validComponents.has(r.resource_id);
        return false;
      })
      .map((r) => r.id);

    if (staleIds.length === 0) return { removed: 0 };

    const { error: dErr } = await supabaseAdmin
      .from("permissoes_roles")
      .delete()
      .in("id", staleIds);
    if (dErr) throw new Error(dErr.message);
    return { removed: staleIds.length };
  });

