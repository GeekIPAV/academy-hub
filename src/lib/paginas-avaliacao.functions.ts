import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AvaliacaoPage } from "@/lib/avaliacao-types";

const pageSelect = "id, slug, title, sort_order, blocks, cover_url, cover_position, cover_scale, created_at, updated_at";

export const listPaginasAvaliacao = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("paginas_avaliacao")
    .select(pageSelect)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AvaliacaoPage[];
});

export const getPaginaAvaliacao = createServerFn({ method: "GET" })
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
