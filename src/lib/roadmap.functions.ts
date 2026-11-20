import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/attach-auth-client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertRouteAccess } from "@/lib/admin-access.server";

/** Página de Gestão onde a equipa consulta a jornada de cada participante. */
export const JORNADA_ADMIN_PATH = "/admin/jornada";

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

// O percurso só se aplica aos clusters de Formação de Educadores.
const ROADMAP_CLUSTERS = [
  "Formação de Educadores - 3º Ciclo e Secundário",
  "Formação de Educadores - Casas de Acolhimento",
  "Formação de Educadores - IEFP",
  "Formação de Educadores - Júnior",
  "Formação de Educadores - Ensino Superior",
];

export interface RoadmapResult {
  items: RoadmapItem[];
  /** true quando é uma pré-visualização de admin (sem inscrição própria) */
  preview: boolean;
}

export const getRoadmap = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: { cohortId?: string; userId?: string } | undefined) => {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return {
      cohortId: typeof data?.cohortId === "string" ? data.cohortId : undefined,
      userId:
        typeof data?.userId === "string" && uuidRe.test(data.userId) ? data.userId : undefined,
    };
  })
  .handler(async ({ context, data }): Promise<RoadmapResult> => {
    const empty: RoadmapResult = { items: [], preview: false };

    // Consulta da jornada de outra pessoa: só para quem tem acesso à página de Gestão.
    const viewingOther = !!data?.userId && data.userId !== context.userId;
    if (viewingOther) await assertRouteAccess(context.userId, JORNADA_ADMIN_PATH);
    const userId = viewingOther ? (data.userId as string) : context.userId;
    const supabase = viewingOther ? supabaseAdmin : context.supabase;

    let query = supabase
      .from("inscritos_programa")
      .select("cohort_id, is_formador, entidades_programas(program_id, entity_id)")
      .eq("user_id", userId);
    if (data?.cohortId) query = query.eq("cohort_id", data.cohortId);
    const { data: enrollments, error: eErr } = await query.limit(1);
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
    // de Formação de Educadores, mostramos uma pré-visualização do primeiro
    // programa ativo desses clusters.
    const { data: isAdminRpc } = viewingOther
      ? { data: false }
      : await supabaseAdmin.rpc("is_admin", { _user_id: userId });
    const isAdmin = isAdminRpc === true;

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

    items.push({ ...FORMADOR_PHASE, achieved: preview ? false : isFormador, action: null });

    return { items, preview };
  });


export interface ParticipanteJornada {
  userId: string;
  cohortId: string;
  nome: string;
  email: string | null;
  programa: string | null;
  entidade: string | null;
  estado: string | null;
}

/** Participantes inscritos em programas com jornada (Formação de Educadores). */
export const listParticipantesJornada = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<ParticipanteJornada[]> => {
    await assertRouteAccess(context.userId, JORNADA_ADMIN_PATH);

    const { data: clusters, error: cErr } = await supabaseAdmin
      .from("clusters")
      .select("id")
      .in("name", ROADMAP_CLUSTERS);
    if (cErr) throw new Error(cErr.message);
    const clusterIds = (clusters ?? []).map((c) => c.id);
    if (clusterIds.length === 0) return [];

    const { data: programas, error: pErr } = await supabaseAdmin
      .from("programas")
      .select("id, title")
      .in("cluster_id", clusterIds);
    if (pErr) throw new Error(pErr.message);
    const programaTitle = new Map((programas ?? []).map((p) => [p.id, p.title as string | null]));
    if (programaTitle.size === 0) return [];

    const { data: turmas, error: tErr } = await supabaseAdmin
      .from("entidades_programas")
      .select("id, program_id, entity_id")
      .in("program_id", [...programaTitle.keys()]);
    if (tErr) throw new Error(tErr.message);
    const turmaById = new Map((turmas ?? []).map((t) => [t.id, t]));
    if (turmaById.size === 0) return [];

    const { data: inscritos, error: iErr } = await supabaseAdmin
      .from("inscritos_programa")
      .select("user_id, cohort_id, status, created_at")
      .in("cohort_id", [...turmaById.keys()])
      .order("created_at", { ascending: false });
    if (iErr) throw new Error(iErr.message);
    const rows = inscritos ?? [];
    if (rows.length === 0) return [];

    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
    const entityIds = [
      ...new Set((turmas ?? []).map((t) => t.entity_id).filter(Boolean)),
    ] as string[];

    const [{ data: users }, { data: entidades }] = await Promise.all([
      supabaseAdmin.from("utilizadores").select("id, full_name, email").in("id", userIds),
      entityIds.length
        ? supabaseAdmin.from("entidades").select("id, name").in("id", entityIds)
        : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
    ]);
    const userById = new Map((users ?? []).map((u) => [u.id, u]));
    const entidadeName = new Map((entidades ?? []).map((e) => [e.id, e.name as string | null]));

    return rows
      .filter((r) => r.user_id && r.cohort_id)
      .map((r) => {
        const turma = turmaById.get(r.cohort_id as string);
        const u = userById.get(r.user_id as string);
        return {
          userId: r.user_id as string,
          cohortId: r.cohort_id as string,
          nome: (u?.full_name as string | null)?.trim() || (u?.email as string | null) || "Sem nome",
          email: (u?.email as string | null) ?? null,
          programa: turma?.program_id ? (programaTitle.get(turma.program_id) ?? null) : null,
          entidade: turma?.entity_id ? (entidadeName.get(turma.entity_id) ?? null) : null,
          estado: (r.status as string | null) ?? null,
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
  });
