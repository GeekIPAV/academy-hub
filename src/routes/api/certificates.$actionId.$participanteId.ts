import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute(
  "/api/certificates/$actionId/$participanteId",
)({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { actionId, participanteId } = params;
        // Basic UUID-ish validation
        const safe = /^[a-zA-Z0-9-]{8,64}$/;
        if (!safe.test(actionId) || !safe.test(participanteId)) {
          return new Response("Bad request", { status: 400 });
        }

        const path = `${actionId}/${participanteId}.pdf`;
        const { data, error } = await supabaseAdmin.storage
          .from("certificados")
          .download(path);

        if (error || !data) {
          return new Response("Não encontrado", { status: 404 });
        }

        const bytes = new Uint8Array(await data.arrayBuffer());
        return new Response(bytes, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="certificado-${participanteId}.pdf"`,
            "Cache-Control": "private, max-age=60",
          },
        });
      },
    },
  },
});
