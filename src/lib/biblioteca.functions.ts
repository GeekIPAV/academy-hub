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

export interface CategoriaBiblioteca {
  id: string;
  name: string;
}

export interface Publicacao {
  id: string;
  title: string;
  author: string | null;
  summary: string | null;
  year: number | null;
  link: string | null;
  image_url: string | null;
  status: "pendente" | "aprovado" | "rejeitado";
  categoria_id: string | null;
  is_ipav: boolean;
  proposed_by: string | null;
  proposed_by_name?: string | null;
  created_at: string;
  categoria?: { id: string; name: string } | null;
}

// ---------- Public reads ----------

export const listCategorias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<CategoriaBiblioteca[]> => {
    const { data, error } = await supabaseAdmin
      .from("biblioteca_categorias")
      .select("id, name")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const categoriasComPublicacoesSchema = z.object({
  tab: z.enum(["ipav", "outras"]).optional(),
});

export const listCategoriasComPublicacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => categoriasComPublicacoesSchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<CategoriaBiblioteca[]> => {
    let q = supabaseAdmin
      .from("publicacoes")
      .select("categoria_id")
      .eq("status", "aprovado");
    if (data.tab) q = q.eq("is_ipav", data.tab === "ipav");
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r) => r.categoria_id).filter(Boolean))) as string[];
    if (!ids.length) return [];
    const { data: cats, error: catErr } = await supabaseAdmin
      .from("biblioteca_categorias")
      .select("id, name")
      .in("id", ids)
      .order("name");
    if (catErr) throw new Error(catErr.message);
    return (cats ?? []) as CategoriaBiblioteca[];
  });

const listSchema = z.object({
  tab: z.enum(["ipav", "outras"]).optional(),
  categoriaId: z.string().uuid().nullable().optional(),
  year: z.number().int().min(1800).max(3000).nullable().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(["title", "author", "year"]).optional().default("title"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

export const listPublicacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => listSchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<Publicacao[]> => {
    let q = supabaseAdmin
      .from("publicacoes")
      .select("*, categoria:biblioteca_categorias(id, name)")
      .eq("status", "aprovado");
    if (data.tab) q = q.eq("is_ipav", data.tab === "ipav");
    if (data.categoriaId) q = q.eq("categoria_id", data.categoriaId);
    if (data.year) q = q.eq("year", data.year);
    if (data.search && data.search.trim()) {
      const s = data.search.trim().replace(/[%_]/g, "");
      q = q.or(`title.ilike.%${s}%,author.ilike.%${s}%`);
    }
    const ascending = data.sortOrder === "asc";
    if (data.sortBy === "year") {
      q = q.order("year", { ascending, nullsFirst: false });
    } else if (data.sortBy === "author") {
      q = q.order("author", { ascending, nullsFirst: true });
    } else {
      q = q.order("title", { ascending, nullsFirst: true });
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as Publicacao[];
  });

// ---------- Propose (any auth user) ----------

const proposeSchema = z.object({
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().max(300).optional().nullable(),
  summary: z.string().trim().max(4000).optional().nullable(),
  year: z.number().int().min(1800).max(3000).optional().nullable(),
  link: z.string().trim().max(1000).optional().nullable(),
  image_url: z.string().trim().max(1000).optional().nullable(),
  categoria_id: z.string().uuid().optional().nullable(),
});

export const proposePublicacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => proposeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("publicacoes").insert({
      title: data.title,
      author: data.author || null,
      summary: data.summary || null,
      year: data.year ?? null,
      link: data.link || null,
      image_url: data.image_url || null,
      categoria_id: data.categoria_id || null,
      is_ipav: false,
      status: "pendente",
      proposed_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin ----------

export const listPendingPublicacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Publicacao[]> => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("publicacoes")
      .select("*, categoria:biblioteca_categorias(id, name)")
      .eq("status", "pendente")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((data ?? []).map((r) => r.proposed_by).filter(Boolean))) as string[];
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: users } = await supabaseAdmin
        .from("utilizadores")
        .select("id, full_name, email")
        .in("id", ids);
      names = Object.fromEntries((users ?? []).map((u) => [u.id, u.full_name || u.email || u.id]));
    }
    return (data ?? []).map((r) => ({ ...r, proposed_by_name: r.proposed_by ? names[r.proposed_by] ?? null : null })) as Publicacao[];
  });

