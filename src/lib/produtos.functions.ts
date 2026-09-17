import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProdutoRow = {
  id: string;
  name: string;
  tipo: string | null;
  description: string | null;
  sort_order: number | null;
};

/** Catálogo de produtos partilhado por Programas e Ações. */
export const listProdutos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("produtos")
      .select("id, name, tipo, description, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ProdutoRow[];
  });
