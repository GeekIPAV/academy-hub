import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface ClusterForEnrollment {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  cover_position: string | null;
  cover_scale: number | null;
  sort_order: number;
  info_pdf_url: string | null;
  has_open_program: boolean;
  programs: Array<{ id: string; title: string | null; enrollment_open: boolean }>;
}

export const listActiveClustersForEnrollment = createServerFn({ method: "GET" })
  .handler(async (): Promise<ClusterForEnrollment[]> => {
    const { data: programs, error: pErr } = await supabaseAdmin
      .from("programas")
      .select("id, title, enrollment_open, cluster_id, is_active")
      .eq("is_active", true);
    if (pErr) throw new Error(pErr.message);

    const clusterIds = Array.from(
      new Set((programs ?? []).map((p) => p.cluster_id).filter((v): v is string => !!v)),
    );
    if (clusterIds.length === 0) return [];

    const { data: clusters, error: cErr } = await supabaseAdmin
      .from("clusters")
      .select("id, name, description, cover_url, cover_position, cover_scale, sort_order")
      .in("id", clusterIds)
      .order("sort_order", { ascending: true });
    if (cErr) throw new Error(cErr.message);

    return (clusters ?? []).map((c) => {
      const progs = (programs ?? [])
        .filter((p) => p.cluster_id === c.id)
        .map((p) => ({
          id: p.id,
          title: p.title,
          enrollment_open: p.enrollment_open ?? false,
        }));
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        cover_url: c.cover_url,
        cover_position: c.cover_position,
        cover_scale: c.cover_scale,
        sort_order: c.sort_order ?? 0,
        has_open_program: progs.some((p) => p.enrollment_open),
        programs: progs,
      };
    });
  });
