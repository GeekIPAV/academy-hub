import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, LogIn, Check, Loader2 } from "lucide-react";
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

  const goToAuth = () => {
    navigate({ to: "/auth", search: { redirect: `/convite/${token}` } });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Convite para a equipa</CardTitle>
          <CardDescription>
            Aceita o convite para te juntares à plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {info.isLoading || !authChecked ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-10 w-full" />
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
            <div className="space-y-5">
              {info.data?.label && (
                <p className="text-sm text-muted-foreground">{info.data.label}</p>
              )}
              <div>
                <p className="text-sm">
                  Foste convidado para te juntares à equipa como:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {info.data?.roles.map((r) => (
                    <Badge key={r} variant="secondary">
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>

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
              ) : (
                <div className="space-y-2">
                  <Button className="w-full" onClick={goToAuth}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Fazer Login / Registar
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Após autenticares, voltas automaticamente a esta página para
                    confirmar.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
