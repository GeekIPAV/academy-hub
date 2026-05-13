// Notion webhook receiver — sincroniza Programs e Training Actions.
// Validação de Token via header `x-notion-token`.
// Tipo (Programa vs. Ação) resolvido por (1) header x-notion-tipo,
// (2) parent.database_id vs secrets NOTION_DB_PROGRAMS / NOTION_DB_ACTIONS,
// (3) propriedade "Tipo" (select) na página.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-notion-token, x-notion-tipo",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPECTED_TOKEN = Deno.env.get("NOTION_WEBHOOK_TOKEN")!;
const DB_PROGRAMS = Deno.env.get("NOTION_DB_PROGRAMS") ?? "";
const DB_ACTIONS = Deno.env.get("NOTION_DB_ACTIONS") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ---------- Notion property helpers ----------
function getTitle(props: Record<string, any>): string | null {
  for (const v of Object.values(props ?? {})) {
    if (v && (v as any).type === "title") {
      const arr = (v as any).title as Array<{ plain_text?: string }>;
      return arr?.map((t) => t.plain_text ?? "").join("").trim() || null;
    }
  }
  return null;
}

function getRichText(prop: any): string | null {
  if (!prop) return null;
  if (prop.type === "rich_text") {
    return (prop.rich_text as Array<{ plain_text?: string }>)
      ?.map((t) => t.plain_text ?? "")
      .join("")
      .trim() || null;
  }
  return null;
}

function getNumber(prop: any): number | null {
  return prop?.type === "number" ? (prop.number ?? null) : null;
}

function getMultiSelect(prop: any): string[] {
  if (prop?.type !== "multi_select") return [];
  return (prop.multi_select as Array<{ name: string }>).map((o) => o.name);
}

function getRelationIds(prop: any): string[] {
  if (prop?.type !== "relation") return [];
  return (prop.relation as Array<{ id: string }>).map((r) => r.id);
}

function getSelectName(prop: any): string | null {
  return prop?.type === "select" ? (prop.select?.name ?? null) : null;
}

// Normaliza required_fields: aceita multi_select de nomes ou rich_text JSON.
function parseRequiredFields(prop: any): unknown[] {
  if (!prop) return [];
  if (prop.type === "multi_select") {
    return getMultiSelect(prop).map((name) => ({ name, type: "text", label: name }));
  }
  if (prop.type === "rich_text") {
    try {
      const raw = getRichText(prop);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Normaliza id de database/page (remove hífenes, lowercase)
function normId(s: string | null | undefined): string {
  return (s ?? "").replace(/-/g, "").toLowerCase();
}

// Normaliza string de tipo: "Programa"/"Ação"/"Acao" → "programa"/"acao"
function normTipo(s: string | null | undefined): "programa" | "acao" | null {
  if (!s) return null;
  const v = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (v.startsWith("prog")) return "programa";
  if (v.startsWith("ac")) return "acao";
  return null;
}

// ---------- Logging ----------
async function log(
  status: "received" | "ok" | "error",
  payload: unknown,
  notion_id: string | null,
  event_type: string | null,
  error_message?: string,
) {
  await admin.from("sync_logs").insert({
    source: "notion",
    status,
    payload,
    notion_id,
    event_type,
    error_message: error_message ?? null,
  });
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Token validation
  const token = req.headers.get("x-notion-token");
  if (!EXPECTED_TOKEN || token !== EXPECTED_TOKEN) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const headerTipo = normTipo(req.headers.get("x-notion-tipo"));

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Sempre regista a receção (debug)
  const page = payload?.data ?? payload?.page ?? payload;
  const notionPageId: string | null = page?.id ?? null;
  const eventType: string | null = payload?.type ?? page?.object ?? null;

  await log("received", payload, notionPageId, eventType);

  try {
    if (!notionPageId) throw new Error("Payload sem id da página Notion.");

    const props = page?.properties ?? {};
    const title = getTitle(props);
    if (!title) throw new Error("Payload sem título.");

    const description =
      getRichText(props["Description"]) ??
      getRichText(props["Descrição"]) ??
      null;
    const maxCapacity =
      getNumber(props["Max Capacity"]) ??
      getNumber(props["Capacidade"]) ??
      null;
    const requiredFields = parseRequiredFields(
      props["Required Fields"] ?? props["Campos Obrigatórios"],
    );

    // ---- Resolver TIPO (programa | acao) deterministicamente ----
    let tipo: "programa" | "acao" | null = headerTipo;

    if (!tipo) {
      const parentDbId = normId(page?.parent?.database_id);
      if (parentDbId) {
        if (DB_PROGRAMS && parentDbId === normId(DB_PROGRAMS)) tipo = "programa";
        else if (DB_ACTIONS && parentDbId === normId(DB_ACTIONS)) tipo = "acao";
      }
    }

    if (!tipo) {
      tipo = normTipo(getSelectName(props["Tipo"]));
    }

    if (!tipo) {
      throw new Error(
        "Não foi possível determinar o tipo (Programa/Ação). Define a propriedade 'Tipo' (select) ou configura os secrets NOTION_DB_PROGRAMS / NOTION_DB_ACTIONS, ou envia o header x-notion-tipo.",
      );
    }

    if (tipo === "programa") {
      const { error } = await admin
        .from("programs")
        .upsert(
          {
            notion_id: notionPageId,
            title,
            description,
            max_capacity: maxCapacity,
            required_fields: requiredFields,
            sync_status: "synced",
            last_synced_at: new Date().toISOString(),
            metadata: payload,
          },
          { onConflict: "notion_id" },
        );
      if (error) throw error;
    } else {
      // Ação — relação a programa é OPCIONAL
      const parentProp =
        props["Programa"] ?? props["Program"] ?? props["Parent Program"];
      const parentNotionIds = getRelationIds(parentProp);
      const parentId = parentNotionIds[0] ?? null;

      let programId: string | null = null;
      if (parentId) {
        const { data: prog, error: pErr } = await admin
          .from("programs")
          .select("id")
          .eq("notion_id", parentId)
          .maybeSingle();
        if (pErr) throw pErr;
        if (!prog) {
          const msg = `Programa pai não encontrado para parent notion_id=${parentId}. Sincroniza primeiro a database de Programas.`;
          await log("error", payload, notionPageId, eventType, msg);
          return new Response(JSON.stringify({ error: msg }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        programId = prog.id;
      }

      const { error } = await admin
        .from("training_actions")
        .upsert(
          {
            notion_id: notionPageId,
            title,
            description,
            max_capacity: maxCapacity,
            required_fields: requiredFields,
            program_id: programId,
          },
          { onConflict: "notion_id" },
        );
      if (error) throw error;
    }

    await log("ok", payload, notionPageId, eventType);

    return new Response(
      JSON.stringify({ ok: true, notion_id: notionPageId, tipo }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    let msg: string;
    if (err instanceof Error) {
      msg = err.message;
    } else if (err && typeof err === "object") {
      const e = err as Record<string, unknown>;
      msg = [e.message, e.details, e.hint, e.code]
        .filter(Boolean)
        .join(" | ") || JSON.stringify(err);
    } else {
      msg = String(err);
    }
    await log("error", payload, notionPageId, eventType, msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
