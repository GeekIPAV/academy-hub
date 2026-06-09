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
    start_date: string | null;
  } | null;
}

const PHASES: { phase: RoadmapPhase; label: string }[] = [
  { phase: "FTC", label: "Formação Teórico-Conceptual" },
  { phase: "FTP", label: "Formação Teórico-Prática" },
  { phase: "SU", label: "Semana Ubuntu" },
  { phase: "SF", label: "Sessão Final" },
];

export const getRoadmap = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<RoadmapItem[]> => {
    const { supabase, userId } = context;

    const { data: enrollments, error: eErr } = await supabase
      .from("inscritos_programa")
      .select("cohort_id, entidades_programas(program_id, entity_id)")
      .eq("user_id", userId)
      .limit(1);
    if (eErr) throw new Error(eErr.message);

    const cohort = (enrollments?.[0] as { entidades_programas?: { program_id: string | null; entity_id: string | null } | null } | undefined)
      ?.entidades_programas;
    const programId = cohort?.program_id ?? null;
    const entityId = cohort?.entity_id ?? null;

    if (!programId) {
      return PHASES.map((p) => ({ ...p, action: null }));
    }

    const { data: ftcActions } = await supabaseAdmin
      .from("acoes")
      .select("id, title, action_type, registration_status, start_date, program_id, entity_id")
      .eq("program_id", programId)
      .eq("action_type", "FTC")
      .order("start_date", { ascending: true, nullsFirst: false });

    let entityActions: typeof ftcActions = [];
    if (entityId) {
      const { data } = await supabaseAdmin
        .from("acoes")
        .select("id, title, action_type, registration_status, start_date, program_id, entity_id")
        .eq("program_id", programId)
        .eq("entity_id", entityId)
        .in("action_type", ["FTP", "SU", "SF"])
        .order("start_date", { ascending: true, nullsFirst: false });
      entityActions = data ?? [];
    }

    const all = [...(ftcActions ?? []), ...entityActions];

    return PHASES.map(({ phase, label }) => {
      const action = all.find((a) => a.action_type === phase) ?? null;
      return {
        phase,
        label,
        action: action
          ? {
              id: action.id,
              title: action.title,
              registration_status: action.registration_status,
              start_date: action.start_date,
            }
          : null,
      };
    });
  });
