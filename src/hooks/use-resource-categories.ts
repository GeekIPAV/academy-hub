import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ResourceCategoryRow {
  key: string;
  label: string;
  color: string;
  sort_order: number;
}

export function useResourceCategories() {
  return useQuery({
    queryKey: ["resource-categories"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => any })
        .from("resource_categories")
        .select("key, label, color, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as ResourceCategoryRow[]);
    },
  });
}

export function useResourceCategoryMap() {
  const q = useResourceCategories();
  const map = new Map<string, ResourceCategoryRow>();
  (q.data ?? []).forEach((c) => map.set(c.key, c));
  return { map, isLoading: q.isLoading };
}
