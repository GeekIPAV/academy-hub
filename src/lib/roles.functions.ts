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
  if (data?.role !== "Admin") throw new Error("Acesso restrito.");
}

const nameSchema = z
  .string()
  .trim()
  .min(2, "Nome demasiado curto")
  .max(40, "Nome demasiado longo")
  .regex(/^[A-Za-zÀ-ÿ0-9 _-]+$/, "Caracteres inválidos");

export const listRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("roles")
      .select("id, name, description, is_system, is_active, created_at")
      .order("is_system", { ascending: false })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: nameSchema,
        description: z.string().trim().max(200).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("roles")
      .insert({
        name: data.name,
        description: data.description ?? null,
        is_system: false,
        is_active: true,
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("Já existe um perfil com esse nome.");
      throw new Error(error.message);
    }
    return row;
  });

export const updateRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        description: z.string().trim().max(200).optional().nullable(),
        is_active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: { description?: string | null; is_active?: boolean } = {};
    if (data.description !== undefined) patch.description = data.description;
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    const { data: row, error } = await supabaseAdmin
      .from("roles")
      .update(patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("roles").delete().eq("id", data.id);
    if (error) {
      if (error.message?.includes("system role"))
        throw new Error("Não é possível eliminar um perfil do sistema.");
      throw new Error(error.message);
    }
    return { ok: true };
  });
