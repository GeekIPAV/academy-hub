import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { INVITE_TYPES, rolesForInviteTipo, type InviteTipo } from "@/lib/invite-types";

/**
 * Devolve (ou cria) o link permanente e reutilizável de um tipo
 * ("utilizador" ou "entidade"). O perfil de quem entra fica definido pelo tipo.
 */
export async function getOrCreateTypedInviteToken(tipo: InviteTipo, createdBy: string) {
  const meta = INVITE_TYPES[tipo];
  const { data: existing, error: fErr } = await supabaseAdmin
    .from("convites")
    .select("token, roles, expires_at, max_uses, uses_count")
    .eq("label", meta.genericLabel)
    .is("entity_id", null)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(5);
  if (fErr) throw new Error(fErr.message);
  const usable = (existing ?? []).find(
    (inv) =>
      Array.isArray(inv.roles) &&
      inv.roles.length === 1 &&
      inv.roles[0] === meta.role &&
      (!inv.expires_at || new Date(inv.expires_at).getTime() > Date.now()) &&
      (inv.max_uses == null || (inv.uses_count ?? 0) < inv.max_uses),
  );
  if (usable) return usable.token as string;

  const { data: created, error: cErr } = await supabaseAdmin
    .from("convites")
    .insert({
      roles: rolesForInviteTipo(tipo),
      label: meta.genericLabel,
      created_by: createdBy,
      expires_at: null,
      max_uses: null,
      entity_id: null,
    })
    .select("token")
    .single();
  if (cErr) throw new Error(cErr.message);
  return created.token as string;
}
