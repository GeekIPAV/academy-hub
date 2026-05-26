import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ResourceTypeRow {
  key: string;
  label: string;
  color: string;
  sort_order: number;
}

export function useResourceTypes() {
  return useQuery({
    queryKey: ["resource-types"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_types" as never)
        .select("key, label, color, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as ResourceTypeRow[]);
    },
  });
}

export function useResourceTypeMap() {
  const q = useResourceTypes();
  const map = new Map<string, ResourceTypeRow>();
  (q.data ?? []).forEach((t) => map.set(t.key, t));
  return { map, isLoading: q.isLoading };
}
