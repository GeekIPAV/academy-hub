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

export interface RoadmapResult {
  items: RoadmapItem[];
  /** true quando é uma pré-visualização de admin (sem inscrição própria) */
  preview: boolean;
}

export const getRoadmap = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<RoadmapResult> => {
    const { supabase, userId } = context;
    const empty: RoadmapResult = { items: [], preview: false };

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
    let programId = cohort?.program_id ?? null;
    let entityId = cohort?.entity_id ?? null;
    const isFormador = enrollment?.is_formador === true;
    let preview = false;

    // Admins veem sempre o widget: se não tiverem inscrição própria num cluster
    // de Formação de Formadores, mostramos uma pré-visualização do primeiro
    // programa ativo desses clusters.
    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: userId });

    const clusterOf = async (id: string) => {
      const { data } = await supabaseAdmin
        .from("programas")
        .select("cluster_id, clusters(name)")
        .eq("id", id)
        .maybeSingle();
      return (
        (data as { clusters?: { name?: string | null } | null } | null)?.clusters?.name ?? null
      );
    };

    let clusterName = programId ? await clusterOf(programId) : null;

    if (!clusterName || !ROADMAP_CLUSTERS.includes(clusterName)) {
      if (!isAdmin) return empty;

      const { data: clusterRows } = await supabaseAdmin
        .from("clusters")
        .select("id, name")
        .in("name", ROADMAP_CLUSTERS);
      const clusterIds = (clusterRows ?? []).map((c) => c.id);
      if (clusterIds.length === 0) return empty;

      const { data: fallback } = await supabaseAdmin
        .from("programas")
        .select("id, cluster_id")
        .in("cluster_id", clusterIds)
        .eq("is_active", true)
        .limit(1);
      const fallbackProgram = fallback?.[0];
      if (!fallbackProgram) return empty;

      programId = fallbackProgram.id;
      entityId = null;
      preview = true;
      clusterName =
        (clusterRows ?? []).find((c) => c.id === fallbackProgram.cluster_id)?.name ?? null;
    }

    if (!programId) return empty;




    const { data: ftcActions } = await supabaseAdmin
      .from("acoes")
      .select("id, title, action_type, registration_status, start_date, program_id, entity_id")
      .eq("program_id", programId)
      .eq("action_type", "FTC")
      .order("start_date", { ascending: true, nullsFirst: false });

    let entityActions: typeof ftcActions = [];
    if (entityId || preview) {
      let q = supabaseAdmin
        .from("acoes")
        .select("id, title, action_type, registration_status, start_date, program_id, entity_id")
        .eq("program_id", programId)
        .in("action_type", ["FTP", "SU", "SF"]);
      if (entityId) q = q.eq("entity_id", entityId);
      const { data } = await q.order("start_date", { ascending: true, nullsFirst: false });
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

