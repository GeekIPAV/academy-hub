import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { entradaSubmetida } from "@/lib/elearning-sequencial";

/** No user ID is accepted: RLS and explicit ownership both scope this read. */
export const getCaderno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ cursoId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: inscricao, error: enrollmentError } = await sb.from("cursos_inscricoes").select("id").eq("user_id", context.userId).eq("curso_id", data.cursoId).neq("estado", "cancelado").maybeSingle();
    if (enrollmentError) throw new Error("Não foi possível abrir o Caderno.");
    if (!inscricao) throw new Error("Inscreve-te no curso para abrir o teu Caderno.");
    const [{ data: curso, error: courseError }, { data: perfil }, { data: modulos, error: modulesError }, { data: respostas, error: responsesError }] = await Promise.all([
      sb.from("cursos").select("title").eq("id", data.cursoId).single(),
      sb.from("utilizadores").select("full_name").eq("id", context.userId).maybeSingle(),
      sb.from("cursos_modulos").select("id,title,sort_order,cursos_passos(id,title,tipo,conteudo,sort_order)").eq("curso_id", data.cursoId).order("sort_order"),
      sb.from("cursos_progresso").select("passo_id,estado,resposta,concluido_em,comentario,comentario_autor_nome,comentario_em").eq("inscricao_id", inscricao.id).eq("user_id", context.userId),
    ]);
    if (!curso || courseError || modulesError || responsesError) throw new Error("Não foi possível carregar o teu Caderno.");
    return {
      nome: perfil?.full_name ?? "",
      curso: curso.title,
      modulos: (modulos ?? []).map((m, i) => ({ id: m.id, title: m.title, indice: i + 1, entradas: [...(m.cursos_passos ?? [])].sort((a, b) => a.sort_order - b.sort_order).filter((p) => p.tipo === "reflexao").map((p) => {
        const r = respostas?.find((item) => item.passo_id === p.id);
        const c = p.conteudo && typeof p.conteudo === "object" && !Array.isArray(p.conteudo) ? p.conteudo : {};
        const pergunta = typeof c.enunciado === "string" ? c.enunciado : typeof c.pergunta === "string" ? c.pergunta : typeof c.html === "string" ? c.html : p.title;
        const resposta = r ? entradaSubmetida(r.estado, r.resposta) : null;
        return { passoId: p.id, title: p.title, pergunta, resposta, data: r?.estado === "concluido" ? r.concluido_em : null, comentario: resposta && r?.comentario ? { texto: r.comentario, autor: r.comentario_autor_nome ?? "Equipa IPAV", em: r.comentario_em } : null };
      }) })),
    };
  });