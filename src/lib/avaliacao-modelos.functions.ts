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
  type Pergunta,
  type TipoAvaliacao,
} from "@/lib/avaliacao-acoes-types";

// Ver nota em avaliacao-acoes.functions.ts: cliente sem tipos de tabela até
// os tipos do Supabase serem regenerados.
const db = supabaseAdmin as unknown as SupabaseClient;

async function assertAdmin(userId: string) {
  await assertRouteAccess(userId, "/admin/avaliacoes");
}

export type ModeloGestao = {
  id: string;
  nome: string;
  tipo: TipoAvaliacao;
  descricao: string | null;
  perguntas: Pergunta[];
  produto_ids: string[];
  /** Avaliações de ações que foram criadas a partir deste modelo. */
  em_uso: number;
};

function mensagemErro(error: { message: string; code?: string }) {
  if (error.code === "23505") return "Já existe um modelo com esse nome.";
  return error.message;
}

export const listModelosGestao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ModeloGestao[]> => {
    await assertAdmin(context.userId);

    const [modelosRes, ligacoesRes, avaliacoesRes] = await Promise.all([
      db
        .from("avaliacao_modelos")
        .select("id, nome, tipo, descricao, perguntas")
        .order("sort_order", { ascending: true })
        .order("nome", { ascending: true }),
      db.from("avaliacao_modelos_produtos").select("modelo_id, produto_id"),
      db.from("avaliacoes").select("modelo_id").not("modelo_id", "is", null),
    ]);
    if (modelosRes.error) throw new Error(modelosRes.error.message);
    if (ligacoesRes.error) throw new Error(ligacoesRes.error.message);
    if (avaliacoesRes.error) throw new Error(avaliacoesRes.error.message);

    const produtosPorModelo = new Map<string, string[]>();
    for (const l of (ligacoesRes.data ?? []) as { modelo_id: string; produto_id: string }[]) {
      produtosPorModelo.set(l.modelo_id, [
        ...(produtosPorModelo.get(l.modelo_id) ?? []),
        l.produto_id,
      ]);
    }
    const usoPorModelo = new Map<string, number>();
    for (const a of (avaliacoesRes.data ?? []) as { modelo_id: string }[]) {
      usoPorModelo.set(a.modelo_id, (usoPorModelo.get(a.modelo_id) ?? 0) + 1);
    }

    return ((modelosRes.data ?? []) as Record<string, unknown>[]).map((m) => ({
      id: m.id as string,
      nome: m.nome as string,
      tipo: m.tipo as TipoAvaliacao,
      descricao: (m.descricao as string | null) ?? null,
      perguntas: lerPerguntas(m.perguntas),
      produto_ids: produtosPorModelo.get(m.id as string) ?? [],
      em_uso: usoPorModelo.get(m.id as string) ?? 0,
    }));
  });

const modeloSchema = z.object({
  nome: z.string().trim().min(1, "O modelo precisa de um nome").max(160),
  tipo: z.enum(TIPOS_AVALIACAO),
  descricao: z.string().trim().max(500).nullable(),
  perguntas: perguntasSchema,
  produtoIds: z.array(z.string().uuid()).max(200),
});

async function guardarLigacoes(modeloId: string, produtoIds: string[]) {
  const { error: dErr } = await db
    .from("avaliacao_modelos_produtos")
    .delete()
    .eq("modelo_id", modeloId);
  if (dErr) throw new Error(dErr.message);
  const unicos = Array.from(new Set(produtoIds));
  if (unicos.length === 0) return;
  const { error: iErr } = await db
    .from("avaliacao_modelos_produtos")
    .insert(unicos.map((produto_id) => ({ modelo_id: modeloId, produto_id })));
  if (iErr) throw new Error(iErr.message);
}

export const createModelo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => modeloSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: ultimo } = await db
      .from("avaliacao_modelos")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: row, error } = await db
      .from("avaliacao_modelos")
      .insert({
        nome: data.nome,
        tipo: data.tipo,
        descricao: data.descricao || null,
        perguntas: data.perguntas,
        sort_order: ((ultimo?.sort_order as number | undefined) ?? 0) + 1,
      })
      .select("id")
      .single();
    if (error) throw new Error(mensagemErro(error));
    await guardarLigacoes(row.id as string, data.produtoIds);
    return { id: row.id as string };
  });

export const updateModelo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => modeloSchema.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await db
      .from("avaliacao_modelos")
      .update({
        nome: data.nome,
        tipo: data.tipo,
        descricao: data.descricao || null,
        perguntas: data.perguntas,
      })
      .eq("id", data.id);
    if (error) throw new Error(mensagemErro(error));
    await guardarLigacoes(data.id, data.produtoIds);
    return { ok: true };
  });

export const deleteModelo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    // As avaliações já criadas guardam uma cópia das perguntas e ficam sem modelo.
    const { error } = await db.from("avaliacao_modelos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
