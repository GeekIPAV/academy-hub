import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRouteAccess } from "@/lib/admin-access.server";

const uuid = z.string().uuid();

async function admin(userId: string, path = "/admin/projetos") {
  await assertRouteAccess(userId, path);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type ProjetoRow = { id: string; title: string; description: string | null; status: string };

export const listProjetos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin(context.userId, "/admin/acoes");
    const { data, error } = await db
      .from("projetos")
      .select("id, title, description, status")
      .order("title");
    if (error) throw new Error(error.message);
    return (data ?? []) as ProjetoRow[];
  });

export const saveProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        id: uuid.optional(),
        title: z.string().trim().min(1).max(200),
        description: z.string().max(2000).nullable().optional(),
        status: z.enum(["planeado", "em_curso", "concluido", "suspenso"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const db = await admin(context.userId);
    const row = { title: data.title, description: data.description ?? null, status: data.status };
    const q = data.id
      ? db.from("projetos").update(row).eq("id", data.id)
      : db.from("projetos").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getProjetoMembros = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ projectId: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const db = await admin(context.userId);
    const [{ data: ents, error: e1 }, { data: diretos, error: e2 }] = await Promise.all([
      db
        .from("entidades_projetos")
        .select("id, entity_id, is_active, data_inicio, data_fim, entidades(name)")
        .eq("project_id", data.projectId),
      db.from("utilizadores_projetos").select("user_id").eq("project_id", data.projectId),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    const activeEntityIds = (ents ?? []).filter((e) => e.is_active).map((e) => e.entity_id);
    const directIds = (diretos ?? []).map((d) => d.user_id);
    const [{ data: herdados }, { data: diretosUsers }] = await Promise.all([
      activeEntityIds.length
        ? db.from("utilizadores").select("id, full_name, email, entity_id").in("entity_id", activeEntityIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null; entity_id: string | null }[] }),
      directIds.length
        ? db.from("utilizadores").select("id, full_name, email").in("id", directIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
    ]);
    return {
      entidades: (ents ?? []).map((e) => ({
        id: e.id,
        entity_id: e.entity_id,
        name: (e.entidades as { name?: string } | null)?.name ?? "—",
        is_active: e.is_active,
      })),
      diretos: diretosUsers ?? [],
      herdados: herdados ?? [],
    };
  });

export const listEntidadesUtilizadores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin(context.userId);
    const [{ data: ents }, { data: users }] = await Promise.all([
      db.from("entidades").select("id, name").order("name"),
      db.from("utilizadores").select("id, full_name, email").order("full_name").limit(2000),
    ]);
    return { entidades: ents ?? [], utilizadores: users ?? [] };
  });

export const addEntidadeProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ projectId: uuid, entityId: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const db = await admin(context.userId);
    const { data: ex } = await db
      .from("entidades_projetos")
      .select("id")
      .eq("project_id", data.projectId)
      .eq("entity_id", data.entityId)
      .maybeSingle();
    const { error } = ex
      ? await db.from("entidades_projetos").update({ is_active: true, data_fim: null }).eq("id", ex.id)
      : await db.from("entidades_projetos").insert({ project_id: data.projectId, entity_id: data.entityId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Remover a entidade do projeto: os utilizadores dela perdem o acesso herdado de imediato. */
export const removeEntidadeProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const db = await admin(context.userId);
    const { error } = await db.from("entidades_projetos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUtilizadorProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ projectId: uuid, userId: uuid, on: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const db = await admin(context.userId);
    const { error } = data.on
      ? await db
          .from("utilizadores_projetos")
          .upsert({ project_id: data.projectId, user_id: data.userId, created_by: context.userId })
      : await db
          .from("utilizadores_projetos")
          .delete()
          .eq("project_id", data.projectId)
          .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAcaoVisibilidade = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ actionId: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const db = await admin(context.userId, "/admin/acoes");
    const [{ data: a }, { data: ps }] = await Promise.all([
      db.from("acoes").select("visibilidade").eq("id", data.actionId).maybeSingle(),
      db.from("acoes_projetos").select("project_id").eq("action_id", data.actionId),
    ]);
    return {
      visibilidade: (a?.visibilidade ?? "todos") as "todos" | "projetos",
      projectIds: (ps ?? []).map((p) => p.project_id),
    };
  });

export const saveAcaoVisibilidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        actionId: uuid,
        visibilidade: z.enum(["todos", "projetos"]),
        projectIds: z.array(uuid).max(200),
      })
      .refine((v) => v.visibilidade === "todos" || v.projectIds.length > 0, {
        message: "Escolhe pelo menos um projeto.",
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const db = await admin(context.userId, "/admin/acoes");
    const ids = data.visibilidade === "todos" ? [] : data.projectIds;
    const { error: e1 } = await db
      .from("acoes")
      .update({ visibilidade: data.visibilidade })
      .eq("id", data.actionId);
    if (e1) throw new Error(e1.message);
    await db.from("acoes_projetos").delete().eq("action_id", data.actionId);
    if (ids.length) {
      const { error } = await db
        .from("acoes_projetos")
        .insert(ids.map((project_id) => ({ action_id: data.actionId, project_id })));
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
