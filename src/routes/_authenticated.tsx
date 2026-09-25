import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  // A sessão vive no navegador: sem isto, abrir o link direto redireciona para /auth.
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      // Não preservamos a URL de origem: depois de autenticar queremos
      // mandar sempre o utilizador para a página inicial, para evitar que
      // caia numa página onde não tem acesso.
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});

