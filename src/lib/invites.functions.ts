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

const createSchema = z.object({
  roles: z.array(z.string().min(1).max(40)).min(1).max(10),
  label: z.string().trim().max(120).optional(),
  expires_in_days: z.number().int().min(1).max(365).optional(),
  max_uses: z.number().int().min(1).max(1000).optional(),
});

export const listInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("convites")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => createSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // Validate roles exist & active
    const { data: rs, error: rErr } = await supabaseAdmin
      .from("roles")
      .select("name, is_active")
      .in("name", data.roles);
    if (rErr) throw new Error(rErr.message);
    const validNames = new Set((rs ?? []).filter((r) => r.is_active).map((r) => r.name));
    for (const role of data.roles) {
      if (!validNames.has(role)) throw new Error(`Perfil inválido ou inativo: ${role}`);
    }

    const expires_at = data.expires_in_days
      ? new Date(Date.now() + data.expires_in_days * 86400000).toISOString()
      : null;

    const { data: inserted, error } = await supabaseAdmin
      .from("convites")
      .insert({
        roles: data.roles,
        label: data.label ?? null,
        created_by: context.userId,
        expires_at,
        max_uses: data.max_uses ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  roles: z.array(z.string().min(1).max(40)).min(1).max(10).optional(),
  label: z.string().trim().max(120).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  max_uses: z.number().int().min(1).max(1000).nullable().optional(),
  is_active: z.boolean().optional(),
});

export const updateInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => updateSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    if (data.roles) {
      const { data: rs, error: rErr } = await supabaseAdmin
        .from("roles")
        .select("name, is_active")
        .in("name", data.roles);
      if (rErr) throw new Error(rErr.message);
      const validNames = new Set((rs ?? []).filter((r) => r.is_active).map((r) => r.name));
      for (const role of data.roles) {
        if (!validNames.has(role)) throw new Error(`Perfil inválido ou inativo: ${role}`);
      }
    }

    const patch: Record<string, unknown> = {};
    if (data.roles !== undefined) patch.roles = data.roles;
    if (data.label !== undefined) patch.label = data.label;
    if (data.expires_at !== undefined) patch.expires_at = data.expires_at;
    if (data.max_uses !== undefined) patch.max_uses = data.max_uses;
    if (data.is_active !== undefined) patch.is_active = data.is_active;

    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabaseAdmin
      .from("convites")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("convites")
      .update({ is_active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getInviteInfo = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ token: z.string().min(8).max(80) }).parse(i))
  .handler(async ({ data }) => {
    const { data: inv, error } = await supabaseAdmin
      .from("convites")
      .select("id, roles, label, expires_at, max_uses, uses_count, is_active")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("Link de convite inválido.");
    if (!inv.is_active) throw new Error("Convite revogado.");
    if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
      throw new Error("Convite expirado.");
    }
    if (inv.max_uses != null && inv.uses_count >= inv.max_uses) {
      throw new Error("Limite de utilizações deste convite atingido.");
    }
    return {
      roles: inv.roles as string[],
      label: inv.label as string | null,
    };
  });

const redeemSchema = z.object({
  token: z.string().min(8).max(80),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  full_name: z.string().trim().min(1).max(120),
});

export const redeemInvite = createServerFn({ method: "POST" })
  .inputValidator((i) => redeemSchema.parse(i))
  .handler(async ({ data }) => {
    const { data: inv, error: invErr } = await supabaseAdmin
      .from("convites")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (invErr) throw new Error(invErr.message);
    if (!inv) throw new Error("Link de convite inválido.");
    if (!inv.is_active) throw new Error("Convite revogado.");
    if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
      throw new Error("Convite expirado.");
    }
    if (inv.max_uses != null && inv.uses_count >= inv.max_uses) {
      throw new Error("Limite de utilizações deste convite atingido.");
    }

    // Create the user (auto-confirm so they can login immediately)
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (cErr) throw new Error(cErr.message);
    const newUserId = created.user?.id;
    if (!newUserId) throw new Error("Falha a criar utilizador.");

    await supabaseAdmin
      .from("utilizadores")
      .upsert({ id: newUserId, full_name: data.full_name });

    // Replace any default role with the ones from the invite
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
    for (const role of inv.roles as string[]) {
      const { error } = await supabaseAdmin.from("user_roles").insert({
        user_id: newUserId,
        role_name: role,
        assigned_by: inv.created_by,
      });
      if (error && !/duplicate key/i.test(error.message)) {
        throw new Error(error.message);
      }
    }

    await supabaseAdmin
      .from("convites")
      .update({ uses_count: (inv.uses_count ?? 0) + 1 })
      .eq("id", inv.id);

    return { ok: true };
  });

// Claim an invite for the CURRENT authenticated user (used after Google OAuth).
export const claimInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ token: z.string().min(8).max(80) }).parse(i))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    const { data: inv, error: invErr } = await supabaseAdmin
      .from("convites")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (invErr) throw new Error(invErr.message);
    if (!inv) throw new Error("Link de convite inválido.");
    if (!inv.is_active) throw new Error("Convite revogado.");
    if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
      throw new Error("Convite expirado.");
    }
    if (inv.max_uses != null && inv.uses_count >= inv.max_uses) {
      throw new Error("Limite de utilizações deste convite atingido.");
    }

    // Ensure a utilizadores row exists
    await supabaseAdmin
      .from("utilizadores")
      .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });

    // Adiciona as roles do convite sem apagar as existentes (idempotente).
    // Remove apenas o "Formando" default se passarmos a ter outra role explícita.
    for (const role of inv.roles as string[]) {
      const { error } = await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role_name: role,
        assigned_by: inv.created_by,
      });
      if (error && !/duplicate key/i.test(error.message)) {
        throw new Error(error.message);
      }
    }
    const invitedRoles = inv.roles as string[];
    if (invitedRoles.length > 0 && !invitedRoles.includes("Formando")) {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role_name", "Formando");
    }


    await supabaseAdmin
      .from("convites")
      .update({ uses_count: (inv.uses_count ?? 0) + 1 })
      .eq("id", inv.id);

    return { ok: true };
  });

// ─── Aliases públicos (nomes consistentes com a especificação) ───────────────
// Validação pública do token (usa supabaseAdmin para contornar RLS de leitura).
export const validateStaffInvite = getInviteInfo;
// Consumo do convite para o utilizador autenticado atual.
export const consumeStaffInvite = claimInvite;
// Geração de novo convite (apenas Admin).
export const generateStaffInvite = createInvite;
// Listagem dos convites ativos para o painel Admin.
export const listActiveInvites = listInvites;
