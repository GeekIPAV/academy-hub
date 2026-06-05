import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role_name")
    .eq("user_id", userId)
    .eq("role_name", "Admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito.");
}
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[];


export type AcaoRow = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  action_date: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_status: string | null;
  status: string | null;
  action_type: string | null;
  max_capacity: number | null;
  entity_id: string | null;
  program_id: string | null;
  tshirt_tracking_link: string | null;
  tshirt_value: number | null;
  fotos_link: string | null;
  avaliacao_satisfacao: number | null;
  avaliacao_satisfacao_link: string | null;
  avaliacao_impacto: number | null;
  avaliacao_impacto_link: string | null;
  conteudo_pagina_inscricao: JsonValue | null;
  programa_title?: string | null;
  entidade_nome?: string | null;
};

export const listAcoesFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("acoes")
      .select(
        "id, title, description, category, action_date, start_date, end_date, registration_status, status, action_type, max_capacity, entity_id, program_id, tshirt_tracking_link, tshirt_value, fotos_link, avaliacao_satisfacao, avaliacao_satisfacao_link, avaliacao_impacto, avaliacao_impacto_link, conteudo_pagina_inscricao, programas(title), entidades(nome)",
      )
      .order("action_date", { ascending: false, nullsFirst: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: Record<string, unknown>): AcaoRow => {
      const programa = r.programas as { title?: string | null } | null;
      const entidade = r.entidades as { nome?: string | null } | null;
      const { programas: _p, entidades: _e, ...rest } = r;
      return {
        ...(rest as Omit<AcaoRow, "programa_title" | "entidade_nome">),
        programa_title: programa?.title ?? null,
        entidade_nome: entidade?.nome ?? null,
      };
    });
  });

const patchSchema = z.object({
  actionId: z.string().uuid(),
  fields: z
    .object({
      title: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      action_date: z.string().nullable().optional(),
      start_date: z.string().nullable().optional(),
      end_date: z.string().nullable().optional(),
      registration_status: z.string().nullable().optional(),
      status: z.string().optional(),
      action_type: z.string().nullable().optional(),
      max_capacity: z.number().int().nullable().optional(),
      tshirt_tracking_link: z.string().nullable().optional(),
      tshirt_value: z.number().nullable().optional(),
      fotos_link: z.string().nullable().optional(),
      avaliacao_satisfacao: z.number().nullable().optional(),
      avaliacao_satisfacao_link: z.string().nullable().optional(),
      avaliacao_impacto: z.number().nullable().optional(),
      avaliacao_impacto_link: z.string().nullable().optional(),
    })
    .strict(),
});

export const patchAcao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => patchSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("acoes")
      .update(data.fields)
      .eq("id", data.actionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const pageSchema = z.object({
  actionId: z.string().uuid(),
  conteudo: z.unknown(),
});

export const savePaginaInscricao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => pageSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("acoes")
      .update({ conteudo_pagina_inscricao: data.conteudo as never })
      .eq("id", data.actionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listInscritosAcao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ actionId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("inscritos_acoes")
      .select(
        "id, status, submitted_at, tshirt_size, certificate_sent, user_id, utilizadores(full_name, email)",
      )
      .eq("action_id", data.actionId)
      .order("submitted_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: Record<string, unknown>) => {
      const u = r.utilizadores as { full_name?: string | null; email?: string | null } | null;
      return {
        id: r.id as string,
        status: (r.status as string | null) ?? null,
        submitted_at: (r.submitted_at as string | null) ?? null,
        tshirt_size: (r.tshirt_size as string | null) ?? null,
        certificate_sent: !!r.certificate_sent,
        user_id: r.user_id as string | null,
        full_name: u?.full_name ?? null,
        email: u?.email ?? null,
      };
    });
  });
