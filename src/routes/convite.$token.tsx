import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getInviteInfo, redeemInvite } from "@/lib/invites.functions";

export const Route = createFileRoute("/convite/$token")({
  head: () => ({ meta: [{ title: "Aderir à plataforma" }] }),
  component: ConvitePage,
});

function ConvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const infoFn = useServerFn(getInviteInfo);
  const redeemFn = useServerFn(redeemInvite);

  const info = useQuery({
    queryKey: ["invite-info", token],
    queryFn: () => infoFn({ data: { token } }),
    retry: false,
  });

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  const redeem = useMutation({
    mutationFn: () => redeemFn({ data: { token, email, full_name: fullName, password } }),
    onSuccess: async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.success("Conta criada. Faz login para continuar.");
        navigate({ to: "/auth" });
      } else {
        toast.success("Conta criada!");
        navigate({ to: "/dashboard" });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim() || password.length < 8) {
      toast.error("Preenche todos os campos (mínimo 8 caracteres na senha).");
      return;
    }
    redeem.mutate();
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Aderir à plataforma</CardTitle>
          <CardDescription>
            Preenche os teus dados para criar a conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {info.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : info.isError ? (
            <p className="text-sm text-destructive">
              {(info.error as Error)?.message ?? "Convite inválido."}
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {info.data?.label && (
                <p className="text-sm text-muted-foreground">{info.data.label}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {info.data?.roles.map((r) => (
                  <Badge key={r} variant="secondary">
                    {r}
                  </Badge>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha (mín. 8 caracteres)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={redeem.isPending}>
                {redeem.isPending ? "A criar conta..." : "Criar conta"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
