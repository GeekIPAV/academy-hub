import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Every quiz attempt (from the activity log) for one course; Admin and Equipa IPAV only. */
export const listRespostasQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ cursoId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase.from("user_roles").select("role_name").eq("user_id", context.userId).in("role_name", ["Admin", "Equipa IPAV"]).limit(1);
    if (!r?.length) throw new Error("Apenas a Equipa IPAV pode consultar as respostas.");
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { data: mods } = await sb.from("cursos_modulos").select("title,sort_order,cursos_passos(id,title,tipo)").eq("curso_id", data.cursoId).order("sort_order");
    const quizzes = (mods ?? []).flatMap((m, mi) => (m.cursos_passos ?? []).filter((p) => p.tipo === "quiz").map((p) => ({ id: p.id, title: p.title, modulo: `Módulo ${mi + 1} — ${m.title}` })));
    if (!quizzes.length) return [];
    const ids = quizzes.map((q) => q.id);
    const [{ data: perguntas }, { data: atividade }] = await Promise.all([
      sb.from("cursos_quiz_perguntas").select("id,passo_id,enunciado,opcoes,sort_order").in("passo_id", ids).order("sort_order"),
      sb.from("cursos_atividade").select("id,user_id,passo_id,payload,created_at").in("passo_id", ids).eq("evento", "submissao_quiz").order("created_at", { ascending: false }),
    ]);
    const userIds = [...new Set((atividade ?? []).map((a) => a.user_id))];
    const { data: users } = userIds.length ? await sb.from("utilizadores").select("id,full_name,email").in("id", userIds) : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
    return (atividade ?? []).map((a) => {
      const quiz = quizzes.find((q) => q.id === a.passo_id)!;
      const u = users?.find((x) => x.id === a.user_id);
      const p = (a.payload ?? {}) as { nota?: number; aprovado?: boolean; respostas?: Record<string, string[]> };
      const qs = (perguntas ?? []).filter((q) => q.passo_id === a.passo_id).map((q) => {
        const opcoes = (q.opcoes ?? []) as { id: string; texto: string; correta?: boolean }[];
        const dadas = p.respostas?.[q.id] ?? [];
        const corretas = opcoes.filter((o) => o.correta).map((o) => o.id);
        const ok = corretas.length === dadas.length && corretas.every((c) => dadas.includes(c));
        return { enunciado: q.enunciado, resposta: opcoes.filter((o) => dadas.includes(o.id)).map((o) => o.texto).join(", "), correta: ok };
      });
      return { id: a.id, participante: u?.full_name || u?.email || "Participante", quiz: quiz.title, modulo: quiz.modulo, nota: p.nota ?? null, aprovado: !!p.aprovado, data: a.created_at, perguntas: p.respostas ? qs : [] };
    });
  });
