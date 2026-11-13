import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertRouteAccess } from "@/lib/admin-access.server";
import {
  TIPOS_AVALIACAO,
  lerPerguntas,
  perguntasSchema,
  validarRespostas,
  type Pergunta,
  type Respostas,
  type TipoAvaliacao,
} from "@/lib/avaliacao-acoes-types";

// As tabelas de avaliação só entram em `types.ts` depois de a migração ser
// aplicada e os tipos regenerados; até lá usa-se um cliente sem tipos de tabela.
const db = supabaseAdmin as unknown as SupabaseClient;

async function assertAdmin(userId: string) {
  await assertRouteAccess(userId, "/admin/acoes");
}

export type ModeloAvaliacao = {
  id: string;
  nome: string;
  tipo: TipoAvaliacao;
  descricao: string | null;
  perguntas: Pergunta[];
  sugerido: boolean;
};

export type AvaliacaoAcao = {
  id: string;
  acao_id: string;
  modelo_id: string | null;
  token: string;
  titulo: string;
  tipo: TipoAvaliacao;
  perguntas: Pergunta[];
  aberta: boolean;
  created_at: string;
  total_respostas: number;
};

export type RespostaAvaliacao = {
  id: string;
  created_at: string;
  respostas: Respostas;
};

const actionIdSchema = z.object({ actionId: z.string().uuid() });
const idSchema = z.object({ id: z.string().uuid() });

function mapAvaliacao(row: Record<string, unknown>, total: number): AvaliacaoAcao {
  return {
    id: row.id as string,
    acao_id: row.acao_id as string,
    modelo_id: (row.modelo_id as string | null) ?? null,
    token: row.token as string,
    titulo: row.titulo as string,
    tipo: row.tipo as TipoAvaliacao,
    perguntas: lerPerguntas(row.perguntas),
    aberta: row.aberta as boolean,
    created_at: row.created_at as string,
    total_respostas: total,
  };
}

// ---------- Backoffice ----------

/** Modelos disponíveis; os ligados ao produto da ação vêm marcados como sugeridos. */
export const listModelosAvaliacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => actionIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<ModeloAvaliacao[]> => {
    await assertAdmin(context.userId);

    const { data: acao, error: aErr } = await db
      .from("acoes")
      .select("produto_id")
      .eq("id", data.actionId)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);

    const [modelosRes, ligacoesRes] = await Promise.all([
      db
        .from("avaliacao_modelos")
        .select("id, nome, tipo, descricao, perguntas")
        .order("sort_order", { ascending: true })
        .order("nome", { ascending: true }),
      acao?.produto_id
        ? db
            .from("avaliacao_modelos_produtos")
            .select("modelo_id")
            .eq("produto_id", acao.produto_id)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (modelosRes.error) throw new Error(modelosRes.error.message);
    if (ligacoesRes.error) throw new Error(ligacoesRes.error.message);

    const sugeridos = new Set(
      ((ligacoesRes.data ?? []) as { modelo_id: string }[]).map((l) => l.modelo_id),
    );
    const modelos = ((modelosRes.data ?? []) as Record<string, unknown>[]).map((m) => ({
      id: m.id as string,
      nome: m.nome as string,
      tipo: m.tipo as TipoAvaliacao,
      descricao: (m.descricao as string | null) ?? null,
      perguntas: lerPerguntas(m.perguntas),
      sugerido: sugeridos.has(m.id as string),
    }));
    // Sugeridos primeiro, mantendo a ordem original dentro de cada grupo.
    return [...modelos.filter((m) => m.sugerido), ...modelos.filter((m) => !m.sugerido)];
  });

export const listAvaliacoesAcao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => actionIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<AvaliacaoAcao[]> => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await db
      .from("avaliacoes")
      .select("id, acao_id, modelo_id, token, titulo, tipo, perguntas, aberta, created_at")
      .eq("acao_id", data.actionId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const lista = (rows ?? []) as Record<string, unknown>[];
    if (lista.length === 0) return [];

    const contagens = await Promise.all(
      lista.map(async (r) => {
        const { count, error: cErr } = await db
          .from("avaliacao_respostas")
          .select("id", { count: "exact", head: true })
          .eq("avaliacao_id", r.id as string);
        if (cErr) throw new Error(cErr.message);
        return count ?? 0;
      }),
    );
    return lista.map((r, i) => mapAvaliacao(r, contagens[i]));
  });

const createSchema = z.object({
  actionId: z.string().uuid(),
  /** Sem modelo → questionário criado de raiz. */
  modeloId: z.string().uuid().nullable(),
  titulo: z.string().trim().min(1).max(160),
  tipo: z.enum(TIPOS_AVALIACAO),
});

