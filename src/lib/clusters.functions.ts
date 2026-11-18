import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertRouteAccess } from "@/lib/admin-access.server";
import { clusterComponentId, slugifyCluster } from "@/lib/cluster-utils";

async function assertAdmin(userId: string) {
  await assertRouteAccess(userId, "/admin/recursos");
}


export const listClusters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("clusters")
      .select("id, name, description, cover_url, cover_position, cover_scale, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  cover_url: z.string().max(1024).nullable().optional(),
  cover_position: z.string().max(32).nullable().optional(),
  cover_scale: z.number().min(1).max(4).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

export const upsertCluster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const payload = {
      name: data.name.trim(),
      description: data.description ?? null,
      sort_order: data.sort_order ?? 0,
      ...(data.cover_url !== undefined ? { cover_url: data.cover_url } : {}),
      ...(data.cover_position !== undefined
        ? { cover_position: data.cover_position ?? "50% 50%" }
        : {}),
      ...(data.cover_scale !== undefined ? { cover_scale: data.cover_scale ?? 1 } : {}),
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("clusters").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("clusters")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

const idSchema = z.object({ id: z.string().uuid() });

export const deleteCluster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("clusters").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const renameSchema = z.object({
  from: z.string().trim().min(1).max(255),
  to: z.string().trim().min(1).max(255),
});

/**
 * Muda o nome de um cluster/formação em todo o lado onde o nome é guardado
 * como texto (programas, temas, capas/descrições, tabela de clusters) e
 * migra as permissões da matriz de componentes, que usam o slug do nome.
 */
export const renameCluster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => renameSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const from = data.from.trim();
    const to = data.to.replace(/\s+/g, " ").trim();
    if (from === to) return { ok: true, name: to, slug: slugifyCluster(to) };

    const fromSlug = slugifyCluster(from);
    const toSlug = slugifyCluster(to);
    if (!toSlug) throw new Error("Nome inválido.");

    // Evita colisões com outro cluster que já tenha o mesmo slug.
    if (toSlug !== fromSlug) {
      const { data: progs, error: pErr } = await supabaseAdmin
        .from("programas")
        .select("cluster")
        .not("cluster", "is", null);
      if (pErr) throw new Error(pErr.message);
      const { data: cls, error: cErr } = await supabaseAdmin.from("clusters").select("name");
      if (cErr) throw new Error(cErr.message);
      const taken = [
        ...(progs ?? []).map((p) => p.cluster as string),
        ...(cls ?? []).map((c) => c.name as string),
      ].some((n) => n && n.trim() !== from && slugifyCluster(n) === toSlug);
      if (taken) throw new Error("Já existe outra formação com esse nome.");
    }

    const steps: Array<PromiseLike<{ error: { message: string } | null }>> = [
      supabaseAdmin.from("programas").update({ cluster: to }).eq("cluster", from),
      supabaseAdmin.from("temas_momentos").update({ cluster: to }).eq("cluster", from),
      supabaseAdmin.from("clusters").update({ name: to }).eq("name", from),
    ];
    for (const step of steps) {
      const { error } = await step;
      if (error) throw new Error(error.message);
    }

    // Capa / descrição do cartão (chave = nome do cluster).
    const { data: cover, error: covErr } = await supabaseAdmin
      .from("cluster_covers")
      .select("cluster_name")
      .eq("cluster_name", from)
      .maybeSingle();
    if (covErr) throw new Error(covErr.message);
    if (cover) {
      await supabaseAdmin.from("cluster_covers").delete().eq("cluster_name", to);
      const { error } = await supabaseAdmin
        .from("cluster_covers")
        .update({ cluster_name: to, updated_at: new Date().toISOString() })
        .eq("cluster_name", from);
      if (error) throw new Error(error.message);
    }

    // Permissões da matriz de componentes ("/recursos#cluster:<slug>").
    if (toSlug !== fromSlug) {
      const oldId = `/recursos#${clusterComponentId(fromSlug)}`;
      const newId = `/recursos#${clusterComponentId(toSlug)}`;
      const { data: perms, error: permErr } = await supabaseAdmin
        .from("permissoes_roles")
        .select("role_name, tipo")
        .eq("resource_id", oldId);
      if (permErr) throw new Error(permErr.message);
      if (perms && perms.length > 0) {
        const { error: upErr } = await supabaseAdmin.from("permissoes_roles").upsert(
          perms.map((p) => ({ role_name: p.role_name, tipo: p.tipo, resource_id: newId })),
          { onConflict: "role_name,resource_id,tipo", ignoreDuplicates: true },
        );
        if (upErr) throw new Error(upErr.message);
        const { error: delErr } = await supabaseAdmin
          .from("permissoes_roles")
          .delete()
          .eq("resource_id", oldId);
        if (delErr) throw new Error(delErr.message);
      }
    }

    return { ok: true, name: to, slug: toSlug };
  });
