import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PassoTipo = "video" | "texto" | "recurso" | "quiz" | "reflexao";
export type PassoEstado = "bloqueado" | "disponivel" | "em_curso" | "concluido";

export interface CursoCardDTO {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  cover_position: string;
  cover_scale: number;
  cluster_id: string | null;
  cluster_name: string | null;
  modalidade: "autonomo" | "turma";
  tipo: string;
  horas: number | null;
  tem_certificado: boolean;
  turmas_abertas: { id: string; nome: string; data_inicio: string | null; data_fim: string | null; vagas: number | null; inscritos: number }[];
  inscricao: { id: string; estado: string; pct: number; proximo_passo_id: string | null } | null;
}

function baseUrl() {
  const req = getRequest();
  return req?.headers.get("origin") ?? (req ? new URL(req.url).origin : "https://app.ipav.pt");
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function progressoResumo(inscricaoIds: string[], cursoIds: string[]) {
  const sb = await admin();
  const [{ data: mods }, { data: prog }] = await Promise.all([
    sb.from("cursos_modulos").select("curso_id, sort_order, cursos_passos(id, sort_order, obrigatorio)").in("curso_id", cursoIds.length ? cursoIds : ["00000000-0000-0000-0000-000000000000"]),
    sb.from("cursos_progresso").select("inscricao_id, passo_id, estado").in("inscricao_id", inscricaoIds.length ? inscricaoIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);
  const passosPorCurso = new Map<string, { id: string; obrigatorio: boolean }[]>();
  for (const m of (mods ?? []).sort((a, b) => a.sort_order - b.sort_order)) {
    const list = passosPorCurso.get(m.curso_id) ?? [];
    for (const p of ((m.cursos_passos ?? []) as { id: string; sort_order: number; obrigatorio: boolean }[]).sort((a, b) => a.sort_order - b.sort_order))
      list.push(p);
    passosPorCurso.set(m.curso_id, list);
  }
  const done = new Map<string, Set<string>>();
  for (const p of prog ?? []) {
    if (p.estado !== "concluido") continue;
    const s = done.get(p.inscricao_id) ?? new Set();
    s.add(p.passo_id);
    done.set(p.inscricao_id, s);
  }
  return (inscricaoId: string, cursoId: string) => {
    const passos = passosPorCurso.get(cursoId) ?? [];
    const d = done.get(inscricaoId) ?? new Set();
    const pct = passos.length ? Math.round((passos.filter((p) => d.has(p.id)).length / passos.length) * 100) : 0;
    const prox = passos.find((p) => !d.has(p.id))?.id ?? passos[0]?.id ?? null;
    return { pct, proximo_passo_id: prox };
  };
}

export const listCatalogo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CursoCardDTO[]> => {
    const sb = await admin();
    const { data: cursos, error } = await sb
      .from("cursos")
      .select("id, title, description, cover_url, cover_position, cover_scale, cluster_id, modalidade, tipo, horas, tem_certificado, clusters(name), cursos_turmas(id, nome, data_inicio, data_fim, vagas, inscricoes_abertas)")
      .eq("estado", "publicado")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: inscs } = await sb
      .from("cursos_inscricoes")
      .select("id, curso_id, estado")
      .eq("user_id", context.userId)
      .neq("estado", "cancelado");
    const resumo = await progressoResumo((inscs ?? []).map((i) => i.id), (inscs ?? []).map((i) => i.curso_id));
    const turmaIds = (cursos ?? []).flatMap((c) => (c.cursos_turmas ?? []).map((t) => t.id));
    const { data: contagem } = turmaIds.length
      ? await sb.from("cursos_inscricoes").select("turma_id").in("turma_id", turmaIds).neq("estado", "cancelado")
      : { data: [] as { turma_id: string | null }[] };
    const count = new Map<string, number>();
    for (const r of contagem ?? []) if (r.turma_id) count.set(r.turma_id, (count.get(r.turma_id) ?? 0) + 1);

    return (cursos ?? []).map((c) => {
      const insc = (inscs ?? []).find((i) => i.curso_id === c.id);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        cover_url: c.cover_url,
        cover_position: c.cover_position,
        cover_scale: Number(c.cover_scale),
        cluster_id: c.cluster_id,
        cluster_name: (c.clusters as { name: string } | null)?.name ?? null,
        modalidade: c.modalidade as "autonomo" | "turma",
        tipo: c.tipo,
        horas: c.horas != null ? Number(c.horas) : null,
        tem_certificado: c.tem_certificado,
        turmas_abertas: (c.cursos_turmas ?? [])
          .filter((t) => t.inscricoes_abertas)
          .map((t) => ({ id: t.id, nome: t.nome, data_inicio: t.data_inicio, data_fim: t.data_fim, vagas: t.vagas, inscritos: count.get(t.id) ?? 0 })),
        inscricao: insc ? { id: insc.id, estado: insc.estado, ...resumo(insc.id, c.id) } : null,
      };
    });
  });

