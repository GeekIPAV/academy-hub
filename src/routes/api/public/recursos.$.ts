import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Proxy público para os ficheiros do bucket "resources".
// Serve a partir do nosso domínio para evitar bloqueios por extensões
// (uBlock, AdBlock, Brave Shields, etc.) que bloqueiam supabase.co.
export const Route = createFileRoute("/api/public/recursos/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat;
        if (!path) return new Response("Not found", { status: 404 });

        const { data, error } = await supabaseAdmin.storage
          .from("resources")
          .download(path);

        if (error || !data) {
          return new Response("File not found", { status: 404 });
        }

        const filename = path.split("/").pop() || "file";
        const contentType = data.type || "application/octet-stream";

        return new Response(data, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `inline; filename="${filename}"`,
            "Cache-Control": "private, max-age=3600",
          },
        });
      },
    },
  },
});
