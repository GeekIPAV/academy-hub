import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Área pessoal — Academia de Líderes Ubuntu" },
    { name: "description", content: "A tua área pessoal de formação e programas Ubuntu." },
    { property: "og:title", content: "Área pessoal — Academia de Líderes Ubuntu" },
    { property: "og:description", content: "Formação e programas da Academia de Líderes Ubuntu." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth" });
    }
    throw redirect({ to: "/dashboard" });
  },
});