export interface PassoResumo {
  id: string;
  title: string;
  tipo: PassoTipo;
  obrigatorio: boolean;
  duracao_min: number | null;
  estado: PassoEstado;
}
export interface ModuloResumo {
  id: string;
  title: string;
  description: string | null;
  abre_em: string | null;
  passos: PassoResumo[];
}
export interface CursoDetalhe {
  curso: CursoCardDTO & {
    acreditacao_ref: string | null;
    nota_minima_quiz: number;
    pct_minima_video: number;
    badge_entrada: { id: string; title: string; cover_url: string | null } | null;
    badge_final: { id: string; title: string; cover_url: string | null } | null;
  };
  modulos: ModuloResumo[];
  certificado: { codigo: string; url: string } | null;
  turma: { id: string; nome: string; data_inicio: string | null; data_fim: string | null } | null;
}

async function carregarCurso(userId: string, cursoId: string): Promise<CursoDetalhe> {
  const sb = await admin();
  const { data: c, error } = await sb
    .from("cursos")
    .select("*, clusters(name), cursos_turmas(id, nome, data_inicio, data_fim, vagas, inscricoes_abertas), be:badges!cursos_badge_entrada_id_fkey(id, title, cover_url), bf:badges!cursos_badge_final_id_fkey(id, title, cover_url)")
    .eq("id", cursoId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!c) throw new Error("Curso não encontrado.");
  if (c.estado !== "publicado") {
    const { data: r } = await sb.from("user_roles").select("role_name").eq("user_id", userId).in("role_name", ["Admin", "Equipa IPAV"]).limit(1);
    if (!r?.length) throw new Error("Curso não disponível.");
  }
  const { data: insc } = await sb
    .from("cursos_inscricoes")
    .select("id, estado, turma_id")
    .eq("user_id", userId)
    .eq("curso_id", cursoId)
    .neq("estado", "cancelado")
    .maybeSingle();
  const { data: mods } = await sb
    .from("cursos_modulos")
    .select("id, title, description, sort_order, abertura_dias, cursos_passos(id, title, tipo, obrigatorio, duracao_min, sort_order)")
    .eq("curso_id", cursoId)
    .order("sort_order");
  const prog = insc
    ? (await sb.from("cursos_progresso").select("passo_id, estado").eq("inscricao_id", insc.id)).data ?? []
    : [];
  const pmap = new Map(prog.map((p) => [p.passo_id, p.estado]));
  const turmas = (c.cursos_turmas ?? []) as { id: string; nome: string; data_inicio: string | null; data_fim: string | null; vagas: number | null; inscricoes_abertas: boolean }[];
  const turma = insc?.turma_id ? turmas.find((t) => t.id === insc.turma_id) ?? null : null;
  const { aberturaModulo } = await import("@/lib/elearning.server");

  const modulos: ModuloResumo[] = (mods ?? []).map((m) => {
    const abre = aberturaModulo(c.modalidade, m.abertura_dias, turma?.data_inicio ?? null);
    return {
      id: m.id,
      title: m.title,
      description: m.description,
      abre_em: abre,
      passos: ((m.cursos_passos ?? []) as { id: string; title: string; tipo: PassoTipo; obrigatorio: boolean; duracao_min: number | null; sort_order: number }[])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((p) => ({
          id: p.id,
          title: p.title,
          tipo: p.tipo,
          obrigatorio: p.obrigatorio,
          duracao_min: p.duracao_min,
          estado: !insc || abre ? "bloqueado" : ((pmap.get(p.id) as PassoEstado | undefined) ?? "disponivel"),
        })),
    };
  });
  const total = modulos.flatMap((m) => m.passos);
  const concl = total.filter((p) => p.estado === "concluido").length;
  const { data: cert } = insc
    ? await sb.from("certificados_elearning").select("codigo, storage_path, revogado").eq("inscricao_id", insc.id).maybeSingle()
    : { data: null };
  const certUrl = cert?.storage_path && !cert.revogado ? sb.storage.from("certificados").getPublicUrl(cert.storage_path).data.publicUrl : null;

  return {
    curso: {
      id: c.id,
      title: c.title,
      description: c.description,
      cover_url: c.cover_url,
      cover_position: c.cover_position,
      cover_scale: Number(c.cover_scale),
      cluster_id: c.cluster_id,
      cluster_name: (c.clusters as { name: string } | null)?.name ?? null,
      modalidade: c.modalidade as "autonomo" | "turma",
      tipo: c.tipo,
      horas: c.horas != null ? Number(c.horas) : null,
      tem_certificado: c.tem_certificado,
      acreditacao_ref: c.acreditacao_ref,
      nota_minima_quiz: c.nota_minima_quiz,
      pct_minima_video: c.pct_minima_video,
      badge_entrada: (c.be as never) ?? null,
      badge_final: (c.bf as never) ?? null,
      turmas_abertas: turmas.filter((t) => t.inscricoes_abertas).map((t) => ({ ...t, inscritos: 0 })),
      inscricao: insc
        ? {
            id: insc.id,
            estado: insc.estado,
            pct: total.length ? Math.round((concl / total.length) * 100) : 0,
            proximo_passo_id: total.find((p) => p.estado !== "concluido" && p.estado !== "bloqueado")?.id ?? total[0]?.id ?? null,
          }
        : null,
    },
    modulos,
    certificado: cert && certUrl ? { codigo: cert.codigo, url: certUrl } : null,
    turma: turma ? { id: turma.id, nome: turma.nome, data_inicio: turma.data_inicio, data_fim: turma.data_fim } : null,
  };
}