export const createAvaliacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    let perguntas: Pergunta[] = [];
    if (data.modeloId) {
      const { data: modelo, error: mErr } = await db
        .from("avaliacao_modelos")
        .select("perguntas")
        .eq("id", data.modeloId)
        .maybeSingle();
      if (mErr) throw new Error(mErr.message);
      if (!modelo) throw new Error("Modelo não encontrado.");
      perguntas = lerPerguntas(modelo.perguntas);
    }

    const { data: row, error } = await db
      .from("avaliacoes")
      .insert({
        acao_id: data.actionId,
        modelo_id: data.modeloId,
        titulo: data.titulo,
        tipo: data.tipo,
        // Cópia: editar a avaliação nunca altera o modelo nem outras ações.
        perguntas,
      })
      .select("id, token")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, token: row.token as string };
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  titulo: z.string().trim().min(1).max(160).optional(),
  tipo: z.enum(TIPOS_AVALIACAO).optional(),
  aberta: z.boolean().optional(),
  perguntas: perguntasSchema.optional(),
});

export const updateAvaliacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, ...patch } = data;
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length === 0) return { ok: true };
    const { error } = await db.from("avaliacoes").update(clean).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAvaliacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await db.from("avaliacoes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getRespostasAvaliacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data, context }): Promise<RespostaAvaliacao[]> => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await db
      .from("avaliacao_respostas")
      .select("id, created_at, respostas")
      .eq("avaliacao_id", data.id)
      .order("created_at", { ascending: true })
      .limit(5000);
    if (error) throw new Error(error.message);
    return (rows ?? []) as RespostaAvaliacao[];
  });

export const deleteRespostaAvaliacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await db.from("avaliacao_respostas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Público (anónimo) ----------

const tokenSchema = z.object({ token: z.string().trim().min(8).max(64) });

export type AvaliacaoPublica = {
  titulo: string;
  acao_titulo: string | null;
  aberta: boolean;
  perguntas: Pergunta[];
};

export const getAvaliacaoPublica = createServerFn({ method: "GET" })
  .inputValidator((input) => tokenSchema.parse(input))
  .handler(async ({ data }): Promise<AvaliacaoPublica | null> => {
    const { data: row, error } = await db
      .from("avaliacoes")
      .select("titulo, aberta, perguntas, acoes(title)")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const acoes = row.acoes as { title: string | null } | { title: string | null }[] | null;
    const acaoTitulo = Array.isArray(acoes) ? acoes[0]?.title : acoes?.title;
    return {
      titulo: row.titulo as string,
      acao_titulo: acaoTitulo ?? null,
      aberta: row.aberta as boolean,
      perguntas: lerPerguntas(row.perguntas),
    };
  });

const submitSchema = z.object({
  token: z.string().trim().min(8).max(64),
  respostas: z.record(z.string(), z.unknown()),
  /** Campo isco: pessoas reais deixam-no vazio. */
  website: z.string().max(200).optional(),
});

export const submitAvaliacao = createServerFn({ method: "POST" })
  .inputValidator((input) => submitSchema.parse(input))
  .handler(async ({ data }) => {
    // Resposta de sucesso silenciosa para bots, sem gravar nada.
    if (data.website && data.website.trim() !== "") return { ok: true };

    const { data: av, error } = await db
      .from("avaliacoes")
      .select("id, aberta, perguntas")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!av) throw new Error("Link de avaliação inválido.");
    if (!av.aberta) throw new Error("Esta avaliação já está fechada.");

    const perguntas = lerPerguntas(av.perguntas);
    if (perguntas.length === 0) throw new Error("Esta avaliação ainda não tem perguntas.");

    const validado = validarRespostas(perguntas, data.respostas);
    if (!validado.ok) throw new Error(validado.erro);
    if (Object.keys(validado.respostas).length === 0) {
      throw new Error("Responde a pelo menos uma pergunta.");
    }

    const { error: iErr } = await db
      .from("avaliacao_respostas")
      .insert({ avaliacao_id: av.id as string, respostas: validado.respostas });
    if (iErr) throw new Error(iErr.message);
    return { ok: true };
  });

export type ResumoAvaliacoesAcao = { avaliacoes: number; abertas: number; respostas: number };

/** Resumo das avaliações de todas as ações, para a lista de gestão. */
export const resumoAvaliacoesAcoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Record<string, ResumoAvaliacoesAcao>> => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await db
      .from("avaliacoes")
      .select("acao_id, aberta, avaliacao_respostas(count)")
      .limit(5000);
    if (error) throw new Error(error.message);
    const out: Record<string, ResumoAvaliacoesAcao> = {};
    for (const r of (rows ?? []) as Record<string, unknown>[]) {
      const acaoId = r.acao_id as string;
      const contagem = r.avaliacao_respostas as { count?: number }[] | null;
      const atual = out[acaoId] ?? { avaliacoes: 0, abertas: 0, respostas: 0 };
      atual.avaliacoes += 1;
      if (r.aberta) atual.abertas += 1;
      atual.respostas += contagem?.[0]?.count ?? 0;
      out[acaoId] = atual;
    }
    return out;
  });
