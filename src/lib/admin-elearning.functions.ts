import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function guard(userId: string) {
  const { assertElearningAdmin } = await import("@/lib/elearning.server");
  await assertElearningAdmin(userId);
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}
function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

export const listCursosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await guard(context.userId);
    const rows = must(
      await sb
        .from("cursos")
        .select("id, title, estado, modalidade, tipo, horas, cluster_id, cover_url, cover_position, cover_scale, clusters(name), cursos_modulos(id), cursos_inscricoes(id)")
        .order("created_at", { ascending: false }),
    );
    return (rows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      estado: r.estado,
      modalidade: r.modalidade,
      tipo: r.tipo,
      horas: r.horas != null ? Number(r.horas) : null,
      cluster_name: (r.clusters as { name: string } | null)?.name ?? null,
      cover_url: r.cover_url,
      cover_position: r.cover_position,
      cover_scale: Number(r.cover_scale),
      modulos: (r.cursos_modulos ?? []).length,
      inscritos: (r.cursos_inscricoes ?? []).length,
    }));
  });

const cursoSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(300),
  description: z.string().max(20000).nullable().optional(),
  cover_url: z.string().nullable().optional(),
  cover_position: z.string().optional(),
  cover_scale: z.number().optional(),
  cluster_id: z.string().uuid().nullable().optional(),
  program_id: z.string().uuid().nullable().optional(),
  modalidade: z.enum(["autonomo", "turma"]),
  estado: z.enum(["rascunho", "publicado", "arquivado"]),
  tipo: z.enum(["formacao_formadores", "microcurso", "semana_ubuntu", "renovacao"]),
  horas: z.number().min(0).nullable().optional(),
  tem_certificado: z.boolean(),
  acreditacao_ref: z.string().max(300).nullable().optional(),
  badge_entrada_id: z.string().uuid().nullable().optional(),
  badge_final_id: z.string().uuid().nullable().optional(),
  badge_renovado_id: z.string().uuid().nullable().optional(),
  nota_minima_quiz: z.number().int().min(0).max(100),
  pct_minima_video: z.number().int().min(0).max(100),
});
export type CursoInput = z.infer<typeof cursoSchema>;

export const getCursoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = await guard(context.userId);
    const curso = must(await sb.from("cursos").select("*").eq("id", data.id).single());
    const modulos = must(
      await sb
        .from("cursos_modulos")
        .select("id, title, description, sort_order, tema_id, abertura_dias, cursos_passos(id, title, sort_order, tipo, obrigatorio, duracao_min, conteudo)")
        .eq("curso_id", data.id)
        .order("sort_order"),
    );
    const passoIds = (modulos ?? []).flatMap((m) => (m.cursos_passos ?? []).map((p) => p.id));
    const perguntas = passoIds.length
      ? must(await sb.from("cursos_quiz_perguntas").select("*").in("passo_id", passoIds).order("sort_order"))
      : [];
    const turmas = must(await sb.from("cursos_turmas").select("*").eq("curso_id", data.id).order("data_inicio", { ascending: false }));
    return {
      curso: { ...curso, horas: curso.horas != null ? Number(curso.horas) : null, cover_scale: Number(curso.cover_scale) },
      modulos: (modulos ?? []).map((m) => ({
        ...m,
        passos: [...(m.cursos_passos ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((p) => ({
            ...p,
            conteudo: (p.conteudo ?? {}) as Record<string, unknown>,
            perguntas: (perguntas ?? [])
              .filter((q) => q.passo_id === p.id)
              .map((q) => ({ id: q.id, enunciado: q.enunciado, tipo: q.tipo as "unica" | "multipla", opcoes: q.opcoes as { id: string; texto: string; correta: boolean; feedback?: string }[] })),
          })),
      })),
      turmas: turmas ?? [],
    };
  });

export const upsertCurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => cursoSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = await guard(context.userId);
    const { id, ...rest } = data;
    if (id) {
      must(await sb.from("cursos").update(rest).eq("id", id));
      return { id };
    }
    const row = must(await sb.from("cursos").insert({ ...rest, created_by: context.userId }).select("id").single());
    return { id: row.id };
  });

export const deleteCurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = await guard(context.userId);
    const { count } = await sb.from("cursos_inscricoes").select("id", { count: "exact", head: true }).eq("curso_id", data.id);
    if ((count ?? 0) > 0) throw new Error("O curso tem inscrições — arquiva-o em vez de eliminar.");
    must(await sb.from("cursos").delete().eq("id", data.id));
    return { ok: true };
  });