export const getCurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ cursoId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => carregarCurso(context.userId, data.cursoId));

export const inscreverCurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ cursoId: z.string().uuid(), turmaId: z.string().uuid().nullable().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = await admin();
    const { data: c } = await sb.from("cursos").select("id, estado, modalidade, badge_entrada_id").eq("id", data.cursoId).maybeSingle();
    if (!c || c.estado !== "publicado") throw new Error("Curso não disponível.");
    let turmaId: string | null = null;
    if (c.modalidade === "turma") {
      if (!data.turmaId) throw new Error("Escolhe uma turma.");
      const { data: t } = await sb.from("cursos_turmas").select("id, curso_id, vagas, inscricoes_abertas").eq("id", data.turmaId).maybeSingle();
      if (!t || t.curso_id !== c.id || !t.inscricoes_abertas) throw new Error("Turma sem inscrições abertas.");
      if (t.vagas != null) {
        const { count } = await sb.from("cursos_inscricoes").select("id", { count: "exact", head: true }).eq("turma_id", t.id).neq("estado", "cancelado");
        if ((count ?? 0) >= t.vagas) throw new Error("Turma sem vagas.");
      }
      turmaId = t.id;
    }
    const { data: existing } = await sb.from("cursos_inscricoes").select("id, estado").eq("user_id", context.userId).eq("curso_id", c.id).maybeSingle();
    let id: string;
    if (existing) {
      id = existing.id;
      if (existing.estado === "cancelado")
        await sb.from("cursos_inscricoes").update({ estado: "inscrito", turma_id: turmaId, inscrito_em: new Date().toISOString() }).eq("id", id);
    } else {
      const { data: ins, error } = await sb
        .from("cursos_inscricoes")
        .insert({ user_id: context.userId, curso_id: c.id, turma_id: turmaId })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = ins.id;
    }
    const { atribuirBadge, logAtividade } = await import("@/lib/elearning.server");
    await logAtividade(context.userId, id, null, "inscricao", { turma_id: turmaId });
    if (c.badge_entrada_id) await atribuirBadge(context.userId, c.badge_entrada_id, false);
    return { inscricaoId: id };
  });

