import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/attach-auth-client";

export interface MeuPrograma {
  cohort_id: string;
  program_id: string;
  program_title: string | null;
  cluster_id: string | null;
  cluster_name: string | null;
  status: string | null;
}

export const getMeusProgramas = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<MeuPrograma[]> => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: enrollments, error } = await supabase
      .from("inscritos_programa")
      .select("cohort_id, status")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!enrollments || enrollments.length === 0) return [];

    const cohortIds = enrollments.map((e) => e.cohort_id).filter((v): v is string => !!v);
    if (cohortIds.length === 0) return [];

    const { data: cohorts } = await supabaseAdmin
      .from("entidades_programas")
      .select("id, program_id")
      .in("id", cohortIds);

    const programIds = Array.from(new Set((cohorts ?? []).map((c) => c.program_id).filter((v): v is string => !!v)));
    if (programIds.length === 0) return [];

    const { data: programs } = await supabaseAdmin
      .from("programas")
      .select("id, title, cluster_id")
      .in("id", programIds);

    const clusterIds = Array.from(new Set((programs ?? []).map((p) => p.cluster_id).filter((v): v is string => !!v)));
    const { data: clusters } = clusterIds.length
      ? await supabaseAdmin.from("clusters").select("id, name").in("id", clusterIds)
      : { data: [] as { id: string; name: string }[] };

    return enrollments
      .map((e) => {
        const cohort = (cohorts ?? []).find((c) => c.id === e.cohort_id);
        const program = cohort ? (programs ?? []).find((p) => p.id === cohort.program_id) : null;
        if (!cohort || !program) return null;
        const cluster = program.cluster_id ? (clusters ?? []).find((c) => c.id === program.cluster_id) : null;
        return {
          cohort_id: e.cohort_id,
          program_id: program.id,
          program_title: program.title,
          cluster_id: program.cluster_id,
          cluster_name: cluster?.name ?? null,
          status: e.status,
        };
      })
      .filter((v): v is MeuPrograma => v !== null);
  });