export const upsertModulo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid().optional(),
      curso_id: z.string().uuid(),
      title: z.string().trim().min(1).max(300),
      description: z.string().max(20000).nullable().optional(),
      tema_id: z.string().uuid().nullable().optional(),
      abertura_dias: z.number().int().min(0).max(3650).nullable().optional(),
      sort_order: z.number().int().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = await guard(context.userId);
    const { id, ...rest } = data;
    if (id) {
      must(await sb.from("cursos_modulos").update(rest).eq("id", id));
      return { id };
    }
    const { count } = await sb.from("cursos_modulos").select("id", { count: "exact", head: true }).eq("curso_id", data.curso_id);
    const row = must(await sb.from("cursos_modulos").insert({ ...rest, sort_order: rest.sort_order ?? count ?? 0 }).select("id").single());
    return { id: row.id };
  });

const opcaoSchema = z.object({ id: z.string(), texto: z.string().max(2000), correta: z.boolean(), feedback: z.string().max(2000).optional() });
const perguntaSchema = z.object({ id: z.string().optional(), enunciado: z.string().min(1).max(4000), tipo: z.enum(["unica", "multipla"]), opcoes: z.array(opcaoSchema).max(12) });

export const upsertPasso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid().optional(),
      modulo_id: z.string().uuid(),
      title: z.string().trim().min(1).max(300),
      tipo: z.enum(["video", "texto", "recurso", "quiz", "reflexao"]),
      obrigatorio: z.boolean(),
      duracao_min: z.number().int().min(0).max(1000).nullable().optional(),
      conteudo: z.record(z.string(), z.unknown()).default({}),
      perguntas: z.array(perguntaSchema).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = await guard(context.userId);
    const { id, perguntas, ...rest } = data;
    const conteudo = { ...rest.conteudo };
    if (typeof conteudo.html === "string") {
      const { sanitizeRichHtml } = await import("@/lib/sanitize-html");
      conteudo.html = sanitizeRichHtml(conteudo.html);
    }
    const row = { ...rest, conteudo: conteudo as never };
    let passoId = id;
    if (id) must(await sb.from("cursos_passos").update(row).eq("id", id));
    else {
      const { count } = await sb.from("cursos_passos").select("id", { count: "exact", head: true }).eq("modulo_id", data.modulo_id);
      passoId = must(await sb.from("cursos_passos").insert({ ...row, sort_order: count ?? 0 }).select("id").single()).id;
    }
    if (perguntas && data.tipo === "quiz") {
      must(await sb.from("cursos_quiz_perguntas").delete().eq("passo_id", passoId!));
      if (perguntas.length)
        must(
          await sb.from("cursos_quiz_perguntas").insert(
            perguntas.map((q, i) => ({ passo_id: passoId!, sort_order: i, enunciado: q.enunciado, tipo: q.tipo, opcoes: q.opcoes as never })),
          ),
        );
    }
    return { id: passoId! };
  });

export const deleteItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ tabela: z.enum(["cursos_modulos", "cursos_passos", "cursos_turmas"]), id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = await guard(context.userId);
    must(await sb.from(data.tabela).delete().eq("id", data.id));
    return { ok: true };
  });

export const reordenar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      tabela: z.enum(["cursos_modulos", "cursos_passos"]),
      ids: z.array(z.string().uuid()).max(500),
      modulo_id: z.string().uuid().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = await guard(context.userId);
    await Promise.all(
      data.ids.map((id, i) =>
        sb.from(data.tabela).update(data.tabela === "cursos_passos" && data.modulo_id ? { sort_order: i, modulo_id: data.modulo_id } : { sort_order: i }).eq("id", id),
      ),
    );
    return { ok: true };
  });

export const importarTemasCluster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ cursoId: z.string().uuid(), clusterId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = await guard(context.userId);
    const temas = must(
      await sb.from("temas_momentos").select("id, title, description, order_index, bloco_order").eq("cluster_id", data.clusterId).order("bloco_order").order("order_index"),
    );
    const existentes = must(await sb.from("cursos_modulos").select("tema_id, sort_order").eq("curso_id", data.cursoId));
    const ja = new Set((existentes ?? []).map((m) => m.tema_id).filter(Boolean));
    let ordem = (existentes ?? []).length;
    const novos = (temas ?? [])
      .filter((t) => !ja.has(t.id))
      .map((t, i) => ({ curso_id: data.cursoId, title: t.title, description: t.description, tema_id: t.id, sort_order: ordem++, abertura_dias: i }));
    if (novos.length) must(await sb.from("cursos_modulos").insert(novos));
    return { importados: novos.length };
  });