export interface PassoDetalhe {
  curso: CursoDetalhe;
  passo: {
    id: string;
    modulo_id: string;
    title: string;
    tipo: PassoTipo;
    obrigatorio: boolean;
    duracao_min: number | null;
    conteudo: Record<string, unknown>;
    recurso: { id: string; title: string; description: string | null; resource_type: string; file_url: string; cover_url: string | null } | null;
    perguntas: { id: string; enunciado: string; tipo: "unica" | "multipla"; opcoes: { id: string; texto: string }[] }[];
  };
  progresso: {
    estado: string;
    video_pct: number;
    video_posicao_s: number;
    nota: number | null;
    tentativas: number;
    resposta: unknown;
    partilhada: boolean;
  } | null;
  anterior: string | null;
  seguinte: string | null;
}

export const getPasso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ cursoId: z.string().uuid(), passoId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<PassoDetalhe> => {
    const sb = await admin();
    const curso = await carregarCurso(context.userId, data.cursoId);
    const flat = curso.modulos.flatMap((m) => m.passos);
    const idx = flat.findIndex((p) => p.id === data.passoId);
    if (idx < 0) throw new Error("Passo não encontrado.");
    const resumo = flat[idx];
    const isEquipa = curso.curso.inscricao == null;
    if (resumo.estado === "bloqueado" && !isEquipa) throw new Error("Este passo ainda não está disponível.");
    if (isEquipa) {
      const { data: r } = await sb.from("user_roles").select("role_name").eq("user_id", context.userId).in("role_name", ["Admin", "Equipa IPAV"]).limit(1);
      if (!r?.length) throw new Error("Inscreve-te no curso para aceder aos passos.");
    }
    const { data: p } = await sb.from("cursos_passos").select("*").eq("id", data.passoId).single();
    const conteudo = (p.conteudo ?? {}) as Record<string, unknown>;
    let recurso: PassoDetalhe["passo"]["recurso"] = null;
    if (p.tipo === "recurso" && typeof conteudo.recurso_id === "string") {
      const { data: r } = await sb.from("recursos").select("id, title, description, resource_type, file_url, cover_url").eq("id", conteudo.recurso_id).maybeSingle();
      recurso = r ?? null;
    }
    let perguntas: PassoDetalhe["passo"]["perguntas"] = [];
    if (p.tipo === "quiz") {
      const { data: qs } = await sb.from("cursos_quiz_perguntas").select("id, enunciado, tipo, opcoes, sort_order").eq("passo_id", p.id).order("sort_order");
      perguntas = (qs ?? []).map((q) => ({
        id: q.id,
        enunciado: q.enunciado,
        tipo: q.tipo as "unica" | "multipla",
        opcoes: ((q.opcoes ?? []) as { id: string; texto: string }[]).map((o) => ({ id: o.id, texto: o.texto })),
      }));
    }
    let progresso: PassoDetalhe["progresso"] = null;
    const inscId = curso.curso.inscricao?.id;
    if (inscId) {
      const { data: pr } = await sb.from("cursos_progresso").select("*").eq("inscricao_id", inscId).eq("passo_id", p.id).maybeSingle();
      if (!pr) {
        await sb.from("cursos_progresso").insert({ inscricao_id: inscId, passo_id: p.id, user_id: context.userId, estado: "em_curso" });
        const { logAtividade } = await import("@/lib/elearning.server");
        await logAtividade(context.userId, inscId, p.id, "inicio_passo");
        if (curso.curso.inscricao?.estado === "inscrito")
          await sb.from("cursos_inscricoes").update({ estado: "em_curso", iniciado_em: new Date().toISOString() }).eq("id", inscId);
      }
      progresso = pr
        ? { estado: pr.estado, video_pct: Number(pr.video_pct), video_posicao_s: Number(pr.video_posicao_s), nota: pr.nota != null ? Number(pr.nota) : null, tentativas: pr.tentativas, resposta: pr.resposta, partilhada: pr.partilhada }
        : { estado: "em_curso", video_pct: 0, video_posicao_s: 0, nota: null, tentativas: 0, resposta: null, partilhada: false };
    }
    return {
      curso,
      passo: { id: p.id, modulo_id: p.modulo_id, title: p.title, tipo: p.tipo as PassoTipo, obrigatorio: p.obrigatorio, duracao_min: p.duracao_min, conteudo, recurso, perguntas },
      progresso,
      anterior: flat[idx - 1]?.id ?? null,
      seguinte: flat[idx + 1]?.id ?? null,
    };
  });

