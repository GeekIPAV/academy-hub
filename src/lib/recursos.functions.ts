import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const schema = z.object({ path: z.string().min(1).max(1024) });

// Returns a short-lived signed URL for a file in the private "resources" bucket.
// Only signed-in users may obtain a link.
export const getRecursoSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data }) => {
    const marker = "/storage/v1/object/public/resources/";
    let path = data.path;
    const idx = path.indexOf(marker);
    if (idx >= 0) path = path.slice(idx + marker.length);
    // Strip any leading slash
    path = path.replace(/^\/+/, "");

    const { data: signed, error } = await supabaseAdmin.storage
      .from("resources")
      .createSignedUrl(path, 60 * 10);
    if (error || !signed?.signedUrl) {
      throw new Error(error?.message ?? "Não foi possível gerar o link.");
    }
    return { url: signed.signedUrl };
  });
