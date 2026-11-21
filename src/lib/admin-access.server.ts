import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Papéis com acesso a tudo (gestão e plataforma). Mantém igual a
 * `PAPEIS_ACESSO_TOTAL` em src/lib/acesso.ts e à função SQL `is_admin`.
 */
export const PAPEIS_ACESSO_TOTAL = ["Admin", "Equipa IPAV"] as const;

async function papeisDe(userId: string): Promise<string[]> {
  const [{ data: roleRows, error }, { data: legacy }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("role_name").eq("user_id", userId),
    supabaseAdmin.from("utilizadores").select("role").eq("id", userId).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  const roles = (roleRows ?? []).map((r) => r.role_name as string);
  if (legacy?.role && !roles.includes(legacy.role)) roles.push(legacy.role);
  return roles;
}

/** Admin ou Equipa IPAV (em user_roles ou no papel antigo em utilizadores). */
export async function temAcessoTotal(userId: string): Promise<boolean> {
  const roles = await papeisDe(userId);
  return roles.some((r) => (PAPEIS_ACESSO_TOTAL as readonly string[]).includes(r));
}

export async function assertAcessoTotal(userId: string) {
  if (!(await temAcessoTotal(userId))) throw new Error("Acesso restrito.");
}

/**
 * Server-only access guard for admin routes.
 *
 * Allows the request when:
 *   1. The user has the "Admin" or "Equipa IPAV" role (in user_roles or utilizadores.role); or
 *   2. The user has at least one role with an entry in permissoes_roles
 *      granting access to `routePath` (tipo='rota').
 *
 * Throws "Acesso restrito." otherwise.
 *
 * This mirrors the front-end matrix (Central de Comando), so a non-Admin
 * user that an admin has authorised in the matrix can use the page server-
 * side too. Note: this is route-level access. Sensitive mutations should
 * still call assertIsAdmin() explicitly if they must be Admin-only.
 */
export async function assertRouteAccess(userId: string, routePath: string) {
  // Roles via user_roles
  const { data: roleRows, error: rErr } = await supabaseAdmin
    .from("user_roles")
    .select("role_name")
    .eq("user_id", userId);
  if (rErr) throw new Error(rErr.message);
  const roles = (roleRows ?? []).map((r) => r.role_name as string);

  // Legacy single role on utilizadores
  if (!roles.length || !roles.includes("Admin")) {
    const { data: legacy } = await supabaseAdmin
      .from("utilizadores")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (legacy?.role && !roles.includes(legacy.role)) roles.push(legacy.role);
  }

  if (roles.some((r) => (PAPEIS_ACESSO_TOTAL as readonly string[]).includes(r))) return;
  if (roles.length === 0) throw new Error("Acesso restrito.");

  const { data: perms, error: pErr } = await supabaseAdmin
    .from("permissoes_roles")
    .select("id")
    .eq("resource_id", routePath)
    .eq("tipo", "rota")
    .in("role_name", roles)
    .limit(1);
  if (pErr) throw new Error(pErr.message);
  if (!perms || perms.length === 0) throw new Error("Acesso restrito.");
}

/** Strict Admin-only guard (kept for the rare cases that must stay Admin). */
export async function assertIsAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role_name")
    .eq("user_id", userId)
    .eq("role_name", "Admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const { data: legacy } = await supabaseAdmin
      .from("utilizadores")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (legacy?.role !== "Admin") throw new Error("Acesso restrito.");
  }
}