async function getInscricaoPasso(userId: string, passoId: string) {
  const sb = await admin();
  const { data: p } = await sb.from("cursos_passos").select("id, tipo, modulo_id, cursos_modulos!inner(curso_id, abertura_dias)").eq("id", passoId).single();
  const mod = p.cursos_modulos as unknown as { curso_id: string; abertura_dias: number | null };
  const { data: insc } = await sb.from("cursos_inscricoes").select("id, estado, turma_id").eq("user_id", userId).eq("curso_id", mod.curso_id).neq("estado", "cancelado").maybeSingle();
  if (!insc) throw new Error("Não estás inscrito neste curso.");
  const { data: curso } = await sb.from("cursos").select("modalidade, nota_minima_quiz, pct_minima_video").eq("id", mod.curso_id).single();
  const turma = insc.turma_id ? (await sb.from("cursos_turmas").select("data_inicio").eq("id", insc.turma_id).maybeSingle()).data : null;
  const { aberturaModulo } = await import("@/lib/elearning.server");
  if (aberturaModulo(curso.modalidade, mod.abertura_dias, turma?.data_inicio ?? null)) throw new Error("Módulo ainda fechado.");
  return { sb, passo: p, insc, curso };
}

async function upsertProg(sb: Awaited<ReturnType<typeof admin>>, row: Record<string, unknown> & { inscricao_id: string; passo_id: string; user_id: string }) {
  const { error } = await sb.from("cursos_progresso").upsert(row as never, { onConflict: "inscricao_id,passo_id" });
  if (error) throw new Error(error.message);
}

export const registarVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ passoId: z.string().uuid(), pct: z.number().min(0).max(100), posicao: z.number().min(0) }).parse(i))
  .handler(async ({ data, context }) => {
    const { sb, passo, insc, curso } = await getInscricaoPasso(context.userId, data.passoId);
    if (passo.tipo !== "video") throw new Error("Passo inválido.");
    const { data: pr } = await sb.from("cursos_progresso").select("estado, video_pct").eq("inscricao_id", insc.id).eq("passo_id", passo.id).maybeSingle();
    const pct = Math.max(Number(pr?.video_pct ?? 0), data.pct);
    const concluido = pr?.estado === "concluido" || pct >= curso.pct_minima_video;
    await upsertProg(sb, {
      inscricao_id: insc.id,
      passo_id: passo.id,
      user_id: context.userId,
      video_pct: pct,
      video_posicao_s: data.posicao,
      estado: concluido ? "concluido" : "em_curso",
      ...(concluido && pr?.estado !== "concluido" ? { concluido_em: new Date().toISOString() } : {}),
    });
    let cursoConcluido = false;
    if (concluido && pr?.estado !== "concluido") {
      const { logAtividade, avaliarConclusao } = await import("@/lib/elearning.server");
      await logAtividade(context.userId, insc.id, passo.id, "fim_passo", { video_pct: pct });
      cursoConcluido = await avaliarConclusao(insc.id, baseUrl());
    }
    return { concluido, pct, cursoConcluido };
  });

export const concluirPasso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ passoId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { sb, passo, insc } = await getInscricaoPasso(context.userId, data.passoId);
    if (passo.tipo !== "texto" && passo.tipo !== "recurso") throw new Error("Este passo conclui-se automaticamente.");
    await upsertProg(sb, { inscricao_id: insc.id, passo_id: passo.id, user_id: context.userId, estado: "concluido", concluido_em: new Date().toISOString() });
    const { logAtividade, avaliarConclusao } = await import("@/lib/elearning.server");
    await logAtividade(context.userId, insc.id, passo.id, "fim_passo");
    return { cursoConcluido: await avaliarConclusao(insc.id, baseUrl()) };
  });

