import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("utilizadores")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.role !== "Admin") throw new Error("Acesso restrito.");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { data: profiles, error } = await supabaseAdmin
      .from("utilizadores")
      .select("id, full_name, role, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Fetch emails from auth.users
    const { data: authList, error: authErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authErr) throw new Error(authErr.message);
    const emailById = new Map(
      authList.users.map((u) => [u.id, u.email ?? ""]),
    );

    return (profiles ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      role: p.role,
      created_at: p.created_at,
      email: emailById.get(p.id) ?? "",
    }));
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.string().min(1).max(40),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    if (data.userId === context.userId && data.role !== "Admin") {
      throw new Error("Não podes remover o teu próprio perfil de Admin.");
    }

    // Validate role exists and is active
    const { data: role, error: roleErr } = await supabaseAdmin
      .from("roles")
      .select("name, is_active")
      .eq("name", data.role)
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!role) throw new Error("Perfil inexistente.");
    if (!role.is_active) throw new Error("Perfil inativo.");

    const { error } = await supabaseAdmin
      .from("utilizadores")
      .update({ role: data.role })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