export const upsertTurma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid().optional(),
      curso_id: z.string().uuid(),
      nome: z.string().trim().min(1).max(200),
      data_inicio: z.string().nullable().optional(),
      data_fim: z.string().nullable().optional(),
      vagas: z.number().int().min(1).nullable().optional(),
      formador_id: z.string().uuid().nullable().optional(),
      inscricoes_abertas: z.boolean(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = await guard(context.userId);
    const { id, ...rest } = data;
    if (id) {
      must(await sb.from("cursos_turmas").update(rest).eq("id", id));
      return { id };
    }
    return { id: must(await sb.from("cursos_turmas").insert(rest).select("id").single()).id };
  });

export const listOpcoesElearning = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await guard(context.userId);
    const [clusters, badges, programas, recursos, formadoresRoles] = await Promise.all([
      sb.from("clusters").select("id, name, formando_badge_id, final_badge_id").order("sort_order"),
      sb.from("badges").select("id, title, kind, cluster_id").order("title"),
      sb.from("programas").select("id, title").order("title"),
      sb.from("recursos").select("id, title, resource_type").order("title"),
      sb.from("user_roles").select("user_id").eq("role_name", "Formador"),
    ]);
    const ids = [...new Set((formadoresRoles.data ?? []).map((r) => r.user_id))];
    const formadores = ids.length ? (await sb.from("utilizadores").select("id, full_name, email").in("id", ids)).data ?? [] : [];
    return {
      clusters: clusters.data ?? [],
      badges: badges.data ?? [],
      programas: programas.data ?? [],
      recursos: recursos.data ?? [],
      formadores: formadores.map((f) => ({ id: f.id, nome: f.full_name || f.email || f.id })),
    };
  });

export const listInscritos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ cursoId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = await guard(context.userId);
    const inscs = must(
      await sb.from("cursos_inscricoes").select("id, user_id, turma_id, estado, inscrito_em, concluido_em, utilizadores(full_name, email)").eq("curso_id", data.cursoId).order("inscrito_em"),
    );
    const mods = must(await sb.from("cursos_modulos").select("cursos_passos(id, tipo)").eq("curso_id", data.cursoId));
    const passos = (mods ?? []).flatMap((m) => m.cursos_passos ?? []);
    const quizIds = new Set(passos.filter((p) => p.tipo === "quiz").map((p) => p.id));
    const ids = (inscs ?? []).map((i) => i.id);
    const prog = ids.length ? must(await sb.from("cursos_progresso").select("inscricao_id, passo_id, estado, nota").in("inscricao_id", ids)) : [];
    const certs = ids.length ? must(await sb.from("certificados_elearning").select("inscricao_id, codigo, storage_path").in("inscricao_id", ids)) : [];
    const { data: curso } = await sb.from("cursos").select("badge_final_id").eq("id", data.cursoId).single();
    const badges = curso?.badge_final_id
      ? must(await sb.from("user_badges").select("user_id").eq("badge_id", curso.badge_final_id))
      : [];
    const comBadge = new Set((badges ?? []).map((b) => b.user_id));
    return (inscs ?? []).map((i) => {
      const mine = (prog ?? []).filter((p) => p.inscricao_id === i.id);
      const done = mine.filter((p) => p.estado === "concluido").length;
      const notas = mine.filter((p) => quizIds.has(p.passo_id) && p.nota != null).map((p) => Number(p.nota));
      const cert = (certs ?? []).find((c) => c.inscricao_id === i.id);
      const u = i.utilizadores as { full_name: string | null; email: string | null } | null;
      return {
        id: i.id,
        nome: u?.full_name || u?.email || "—",
        email: u?.email ?? "",
        turma_id: i.turma_id,
        estado: i.estado,
        inscrito_em: i.inscrito_em,
        concluido_em: i.concluido_em,
        pct: passos.length ? Math.round((done / passos.length) * 100) : 0,
        nota_media: notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : null,
        badge: comBadge.has(i.user_id),
        certificado: cert?.storage_path ? sb.storage.from("certificados").getPublicUrl(cert.storage_path).data.publicUrl : null,
        codigo: cert?.codigo ?? null,
      };
    });
  });

export const regenerarCertificado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ inscricaoId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await guard(context.userId);
    const req = getRequest();
    const base = req?.headers.get("origin") ?? "https://app.ipav.pt";
    const { emitirCertificado } = await import("@/lib/elearning.server");
    return emitirCertificado(data.inscricaoId, base, false);
  });