export const submeterQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ passoId: z.string().uuid(), respostas: z.record(z.string(), z.array(z.string())) }).parse(i))
  .handler(async ({ data, context }) => {
    const { sb, passo, insc, curso } = await getInscricaoPasso(context.userId, data.passoId);
    if (passo.tipo !== "quiz") throw new Error("Passo inválido.");
    const { data: qs } = await sb.from("cursos_quiz_perguntas").select("id, opcoes").eq("passo_id", passo.id);
    const feedback: Record<string, { correta: boolean; corretas: string[]; feedback: Record<string, string> }> = {};
    let certas = 0;
    for (const q of qs ?? []) {
      const opcoes = (q.opcoes ?? []) as { id: string; correta?: boolean; feedback?: string }[];
      const corretas = opcoes.filter((o) => o.correta).map((o) => o.id).sort();
      const dadas = [...(data.respostas[q.id] ?? [])].sort();
      const ok = corretas.length === dadas.length && corretas.every((v, i) => v === dadas[i]);
      if (ok) certas++;
      feedback[q.id] = { correta: ok, corretas, feedback: Object.fromEntries(opcoes.filter((o) => o.feedback).map((o) => [o.id, o.feedback!])) };
    }
    const nota = qs?.length ? Math.round((certas / qs.length) * 100) : 100;
    const { data: pr } = await sb.from("cursos_progresso").select("estado, nota, tentativas").eq("inscricao_id", insc.id).eq("passo_id", passo.id).maybeSingle();
    const aprovado = nota >= curso.nota_minima_quiz;
    const jaConcluido = pr?.estado === "concluido";
    await upsertProg(sb, {
      inscricao_id: insc.id,
      passo_id: passo.id,
      user_id: context.userId,
      nota: Math.max(nota, Number(pr?.nota ?? 0)),
      tentativas: (pr?.tentativas ?? 0) + 1,
      resposta: data.respostas,
      estado: aprovado || jaConcluido ? "concluido" : "em_curso",
      ...(aprovado && !jaConcluido ? { concluido_em: new Date().toISOString() } : {}),
    });
    const { logAtividade, avaliarConclusao } = await import("@/lib/elearning.server");
    await logAtividade(context.userId, insc.id, passo.id, "submissao_quiz", { nota, aprovado });
    const cursoConcluido = aprovado && !jaConcluido ? await avaliarConclusao(insc.id, baseUrl()) : false;
    return { nota, aprovado, minimo: curso.nota_minima_quiz, feedback, cursoConcluido };
  });

export const submeterReflexao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ passoId: z.string().uuid(), texto: z.string().min(1).max(20000), partilhar: z.boolean().default(false) }).parse(i))
  .handler(async ({ data, context }) => {
    const { sb, passo, insc } = await getInscricaoPasso(context.userId, data.passoId);
    if (passo.tipo !== "reflexao") throw new Error("Passo inválido.");
    const { sanitizeRichHtml } = await import("@/lib/sanitize-html");
    await upsertProg(sb, {
      inscricao_id: insc.id,
      passo_id: passo.id,
      user_id: context.userId,
      resposta: { texto: sanitizeRichHtml(data.texto) },
      partilhada: data.partilhar,
      estado: "concluido",
      concluido_em: new Date().toISOString(),
    });
    const { logAtividade, avaliarConclusao } = await import("@/lib/elearning.server");
    await logAtividade(context.userId, insc.id, passo.id, "submissao_reflexao");
    return { cursoConcluido: await avaliarConclusao(insc.id, baseUrl()) };
  });

export const getMeusCertificados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await admin();
    const { data } = await sb
      .from("certificados_elearning")
      .select("id, codigo, curso_id, curso_titulo, horas, modalidade, emitido_em, storage_path, revogado")
      .eq("user_id", context.userId)
      .eq("revogado", false)
      .order("emitido_em", { ascending: false });
    return (data ?? []).map((c) => ({
      id: c.id,
      codigo: c.codigo,
      curso_id: c.curso_id,
      curso_titulo: c.curso_titulo,
      horas: c.horas != null ? Number(c.horas) : null,
      modalidade: c.modalidade,
      emitido_em: c.emitido_em,
      url: c.storage_path ? sb.storage.from("certificados").getPublicUrl(c.storage_path).data.publicUrl : null,
    }));
  });

export const verificarCertificado = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ codigo: z.string().min(4).max(40) }).parse(i))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: c } = await sb
      .from("certificados_elearning")
      .select("nome, curso_titulo, horas, modalidade, data_inicio, data_fim, emitido_em, revogado")
      .eq("codigo", data.codigo.toUpperCase())
      .maybeSingle();
    if (!c) return null;
    return { ...c, horas: c.horas != null ? Number(c.horas) : null };
  });
