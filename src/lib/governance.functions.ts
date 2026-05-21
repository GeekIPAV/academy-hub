import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Classification = "publica" | "sensivel";

export interface GovernanceField {
  column_name: string;
  data_type: string;
  classification: Classification;
  locked: boolean; // structural columns (id/created_at) that cannot be marked sensitive
}

const LOCKED_COLUMNS = new Set(["id", "created_at"]);

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

async function fetchSchemaColumns(): Promise<{ column_name: string; data_type: string }[]> {
  const { data, error } = await supabaseAdmin.rpc("list_utilizadores_columns");
  if (error) throw new Error(error.message);
  return (data ?? []) as { column_name: string; data_type: string }[];
}

async function pruneOrphans(existing: Set<string>) {
  const { data: cfg, error } = await supabaseAdmin
    .from("config_privacidade_campos")
    .select("column_name");
  if (error) throw new Error(error.message);
  const orphans = (cfg ?? [])
    .map((r) => r.column_name as string)
    .filter((c) => !existing.has(c));
  if (orphans.length > 0) {
    const { error: delErr } = await supabaseAdmin
      .from("config_privacidade_campos")
      .delete()
      .in("column_name", orphans);
    if (delErr) throw new Error(delErr.message);
  }
  return orphans.length;
}

export const listGovernanceFields = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const cols = await fetchSchemaColumns();
    const colNames = new Set(cols.map((c) => c.column_name));
    const pruned = await pruneOrphans(colNames);

    const { data: cfg, error: cfgErr } = await supabaseAdmin
      .from("config_privacidade_campos")
      .select("column_name, classification");
    if (cfgErr) throw new Error(cfgErr.message);
    const cfgMap = new Map<string, Classification>(
      (cfg ?? []).map((r) => [r.column_name as string, r.classification as Classification]),
    );

    const fields: GovernanceField[] = cols.map((c) => ({
      column_name: c.column_name,
      data_type: c.data_type,
      classification: cfgMap.get(c.column_name) ?? "publica",
      locked: LOCKED_COLUMNS.has(c.column_name),
    }));

    return { fields, pruned };
  });

const setSchema = z.object({
  column_name: z.string().min(1).max(120),
  classification: z.enum(["publica", "sensivel"]),
});

export const setFieldClassification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => setSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // Validate column still exists in the live schema
    const cols = await fetchSchemaColumns();
    if (!cols.some((c) => c.column_name === data.column_name)) {
      throw new Error("A coluna já não existe na tabela utilizadores.");
    }
    if (LOCKED_COLUMNS.has(data.column_name) && data.classification === "sensivel") {
      throw new Error("Esta coluna é estrutural e não pode ser marcada como sensível.");
    }

    const { error } = await supabaseAdmin
      .from("config_privacidade_campos")
      .upsert(
        {
          column_name: data.column_name,
          classification: data.classification,
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "column_name" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const syncGovernanceSchema = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const cols = await fetchSchemaColumns();
    const pruned = await pruneOrphans(new Set(cols.map((c) => c.column_name)));
    return { columns: cols.length, pruned };
  });

const anonSchema = z.object({ userId: z.string().uuid() });

export const anonimizarUtilizador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => anonSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // Read sensitive columns from config; loop dynamically (no hard-coding)
    const { data: cfg, error: cfgErr } = await supabaseAdmin
      .from("config_privacidade_campos")
      .select("column_name")
      .eq("classification", "sensivel");
    if (cfgErr) throw new Error(cfgErr.message);

    const cols = await fetchSchemaColumns();
    const existing = new Set(cols.map((c) => c.column_name));

    const targets = (cfg ?? [])
      .map((r) => r.column_name as string)
      .filter((c) => existing.has(c) && !LOCKED_COLUMNS.has(c));

    if (targets.length === 0) return { affected: 0, columns: [] };

    const patch: Record<string, null> = {};
    for (const c of targets) patch[c] = null;

    const { error } = await (supabaseAdmin.from("utilizadores") as unknown as {
      update: (p: Record<string, null>) => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    })
      .update(patch)
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    return { affected: targets.length, columns: targets };
  });
