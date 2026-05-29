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

export const listAllBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("badges")
      .select("id, title, description, cluster, cover_url, required_program_id, created_at")
      .order("cluster", { ascending: true })
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const userIdSchema = z.object({ userId: z.string().uuid() });

export const getUserBadges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => userIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.userId !== context.userId) await assertAdmin(context.userId);

    const { data: rows, error } = await supabaseAdmin
      .from("user_badges")
      .select("id, granted_at, badge:badges(id, title, description, cluster, cover_url)")
      .eq("user_id", data.userId)
      .order("granted_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (rows ?? []).map((r) => {
      const b = (r as unknown as { badge: { id: string; title: string; description: string | null; cluster: string; cover_url: string | null } | null }).badge;
      return {
        id: r.id,
        granted_at: r.granted_at,
        badge_id: b?.id ?? null,
        title: b?.title ?? "",
        description: b?.description ?? null,
        cluster: b?.cluster ?? "",
        cover_url: b?.cover_url ?? null,
      };
    });
  });

const badgeIdSchema = z.object({ badgeId: z.string().uuid() });

export const getUsersByBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => badgeIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: rows, error } = await supabaseAdmin
      .from("user_badges")
      .select("id, user_id, granted_at, utilizadores(id, full_name)")
      .eq("badge_id", data.badgeId)
      .order("granted_at", { ascending: false });
    if (error) throw new Error(error.message);

    const userIds = (rows ?? []).map((r) => r.user_id).filter(Boolean) as string[];
    let emailMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      emailMap = new Map(authList.users.map((u) => [u.id, u.email ?? ""]));
    }

    return (rows ?? []).map((r) => {
      const u = (r as unknown as { utilizadores: { id: string; full_name: string | null } | null }).utilizadores;
      return {
        assignment_id: r.id,
        user_id: r.user_id as string,
        full_name: u?.full_name ?? null,
        email: emailMap.get(r.user_id as string) ?? "",
        granted_at: r.granted_at,
      };
    });
  });

const mutationSchema = z.object({
  userId: z.string().uuid(),
  badgeId: z.string().uuid(),
});

export const assignBadgeManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => mutationSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("user_badges")
      .insert({
        user_id: data.userId,
        badge_id: data.badgeId,
        granted_by: context.userId,
      });
    if (error && !/duplicate key|unique/i.test(error.message)) {
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const revokeBadgeManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => mutationSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("user_badges")
      .delete()
      .eq("user_id", data.userId)
      .eq("badge_id", data.badgeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  cluster: z.string().min(1).max(255),
  cover_url: z.string().url().max(1024).nullable().optional(),
  required_program_id: z.string().uuid().nullable().optional(),
});

export const upsertBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("badges")
        .update({
          title: data.title,
          description: data.description ?? null,
          cluster: data.cluster,
          cover_url: data.cover_url ?? null,
          required_program_id: data.required_program_id ?? null,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("badges")
      .insert({
        title: data.title,
        description: data.description ?? null,
        cluster: data.cluster,
        cover_url: data.cover_url ?? null,
        required_program_id: data.required_program_id ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

const deleteSchema = z.object({ id: z.string().uuid() });

export const deleteBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("badges").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
