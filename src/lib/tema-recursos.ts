import { supabase } from "@/integrations/supabase/client";

/**
 * Sincroniza os recursos associados a um tema sem mexer na ordem existente.
 *
 * - Recursos que já estavam associados mantêm o seu `sort_order`.
 * - Recursos removidos da seleção são desassociados.
 * - Recursos novos são acrescentados no fim, pela ordem em que foram
 *   selecionados, a seguir ao maior `sort_order` atual.
 */
export async function syncTemaRecursos(temaId: string, selectedIds: Iterable<string>) {
  const { data, error } = await supabase
    .from("tema_recursos")
    .select("recurso_id, sort_order")
    .eq("tema_id", temaId);
  if (error) throw error;

  const rows = (data ?? []) as Array<{ recurso_id: string; sort_order: number | null }>;
  const current = new Set(rows.map((r) => r.recurso_id));
  const selected = [...new Set(selectedIds)];
  const selectedSet = new Set(selected);

  const toRemove = rows.map((r) => r.recurso_id).filter((id) => !selectedSet.has(id));
  const toAdd = selected.filter((id) => !current.has(id));

  if (toRemove.length > 0) {
    const { error: delErr } = await supabase
      .from("tema_recursos")
      .delete()
      .eq("tema_id", temaId)
      .in("recurso_id", toRemove);
    if (delErr) throw delErr;
  }

  if (toAdd.length > 0) {
    const maxOrder = rows.reduce(
      (max, r) => (typeof r.sort_order === "number" && r.sort_order > max ? r.sort_order : max),
      0,
    );
    const { error: insErr } = await supabase.from("tema_recursos").insert(
      toAdd.map((recurso_id, i) => ({
        tema_id: temaId,
        recurso_id,
        sort_order: maxOrder + (i + 1) * 10,
      })),
    );
    if (insErr) throw insErr;
  }

  return { added: toAdd.length, removed: toRemove.length };
}
