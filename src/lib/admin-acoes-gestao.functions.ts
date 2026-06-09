import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertRouteAccess } from "@/lib/admin-access.server";

async function assertAdmin(userId: string) {
  await assertRouteAccess(userId, "/admin/acoes");
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[];

export interface RequiredFieldDef {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  options?: string[];
}



export type AcaoRow = {
  id: string;
  title: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_status: string | null;
  status: string | null;
  action_type: string | null;
  max_capacity: number | null;
  entity_id: string | null;
  program_id: string | null;
  formato: string | null;
  localizacao: string | null;
  produto: string | null;
  projeto: string | null;
  pais: string | null;
  email_responsavel: string | null;
  fotos_link: string | null;
  avaliacao_satisfacao: number | null;
  avaliacao_satisfacao_link: string | null;
  avaliacao_impacto: number | null;
  avaliacao_impacto_link: string | null;
  conteudo_pagina_inscricao: JsonValue | null;
  required_fields: RequiredFieldDef[];
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
        "id, title, description, start_date, end_date, registration_status, status, action_type, max_capacity, entity_id, program_id, formato, localizacao, produto, projeto, pais, email_responsavel, fotos_link, avaliacao_satisfacao, avaliacao_satisfacao_link, avaliacao_impacto, avaliacao_impacto_link, conteudo_pagina_inscricao, required_fields, programas(title), entidades(name)",
      )
      .order("start_date", { ascending: false, nullsFirst: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: Record<string, unknown>): AcaoRow => {
      const programa = r.programas as { title?: string | null } | null;
      const entidade = r.entidades as { name?: string | null } | null;
      const { programas: _p, entidades: _e, ...rest } = r;
      const rf = (rest as { required_fields?: unknown }).required_fields;
      return {
        ...(rest as Omit<AcaoRow, "programa_title" | "entidade_nome" | "required_fields">),
        required_fields: Array.isArray(rf) ? (rf as RequiredFieldDef[]) : [],
        programa_title: programa?.title ?? null,
        entidade_nome: entidade?.name ?? null,
      };
    });
  });

const patchSchema = z.object({
  actionId: z.string().uuid(),
  fields: z
    .object({
      title: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      start_date: z.string().nullable().optional(),
      end_date: z.string().nullable().optional(),
      registration_status: z.string().nullable().optional(),
      status: z.string().optional(),
      action_type: z.string().nullable().optional(),
      max_capacity: z.number().int().nullable().optional(),
      formato: z.string().nullable().optional(),
      localizacao: z.string().nullable().optional(),
      produto: z.string().nullable().optional(),
      projeto: z.string().nullable().optional(),
      pais: z.string().nullable().optional(),
      email_responsavel: z.string().nullable().optional(),
      fotos_link: z.string().nullable().optional(),
      avaliacao_satisfacao: z.number().nullable().optional(),
      avaliacao_satisfacao_link: z.string().nullable().optional(),
      avaliacao_impacto: z.number().nullable().optional(),
      avaliacao_impacto_link: z.string().nullable().optional(),
      required_fields: z
        .array(
          z.object({
            name: z.string(),
            label: z.string().optional(),
            type: z.string().optional(),
            required: z.boolean().optional(),
            options: z.array(z.string()).optional(),
          }),
        )
        .optional(),
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
        "id, status, submitted_at, tshirt_size, certificate_sent, user_id",
      )
      .eq("action_id", data.actionId)
      .order("submitted_at", { ascending: true });
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id).filter((x): x is string => !!x)));
    const userMap = new Map<string, { full_name: string | null; email: string | null }>();
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from("utilizadores")
        .select("id, full_name, email")
        .in("id", userIds);
      (users ?? []).forEach((u) => userMap.set(u.id as string, { full_name: (u.full_name as string | null) ?? null, email: (u.email as string | null) ?? null }));
    }
    return (rows ?? []).map((r: Record<string, unknown>) => {
      const uid = r.user_id as string | null;
      const u = uid ? userMap.get(uid) : null;
      return {
        id: r.id as string,
        status: (r.status as string | null) ?? null,
        submitted_at: (r.submitted_at as string | null) ?? null,
        tshirt_size: (r.tshirt_size as string | null) ?? null,
        certificate_sent: !!r.certificate_sent,
        user_id: uid,
        full_name: u?.full_name ?? null,
        email: u?.email ?? null,
      };
    });
  });
