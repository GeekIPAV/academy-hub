import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { deleteCluster, listClusters, upsertCluster } from "@/lib/clusters.functions";

export interface ClusterRow {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  cover_position: string | null;
  cover_scale: number | null;
  sort_order: number;
}

export function useClusters() {
  const fn = useServerFn(listClusters);
  return useQuery<ClusterRow[]>({
    queryKey: ["clusters", "v2"],
    queryFn: () => fn() as Promise<ClusterRow[]>,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

export function useUpsertCluster() {
  const qc = useQueryClient();
  const fn = useServerFn(upsertCluster);
  return useMutation({
    mutationFn: (vars: {
      id?: string;
      name: string;
      description?: string | null;
      cover_url?: string | null;
      cover_position?: string | null;
      cover_scale?: number | null;
      sort_order?: number;
    }) => fn({ data: vars }),
    onSuccess: () => {
      toast.success("Cluster guardado.");
      qc.invalidateQueries({ queryKey: ["clusters", "v2"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCluster() {
  const qc = useQueryClient();
  const fn = useServerFn(deleteCluster);
  return useMutation({
    mutationFn: (vars: { id: string }) => fn({ data: vars }),
    onSuccess: () => {
      toast.success("Cluster eliminado.");
      qc.invalidateQueries({ queryKey: ["clusters", "v2"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
