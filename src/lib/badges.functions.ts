import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertRouteAccess } from "@/lib/admin-access.server";

async function assertAdmin(userId: string) {
  await assertRouteAccess(userId, "/admin/badges");
}


type BadgeListRow = {
  id: string;
  title: string;
  description: string | null;
  cluster_id: string;
  cover_url: string | null;
  cover_position: string | null;
  cover_scale: number | null;
  created_at: string | null;
  validity_type: string;
  validity_years: number | null;
  validity_fixed_date: string | null;
  clusters: { name: string } | null;
};

export const listAllBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("badges")
      .select(
        "id, title, description, cluster_id, cover_url, cover_position, cover_scale, created_at, validity_type, validity_years, validity_fixed_date, clusters(name)",
      )
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => {
      const row = r as unknown as BadgeListRow;
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        cluster_id: row.cluster_id,
        cluster_name: row.clusters?.name ?? "",
        cover_url: row.cover_url,
        cover_position: row.cover_position,
        cover_scale: row.cover_scale,
        created_at: row.created_at,
        validity_type: row.validity_type,
        validity_years: row.validity_years,
        validity_fixed_date: row.validity_fixed_date,
      };
    });
  });

const userIdSchema = z.object({ userId: z.string().uuid() });

export const getUserBadges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => userIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.userId !== context.userId) await assertAdmin(context.userId);

    const { data: rows, error } = await supabaseAdmin
      .from("user_badges")
      .select(
        "id, granted_at, expires_at, badge:badges(id, title, description, cluster_id, cover_url, clusters(name))",
      )
      .eq("user_id", data.userId)
      .order("granted_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (rows ?? []).map((r) => {
      const b = (
        r as unknown as {
          badge: {
            id: string;
            title: string;
            description: string | null;
            cluster_id: string;
            cover_url: string | null;
            clusters: { name: string } | null;
          } | null;
        }
      ).badge;
      return {
        id: r.id,
        granted_at: r.granted_at,
        expires_at: (r as { expires_at: string | null }).expires_at ?? null,
        badge_id: b?.id ?? null,
        title: b?.title ?? "",
        description: b?.description ?? null,
        cluster_id: b?.cluster_id ?? "",
        cluster: b?.clusters?.name ?? "",
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
      .select("id, user_id, granted_at, expires_at, utilizadores!user_badges_user_id_fkey(id, full_name)")
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
      const u = (
        r as unknown as { utilizadores: { id: string; full_name: string | null } | null }
      ).utilizadores;
      return {
        assignment_id: r.id,
        user_id: r.user_id as string,
        full_name: u?.full_name ?? null,
        email: emailMap.get(r.user_id as string) ?? "",
        granted_at: r.granted_at,
        expires_at: (r as { expires_at: string | null }).expires_at ?? null,
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
    const { error } = await supabaseAdmin.from("user_badges").insert({
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
  cluster_id: z.string().uuid(),
  cover_url: z.string().max(1024).nullable().optional(),
  cover_position: z.string().max(32).optional(),
  cover_scale: z.number().min(1).max(4).optional(),
  validity_type: z.enum(["forever", "relative_years", "fixed_date"]).default("forever"),
  validity_years: z.number().int().min(1).max(99).nullable().optional(),
  validity_fixed_date: z.string().nullable().optional(),
});

export const upsertBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const payload = {
      title: data.title,
      description: data.description ?? null,
      cluster_id: data.cluster_id,
      cover_url: data.cover_url ?? null,
      validity_type: data.validity_type,
      validity_years: data.validity_type === "relative_years" ? data.validity_years ?? null : null,
      validity_fixed_date:
        data.validity_type === "fixed_date" ? data.validity_fixed_date ?? null : null,
      ...(data.cover_position !== undefined ? { cover_position: data.cover_position } : {}),
      ...(data.cover_scale !== undefined ? { cover_scale: data.cover_scale } : {}),
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("badges").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("badges")
      .insert(payload)
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
