import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
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

