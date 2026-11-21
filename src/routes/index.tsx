import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { MARCA, seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: seo({
      title: MARCA,
      description: "Plataforma da Academia de Líderes Ubuntu, do IPAV: formação de Educadores, eventos, recursos pedagógicos e certificados.",
    }),
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth" });
    }
    throw redirect({ to: "/dashboard" });
  },
});
