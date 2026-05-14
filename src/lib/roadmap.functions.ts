import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/attach-auth-client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RoadmapPhase = "FTC" | "FTP" | "SU" | "SF";

export interface RoadmapItem {
  phase: RoadmapPhase;
  label: string;
  action: {
    id: string;
    title: string | null;
    registration_status: string | null;
    action_date: string | null;
  } | null;
}

const PHASES: { phase: RoadmapPhase; label: string }[] = [
  { phase: "FTC", label: "FTC — Formação Técnica Comum" },
  { phase: "FTP", label: "FTP — Formação Técnica Profissional" },
  { phase: "SU", label: "Semana Ubuntu" },
  { phase: "SF", label: "Serviço Final" },
];

export const getRoadmap = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<RoadmapItem[]> => {
    const { supabase, userId } = context;

    // Get user's enrollment cohort (program_id + entity_id)
    const { data: enrollments, error: eErr } = await supabase
      .from("program_enrollments")
      .select("cohort_id, program_cohorts(program_id, entity_id)")
      .eq("user_id", userId)
      .limit(1);
    if (eErr) throw new Error(eErr.message);

    const cohort = (enrollments?.[0] as { program_cohorts?: { program_id: string | null; entity_id: string | null } | null } | undefined)
      ?.program_cohorts;
    const programId = cohort?.program_id ?? null;
    const entityId = cohort?.entity_id ?? null;

    if (!programId) {
      return PHASES.map((p) => ({ ...p, action: null }));
    }

    // FTC: program-wide
    const { data: ftcActions } = await supabaseAdmin
      .from("training_actions")
      .select("id, title, category, registration_status, action_date, program_id, entity_id")
      .eq("program_id", programId)
      .eq("category", "FTC")
      .order("action_date", { ascending: true, nullsFirst: false });

    // Others: program + entity
    let entityActions: typeof ftcActions = [];
    if (entityId) {
      const { data } = await supabaseAdmin
        .from("training_actions")
        .select("id, title, category, registration_status, action_date, program_id, entity_id")
        .eq("program_id", programId)
        .eq("entity_id", entityId)
        .in("category", ["FTP", "SU", "SF"])
        .order("action_date", { ascending: true, nullsFirst: false });
      entityActions = data ?? [];
    }

    const all = [...(ftcActions ?? []), ...entityActions];

    return PHASES.map(({ phase, label }) => {
      const action = all.find((a) => a.category === phase) ?? null;
      return {
        phase,
        label,
        action: action
          ? {
              id: action.id,
              title: action.title,
              registration_status: action.registration_status,
              action_date: action.action_date,
            }
          : null,
      };
    });
  });
