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
      .select("id, full_name, created_at, is_active, user_roles(role_name)")
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
        is_active: (p as unknown as { is_active: boolean | null }).is_active ?? true,
        email: emailById.get(p.id) ?? "",
      };
    });
  });

const setActiveSchema = z.object({
  userId: z.string().uuid(),
  is_active: z.boolean(),
});

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => setActiveSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) {
      throw new Error("Não podes inativar a tua própria conta.");
    }

    // Atualiza flag no perfil
    const { error: pErr } = await supabaseAdmin
      .from("utilizadores")
      .update({ is_active: data.is_active })
      .eq("id", data.userId);
    if (pErr) throw new Error(pErr.message);

    // Bloqueia / desbloqueia login (ban_duration: "876000h" ≈ 100 anos; "none" desbloqueia)
    const { error: bErr } = await supabaseAdmin.auth.admin.updateUserById(
      data.userId,
      { ban_duration: data.is_active ? "none" : "876000h" },
    );
    if (bErr) throw new Error(bErr.message);

    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) {
      throw new Error("Não podes apagar a tua própria conta.");
    }

    // Protege o último Admin
    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role_name")
      .eq("user_id", data.userId);
    const isTargetAdmin = (targetRoles ?? []).some((r) => r.role_name === "Admin");
    if (isTargetAdmin) {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role_name", "Admin");
      if ((count ?? 0) <= 1) {
        throw new Error("Não podes apagar o último Admin do sistema.");
      }
    }

    // Limpa tabelas dependentes (caso não exista cascade)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("utilizadores").delete().eq("id", data.userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    return { ok: true };
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
  roles: z.array(z.string().min(1).max(40)).min(1).max(10),
});

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const selected = Array.from(new Set(data.roles));
    for (const role of selected) {
      await ensureActiveRole(role);
    }

    // Generate an invite link (creates the user, returns the action link
    // without sending an email).
    const { data: linkData, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email: data.email,
        options: {
          data: data.full_name ? { full_name: data.full_name } : undefined,
        },
      });
    if (linkErr) throw new Error(linkErr.message);

    const newUserId = linkData.user?.id;
    const actionLink = linkData.properties?.action_link;
    if (!newUserId || !actionLink) {
      throw new Error("Falha a criar o convite.");
    }

    if (data.full_name) {
      await supabaseAdmin
        .from("utilizadores")
        .upsert({ id: newUserId, full_name: data.full_name });
    }

    // The handle_new_user trigger auto-assigns "Participante". Clear all roles
    // and apply exactly what the admin selected.
    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", newUserId);
    if (delErr) throw new Error(delErr.message);

    for (const role of selected) {
      const { error } = await supabaseAdmin.from("user_roles").insert({
        user_id: newUserId,
        role_name: role,
        assigned_by: context.userId,
      });
      if (error && !/duplicate key/i.test(error.message)) {
        throw new Error(error.message);
      }
    }

    return { ok: true, userId: newUserId, inviteLink: actionLink };
  });
