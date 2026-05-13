// Notion webhook receiver — sincroniza Programs e Training Actions.
// Validação de Token via header `x-notion-token`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-notion-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPECTED_TOKEN = Deno.env.get("NOTION_WEBHOOK_TOKEN")!;

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
    const props = page?.properties ?? {};
    const title = getTitle(props);
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

    // Hint: tipo da entidade — "program" | "action".
    // Usa propriedade explícita "Entity" (select) ou heurística por presença
    // de relação a um programa pai.
    const entityProp = props["Entity"] ?? props["Tipo"];
    const entityHint: string | null =
      entityProp?.type === "select" ? (entityProp.select?.name ?? null) : null;

    const parentProp =
      props["Program"] ?? props["Programa"] ?? props["Parent Program"];
    const parentNotionIds = getRelationIds(parentProp);
    const isAction =
      entityHint?.toLowerCase().startsWith("ac") ?? parentNotionIds.length > 0;

    if (!notionPageId) throw new Error("Payload sem id da página Notion.");
    if (!title) throw new Error("Payload sem título.");

    if (!isAction) {
      // Upsert program
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
      // Resolver program_id a partir do parent Notion id
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
          const msg = `Programa pai não encontrado para parent notion_id=${parentId}`;
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

    return new Response(JSON.stringify({ ok: true, notion_id: notionPageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await log("error", payload, notionPageId, eventType, msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
