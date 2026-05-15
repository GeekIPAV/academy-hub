import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/attach-auth-client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Phase = "FTC" | "FTP" | "SU" | "SF";

export interface ResourcesContext {
  isFormando: boolean;
  isAdmin: boolean;
  completed: Record<Phase, boolean>;
}

const COMPLETED_STATUSES = ["concluido", "concluído", "concluida", "concluída", "completed"];

export const getResourcesContext = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<ResourcesContext> => {
    const { supabase, userId } = context;

    const { data: profile } = await supabaseAdmin
      .from("utilizadores")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    const isAdmin = (profile as { role?: string } | null)?.role === "admin";

    const { data: enrollments } = await supabase
      .from("inscritos_programa")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    const isFormando = (enrollments?.length ?? 0) > 0;
    const completed: Record<Phase, boolean> = { FTC: false, FTP: false, SU: false, SF: false };

    // Admins têm acesso total a tudo, sem precisar de inscrição/conclusão
    if (isAdmin) {
      return {
        isFormando: true,
        isAdmin: true,
        completed: { FTC: true, FTP: true, SU: true, SF: true },
      };
    }

    if (!isFormando) return { isFormando, isAdmin, completed };

    const { data: rows } = await supabaseAdmin
      .from("inscritos_acoes")
      .select("status, acoes!inner(category)")
      .eq("user_id", userId);

    for (const row of (rows ?? []) as Array<{
      status: string | null;
      acoes: { category: string | null } | null;
    }>) {
      const cat = row.acoes?.category as Phase | undefined;
      const st = (row.status ?? "").toLowerCase();
      if (cat && cat in completed && COMPLETED_STATUSES.includes(st)) {
        completed[cat] = true;
      }
    }

    return { isFormando, isAdmin, completed };
  });
