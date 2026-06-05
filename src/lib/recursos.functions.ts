import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const schema = z.object({ path: z.string().min(1).max(1024) });

// Returns a short-lived signed URL for a file in the private "resources" bucket.
// Requires that the user has access to the underlying recurso (cluster / programa
// enrollment), enforced via public.user_can_access_recurso.
export const getRecursoSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const marker = "/storage/v1/object/public/resources/";
    let path = data.path;
    const idx = path.indexOf(marker);
    if (idx >= 0) path = path.slice(idx + marker.length);
    path = path.replace(/^\/+/, "");

    // Find the recurso that owns this exact storage path and verify the caller can access it.
    // Use exact-match against the public URL suffix to avoid LIKE wildcard injection (%/_).
    const publicSuffix = `/storage/v1/object/public/resources/${path}`;
    const { data: recurso, error: recursoErr } = await supabaseAdmin
      .from("recursos")
      .select("id, file_url")
      .or(`file_url.eq.${path},file_url.eq.${publicSuffix}`)
      .maybeSingle();
    if (recursoErr) throw new Error(recursoErr.message);
    if (!recurso) {
      throw new Error("Recurso não encontrado.");
    }

    const { data: allowed, error: accessErr } = await supabaseAdmin.rpc(
      "user_can_access_recurso",
      { _user_id: context.userId, _recurso_id: recurso.id },
    );
    if (accessErr) throw new Error(accessErr.message);
    if (!allowed) {
      throw new Error("Sem permissão para aceder a este recurso.");
    }

    const { data: signed, error } = await supabaseAdmin.storage
      .from("resources")
      .createSignedUrl(path, 60 * 10);
    if (error || !signed?.signedUrl) {
      throw new Error(error?.message ?? "Não foi possível gerar o link.");
    }
    return { url: signed.signedUrl };
  });
