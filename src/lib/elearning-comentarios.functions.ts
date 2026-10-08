import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Only Admin and Equipa IPAV may read and comment participants' reflections. */
async function assertEquipa(sb: { from: (t: "user_roles") => any }, userId: string) {
  const { data, error } = await sb.from("user_roles").select("role_name").eq("user_id", userId).in("role_name", ["Admin", "Equipa IPAV"]).limit(1);
  if (error || !data?.length) throw new Error("Apenas a Equipa IPAV pode comentar reflexões.");
}

export const listReflexoesCurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ cursoId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertEquipa(context.supabase, context.userId);
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { data: mods } = await sb.from("cursos_modulos").select("title,sort_order,cursos_passos(id,title,tipo,sort_order)").eq("curso_id", data.cursoId).order("sort_order");
    const passos = (mods ?? []).flatMap((m, mi) => (m.cursos_passos ?? []).filter((p) => p.tipo === "reflexao").sort((a, b) => a.sort_order - b.sort_order).map((p) => ({ id: p.id, title: p.title, modulo: `Módulo ${mi + 1} — ${m.title}` })));
    if (!passos.length) return [];
    const { data: prog } = await sb.from("cursos_progresso").select("id,passo_id,user_id,estado,resposta,concluido_em,comentario,comentario_autor_nome,comentario_em").in("passo_id", passos.map((p) => p.id)).eq("estado", "concluido").order("concluido_em", { ascending: false });
    const userIds = [...new Set((prog ?? []).map((p) => p.user_id))];
    const { data: users } = userIds.length ? await sb.from("utilizadores").select("id,full_name,email").in("id", userIds) : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
    return (prog ?? []).map((p) => {
      const passo = passos.find((x) => x.id === p.passo_id)!;
      const u = users?.find((x) => x.id === p.user_id);
      const r = p.resposta as { texto?: string } | null;
      return { id: p.id, passo: passo.title, modulo: passo.modulo, participante: u?.full_name || u?.email || "Participante", resposta: r?.texto ?? "", data: p.concluido_em, comentario: p.comentario, comentario_autor: p.comentario_autor_nome, comentario_em: p.comentario_em };
    });
  });

export const guardarComentarioReflexao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ progressoId: z.string().uuid(), texto: z.string().trim().max(10000) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertEquipa(context.supabase, context.userId);
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { data: autor } = await sb.from("utilizadores").select("full_name").eq("id", context.userId).maybeSingle();
    const vazio = !data.texto;
    const { error } = await sb.from("cursos_progresso").update({
      comentario: vazio ? null : data.texto,
      comentario_autor_id: vazio ? null : context.userId,
      comentario_autor_nome: vazio ? null : autor?.full_name ?? "Equipa IPAV",
      comentario_em: vazio ? null : new Date().toISOString(),
    }).eq("id", data.progressoId);
    if (error) throw new Error("Não foi possível guardar o comentário.");
    return { ok: true };
  });
