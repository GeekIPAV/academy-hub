import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role_name")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  if (!(data ?? []).some((row) => row.role_name === "Admin" || row.role_name === "Equipa IPAV")) {
    throw new Error("Acesso restrito.");
  }
}

export const listPaginasAvaliacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("paginas_avaliacao")
      .select(pageSelect)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AvaliacaoPage[];
  });

export const getPaginaAvaliacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { data: page, error } = await supabaseAdmin
      .from("paginas_avaliacao")
      .select(pageSelect)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (page ?? null) as unknown as AvaliacaoPage | null;
  });

export const updatePaginaAvaliacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => editorSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAvaliacaoEditor(context.userId);
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
