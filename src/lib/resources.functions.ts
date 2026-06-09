import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

export type Phase = "FTC" | "FTP" | "SU" | "SF";

export interface ResourcesContext {
  isFormando: boolean;
  isAdmin: boolean;
  completed: Record<Phase, boolean>;
}

const COMPLETED_STATUSES = ["concluido", "concluído", "concluida", "concluída", "completed"];

const EMPTY: ResourcesContext = {
  isFormando: false,
  isAdmin: false,
  completed: { FTC: false, FTP: false, SU: false, SF: false },
};

export const getResourcesContext = createServerFn({ method: "GET" })
  .handler(async (): Promise<ResourcesContext> => {
    // Auth opcional: se não houver sessão, devolve estado vazio (não 401).
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return EMPTY;

    const token = authHeader.slice("Bearer ".length);
    if (!token) return EMPTY;

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return EMPTY;

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: claimsData } = await supabase.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (!userId) return EMPTY;

    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase
        .from("utilizadores")
        .select("role")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role_name")
        .eq("user_id", userId),
    ]);
    const legacyRole = profile?.role?.toLowerCase();
    const roleNames = (roleRows ?? []).map((r) => r.role_name.toLowerCase());
    const isAdmin = legacyRole === "admin" || roleNames.includes("admin");


    if (isAdmin) {
      return {
        isFormando: true,
        isAdmin: true,
        completed: { FTC: true, FTP: true, SU: true, SF: true },
      };
    }

    const { data: enrollments } = await supabase
      .from("inscritos_programa")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    const isFormando = (enrollments?.length ?? 0) > 0;
    const completed: Record<Phase, boolean> = { FTC: false, FTP: false, SU: false, SF: false };

    if (!isFormando) return { isFormando, isAdmin, completed };

    const { data: rows } = await supabaseAdmin
      .from("inscritos_acoes")
      .select("status, acoes!inner(action_type)")
      .eq("user_id", userId);

    for (const row of (rows ?? []) as Array<{
      status: string | null;
      acoes: { action_type: string | null } | null;
    }>) {
      const cat = row.acoes?.action_type as Phase | undefined;
      const st = (row.status ?? "").toLowerCase();
      if (cat && cat in completed && COMPLETED_STATUSES.includes(st)) {
        completed[cat] = true;
      }
    }

    return { isFormando, isAdmin, completed };
  });
