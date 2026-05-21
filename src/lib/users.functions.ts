import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role_name")
    .eq("user_id", userId)
    .eq("role_name", "Admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito.");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { data: profiles, error } = await supabaseAdmin
      .from("utilizadores")
      .select("id, full_name, created_at, user_roles(role_name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: authList, error: authErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authErr) throw new Error(authErr.message);
    const emailById = new Map(
      authList.users.map((u) => [u.id, u.email ?? ""]),
    );

    return (profiles ?? []).map((p) => {
      const roleRows = (p as unknown as { user_roles: { role_name: string }[] | null })
        .user_roles ?? [];
      return {
        id: p.id,
        full_name: p.full_name,
        roles: roleRows.map((r) => r.role_name).sort(),
        created_at: p.created_at,
        email: emailById.get(p.id) ?? "",
      };
    });
  });

const roleMutationSchema = z.object({
  userId: z.string().uuid(),
  role: z.string().min(1).max(40),
});

async function ensureActiveRole(role: string) {
  const { data, error } = await supabaseAdmin
    .from("roles")
    .select("name, is_active")
    .eq("name", role)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Perfil inexistente.");
  if (!data.is_active) throw new Error("Perfil inativo.");
}

export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => roleMutationSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await ensureActiveRole(data.role);

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: data.userId,
        role_name: data.role,
        assigned_by: context.userId,
      });
    // Ignore duplicate (already assigned)
    if (error && !/duplicate key/i.test(error.message)) {
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const removeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => roleMutationSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // Protect: an Admin cannot remove their own Admin role if they are the last one
    if (data.role === "Admin" && data.userId === context.userId) {
      const { count, error: cErr } = await supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role_name", "Admin");
      if (cErr) throw new Error(cErr.message);
      if ((count ?? 0) <= 1) {
        throw new Error("Não podes remover o último perfil Admin do sistema.");
      }
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role_name", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const inviteSchema = z.object({
  email: z.string().email().max(255),
  full_name: z.string().trim().min(1).max(120).optional(),
  roles: z.array(z.string().min(1).max(40)).max(10).optional(),
});

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: invited, error: invErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        data: data.full_name ? { full_name: data.full_name } : undefined,
      });
    if (invErr) throw new Error(invErr.message);
    const newUserId = invited.user?.id;
    if (!newUserId) throw new Error("Falha a criar o utilizador.");

    if (data.full_name) {
      await supabaseAdmin
        .from("utilizadores")
        .upsert({ id: newUserId, full_name: data.full_name });
    }

    const roles = (data.roles ?? []).filter((r) => r !== "Formando");
    for (const role of roles) {
      await ensureActiveRole(role);
      const { error } = await supabaseAdmin.from("user_roles").insert({
        user_id: newUserId,
        role_name: role,
        assigned_by: context.userId,
      });
      if (error && !/duplicate key/i.test(error.message)) {
        throw new Error(error.message);
      }
    }

    return { ok: true, userId: newUserId };
  });
