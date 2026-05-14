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

    const { data: enrollments } = await supabase
      .from("program_enrollments")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    const isFormando = (enrollments?.length ?? 0) > 0;
    const completed: Record<Phase, boolean> = { FTC: false, FTP: false, SU: false, SF: false };

    if (!isFormando) return { isFormando, completed };

    const { data: rows } = await supabaseAdmin
      .from("enrollments")
      .select("status, training_actions!inner(category)")
      .eq("user_id", userId);

    for (const row of (rows ?? []) as Array<{
      status: string | null;
      training_actions: { category: string | null } | null;
    }>) {
      const cat = row.training_actions?.category as Phase | undefined;
      const st = (row.status ?? "").toLowerCase();
      if (cat && cat in completed && COMPLETED_STATUSES.includes(st)) {
        completed[cat] = true;
      }
    }

    return { isFormando, completed };
  });
