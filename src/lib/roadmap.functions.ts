import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/attach-auth-client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RoadmapPhase = "FTC" | "FTP" | "SU" | "SF" | "FORMADOR";

export interface RoadmapItem {
  phase: RoadmapPhase;
  label: string;
  achieved?: boolean;
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

const FORMADOR_PHASE: { phase: RoadmapPhase; label: string } = {
  phase: "FORMADOR",
  label: "Formador",
};

// O percurso só se aplica aos clusters de Formação de Formadores.
const ROADMAP_CLUSTERS = [
  "Formação de Formadores - 3º Ciclo e Secundário",
  "Formação de Formadores - Casas de Acolhimento",
  "Formação de Formadores - IEFP",
  "Formação de Formadores - Júnior",
  "Formação de Formadores Educadores - Ensino Superior",
];

export const getRoadmap = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<RoadmapItem[]> => {
    const { supabase, userId } = context;

    const { data: enrollments, error: eErr } = await supabase
      .from("inscritos_programa")
      .select("cohort_id, is_formador, entidades_programas(program_id, entity_id)")
      .eq("user_id", userId)
      .limit(1);
    if (eErr) throw new Error(eErr.message);

    const enrollment = enrollments?.[0] as
      | {
          is_formador?: boolean | null;
          entidades_programas?: { program_id: string | null; entity_id: string | null } | null;
        }
      | undefined;
    const cohort = enrollment?.entidades_programas;
    const programId = cohort?.program_id ?? null;
    const entityId = cohort?.entity_id ?? null;
    const isFormador = enrollment?.is_formador === true;

    if (!programId) {
      return [];
    }

    // Só mostra o percurso para programas dos clusters de Formação de Formadores.
    const { data: programa } = await supabaseAdmin
      .from("programas")
      .select("cluster_id, clusters(name)")
      .eq("id", programId)
      .maybeSingle();
    const clusterName =
      (programa as { clusters?: { name?: string | null } | null } | null)?.clusters?.name ?? null;
    if (!clusterName || !ROADMAP_CLUSTERS.includes(clusterName)) {
      return [];
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

    const items: RoadmapItem[] = PHASES.map(({ phase, label }) => {
      const action = all.find((a) => a.action_type === phase) ?? null;
      return {
        phase,
        label,
        achieved: false,
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

    items.push({ ...FORMADOR_PHASE, achieved: isFormador, action: null });

    return items;
  });

