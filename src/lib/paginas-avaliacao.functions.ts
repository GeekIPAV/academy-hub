import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AvaliacaoPage, PageDoc } from "@/lib/avaliacao-types";

const pageSelect = "id, slug, title, sort_order, blocks, cover_url, cover_position, cover_scale, created_at, updated_at";
const editorSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(240),
  blocks: z.unknown(),
  cover_url: z.string().url().nullable().optional(),
  cover_position: z.string().max(80).optional(),
  cover_scale: z.number().min(1).max(3).optional(),
});

async function assertAvaliacaoEditor(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role_name")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  if (!(data ?? []).some((row) => row.role_name === "Admin" || row.role_name === "Equipa IPAV")) {
    throw new Error("Acesso restrito.");
  }
}

/**
 * Garante que os recursos têm o conteúdo base carregado. As páginas são criadas
 * vazias na base de dados; na primeira leitura o conteúdo integral é escrito.
 */
async function ensureSeeded(pages: AvaliacaoPage[]) {
  const empty = pages.filter((page) => !page.blocks || !Array.isArray(page.blocks.blocks) || page.blocks.blocks.length === 0);
  if (empty.length === 0) return pages;
  const { AVALIACAO_PAGES } = await import("@/lib/avaliacao-pages.server");
  const filled = await Promise.all(
    pages.map(async (page) => {
      const seed = AVALIACAO_PAGES.find((item) => item.slug === page.slug);
      const isEmpty = empty.some((item) => item.id === page.id);
      if (!seed || !isEmpty) return page;
      const blocks = { blocks: seed.blocks } as unknown as PageDoc;
      await supabaseAdmin.from("paginas_avaliacao").update({ blocks }).eq("id", page.id);
      return { ...page, blocks };
    }),
  );
  return filled;
}

export const listPaginasAvaliacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("paginas_avaliacao")
      .select(pageSelect)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return await ensureSeeded((data ?? []) as unknown as AvaliacaoPage[]);
  });


export const getPaginaAvaliacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: page, error } = await supabaseAdmin
      .from("paginas_avaliacao")
      .select(pageSelect)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!page) return null;
    const [seeded] = await ensureSeeded([page as unknown as AvaliacaoPage]);
    return seeded;
  });


export const updatePaginaAvaliacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => editorSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAvaliacaoEditor(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("paginas_avaliacao")
      .update({
        title: data.title,
        blocks: data.blocks as PageDoc,
        cover_url: data.cover_url ?? null,
        ...(data.cover_position ? { cover_position: data.cover_position } : {}),
        ...(data.cover_scale ? { cover_scale: data.cover_scale } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderPaginasAvaliacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ firstId: z.string().uuid(), secondId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAvaliacaoEditor(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("paginas_avaliacao")
      .select("id, sort_order")
      .in("id", [data.firstId, data.secondId]);
    if (error) throw new Error(error.message);
    const first = rows?.find((row) => row.id === data.firstId);
    const second = rows?.find((row) => row.id === data.secondId);
    if (!first || !second) throw new Error("Página não encontrada.");
    const { error: updateError } = await supabaseAdmin
      .from("paginas_avaliacao")
      .upsert([
        { id: first.id, sort_order: second.sort_order },
        { id: second.id, sort_order: first.sort_order },
      ], { onConflict: "id" });
    if (updateError) throw new Error(updateError.message);
    return { ok: true };
  });
