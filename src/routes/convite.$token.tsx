import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  validateStaffInvite,
  consumeStaffInvite,
} from "@/lib/invites.functions";

export const Route = createFileRoute("/convite/$token")({
  head: () => ({ meta: [{ title: "Convite — Academia Ubuntu" }] }),
  component: ConvitePage,
});

function ConvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const validateFn = useServerFn(validateStaffInvite);
  const consumeFn = useServerFn(consumeStaffInvite);

  const info = useQuery({
    queryKey: ["invite-info", token],
    queryFn: () => validateFn({ data: { token } }),
    retry: false,
  });

  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setAuthedUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthedUserId(session?.user?.id ?? null);
      setAuthChecked(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const accept = useMutation({
    mutationFn: () => consumeFn({ data: { token } }),
    onSuccess: () => {
      toast.success("Bem-vindo à equipa!");
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-consome o convite assim que o utilizador estiver autenticado e o convite for válido.
  useEffect(() => {
    if (
      authChecked &&
      authedUserId &&
      info.data &&
      !accept.isPending &&
      !accept.isSuccess &&
      !accept.isError
    ) {
      accept.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, authedUserId, info.data]);


  // Redireciona automaticamente para /auth se não estiver autenticado.
  useEffect(() => {
    if (authChecked && !authedUserId) {
      navigate({ to: "/auth", search: { redirect: `/convite/${token}` } });
    }
  }, [authChecked, authedUserId, token, navigate]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardContent className="pt-6">
          {info.isLoading || !authChecked ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-2/3 mx-auto" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : info.isError ? (
            <div className="space-y-4 text-center">
              <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
              <p className="font-medium">Não foi possível validar este convite</p>
              <p className="text-sm text-muted-foreground">
                {(info.error as Error)?.message ?? "Link inválido."}
              </p>
              <Button variant="outline" onClick={() => navigate({ to: "/" })}>
                Voltar
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <h1 className="text-center text-2xl md:text-3xl font-bold text-primary">
                Aceita o convite para te juntares à plataforma
              </h1>

              {authedUserId ? (
                <Button
                  className="w-full"
                  disabled={accept.isPending}
                  onClick={() => accept.mutate()}
                >
                  {accept.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A aceitar…
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Aceitar Convite
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
