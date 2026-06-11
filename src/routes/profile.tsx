import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldAlert, Award } from "lucide-react";
import { useUserBadges } from "@/hooks/use-badges";
import { useAuth } from "@/hooks/use-auth";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useApp } from "@/lib/app-context";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";
import { supabase } from "@/integrations/supabase/client";
import { anonimizarUtilizador } from "@/lib/governance.functions";
import { CertificacaoForm } from "@/components/CertificacaoForm";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "O meu Perfil — Academia Ubuntu" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, isComponentVisible } = useApp();
  const qc = useQueryClient();
  const { user } = useAuth();
  const visible = (id: string) => isComponentVisible("/profile", id);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ComponentAccessMatrix pagePath="/profile" />
      {visible("header") && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">O meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Gere os seus dados pessoais e de certificação.</p>
        </div>
      )}

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados básicos</TabsTrigger>
          <TabsTrigger value="certificacao">Dados de certificação</TabsTrigger>
          <TabsTrigger value="badges">Credenciais</TabsTrigger>
          <TabsTrigger value="privacidade">Privacidade</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados</CardTitle>
              <CardDescription>Informação básica do utilizador</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" defaultValue={profile?.full_name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Perfil de acesso</Label>
                <Input id="role" value={profile?.role ?? ""} disabled />
              </div>
              <Button>Guardar alterações</Button>
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="certificacao" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados de Certificação</CardTitle>
              <CardDescription>
                Dados oficiais utilizados na emissão dos certificados de participação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CertificacaoForm
                onSaved={async () => {
                  await qc.invalidateQueries({ queryKey: ["cert-gate-status"] });
                  toast.success("Dados de certificação atualizados.");
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-6 pt-4">
          <BadgesSection userId={profile?.id ?? null} />
        </TabsContent>

        <TabsContent value="privacidade" className="space-y-6 pt-4">
          <PrivacySection userId={profile?.id ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BadgesSection({ userId }: { userId: string | null }) {
  const { data: badges, isLoading } = useUserBadges(userId);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          As Minhas Credenciais / Badges
        </CardTitle>
        <CardDescription>
          Reconhecimentos obtidos ao longo do seu percurso na Academia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar credenciais…</p>
        ) : !badges || badges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não conquistou nenhuma credencial. Conclua um programa para começar a colecionar badges.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {badges.map((b) => (
              <div
                key={b.id}
                className="flex flex-col items-center rounded-lg border bg-card p-4 text-center transition-shadow hover:shadow-md"
              >
                {b.cover_url ? (
                  <img
                    src={b.cover_url}
                    alt={b.title}
                    className="mb-3 h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <Award className="h-10 w-10 text-primary" />
                  </div>
                )}
                <p className="text-sm font-semibold leading-tight">{b.title}</p>
                {b.cluster && (
                  <p className="mt-1 text-xs text-muted-foreground">{b.cluster}</p>
                )}
                {b.granted_at && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Conquistado a{" "}
                    {new Date(b.granted_at).toLocaleDateString("pt-PT")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PrivacySection({ userId }: { userId: string | null }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const anonFn = useServerFn(anonimizarUtilizador);

  const mut = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("Sessão inválida.");
      return anonFn({ data: { userId } });
    },
    onSuccess: async () => {
      toast.success("Os seus dados foram anonimizados.");
      await supabase.auth.signOut();
      navigate({ to: "/" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-5 w-5" />
          Privacidade e Dados
        </CardTitle>
        <CardDescription>
          Exerça o seu Direito ao Esquecimento (RGPD). Esta ação é irreversível.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setConfirmed(false);
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive">
              Eliminar conta e apagar Dados Pessoais
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é irreversível. Os seus dados pessoais serão substituídos por
                informação genérica e perderá o acesso à plataforma. O seu histórico de
                participações será mantido anonimamente para fins estatísticos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                className="mt-0.5"
              />
              <span>Confirmo que desejo eliminar a minha conta.</span>
            </label>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={mut.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!confirmed || mut.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  mut.mutate();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {mut.isPending ? "A eliminar..." : "Eliminar definitivamente"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