const adminListSchema = z.object({
  categoriaId: z.string().uuid().nullable().optional(),
  year: z.number().int().min(1800).max(3000).nullable().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(["title", "author", "year"]).optional().default("title"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

export const listAllApprovedPublicacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => adminListSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<Publicacao[]> => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("publicacoes")
      .select("*, categoria:biblioteca_categorias(id, name)")
      .eq("status", "aprovado");
    if (data.categoriaId) q = q.eq("categoria_id", data.categoriaId);
    if (data.year) q = q.eq("year", data.year);
    if (data.search && data.search.trim()) {
      const s = data.search.trim().replace(/[%_]/g, "");
      q = q.or(`title.ilike.%${s}%,author.ilike.%${s}%`);
    }
    const ascending = data.sortOrder === "asc";
    if (data.sortBy === "year") {
      q = q.order("year", { ascending, nullsFirst: false });
    } else if (data.sortBy === "author") {
      q = q.order("author", { ascending, nullsFirst: true });
    } else {
      q = q.order("title", { ascending, nullsFirst: true });
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as Publicacao[];
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().max(300).optional().nullable(),
  summary: z.string().trim().max(4000).optional().nullable(),
  year: z.number().int().min(1800).max(3000).optional().nullable(),
  link: z.string().trim().max(1000).optional().nullable(),
  image_url: z.string().trim().max(1000).optional().nullable(),
  categoria_id: z.string().uuid().optional().nullable(),
  is_ipav: z.boolean().default(false),
});

export const upsertPublicacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const payload = {
      title: data.title,
      author: data.author || null,
      summary: data.summary || null,
      year: data.year ?? null,
      link: data.link || null,
      image_url: data.image_url || null,
      categoria_id: data.categoria_id || null,
      is_ipav: data.is_ipav,
      status: "aprovado" as const,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("publicacoes").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: created, error } = await supabaseAdmin
      .from("publicacoes")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: created.id };
  });

const idSchema = z.object({ id: z.string().uuid() });

export const approvePublicacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("publicacoes")
      .update({ status: "aprovado" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rejectPublicacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("publicacoes")
      .update({ status: "rejeitado" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePublicacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("publicacoes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Categorias (admin) ----------

const categoriaSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(120),
});

export const upsertCategoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => categoriaSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("biblioteca_categorias")
        .update({ name: data.name })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: created, error } = await supabaseAdmin
      .from("biblioteca_categorias")
      .insert({ name: data.name })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: created.id };
  });

export const deleteCategoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("biblioteca_categorias")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Bulk add ----------

const bulkRowSchema = z.object({
  title: z.string().trim().min(1).max(1000),
  author: z.string().trim().max(300).optional().nullable(),
  summary: z.string().trim().max(4000).optional().nullable(),
  year: z.number().int().min(1800).max(3000).optional().nullable(),
  link: z.string().trim().max(1000).optional().nullable(),
  image_url: z.string().trim().max(1000).optional().nullable(),
  categoria_name: z.string().trim().max(120).optional().nullable(),
  is_ipav: z.boolean().optional().default(false),
});

const bulkSchema = z.object({
  rows: z.array(bulkRowSchema).min(1).max(500),
  createMissingCategorias: z.boolean().optional().default(true),
});

export const bulkCreatePublicacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => bulkSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: cats, error: catErr } = await supabaseAdmin
      .from("biblioteca_categorias")
      .select("id, name");
    if (catErr) throw new Error(catErr.message);
    const byName = new Map((cats ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]));

    const payload: any[] = [];
    for (const r of data.rows) {
      let categoria_id: string | null = null;
      if (r.categoria_name && r.categoria_name.trim()) {
        const key = r.categoria_name.trim().toLowerCase();
        categoria_id = byName.get(key) ?? null;
        if (!categoria_id && data.createMissingCategorias) {
          const { data: created, error } = await supabaseAdmin
            .from("biblioteca_categorias")
            .insert({ name: r.categoria_name.trim() })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          categoria_id = created.id;
          byName.set(key, created.id);
        }
      }
      payload.push({
        title: r.title,
        author: r.author || null,
        summary: r.summary || null,
        year: r.year ?? null,
        link: r.link || null,
        image_url: r.image_url || null,
        categoria_id,
        is_ipav: !!r.is_ipav,
        status: "aprovado" as const,
      });
    }

    const { error } = await supabaseAdmin.from("publicacoes").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true, inserted: payload.length };
  });

// ---------- Bulk delete / update ----------

const idsSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });

export const bulkDeletePublicacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idsSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("publicacoes").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, deleted: data.ids.length };
  });

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  categoria_id: z.string().uuid().nullable().optional(),
  is_ipav: z.boolean().optional(),
});

export const bulkUpdatePublicacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => bulkUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: { categoria_id?: string | null; is_ipav?: boolean } = {};
    if (data.categoria_id !== undefined) patch.categoria_id = data.categoria_id;
    if (data.is_ipav !== undefined) patch.is_ipav = data.is_ipav;
    if (Object.keys(patch).length === 0) return { ok: true, updated: 0 };
    const { error } = await supabaseAdmin.from("publicacoes").update(patch).in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, updated: data.ids.length };
  });
