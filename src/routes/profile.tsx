import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Perfil — Academia Ubuntu" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, isComponentVisible } = useApp();
  const visible = (id: string) => isComponentVisible("/profile", id);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ComponentAccessMatrix pagePath="/profile" />
      {visible("header") && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Editar Perfil</h1>
          <p className="text-sm text-muted-foreground">Atualize os seus dados pessoais.</p>
        </div>
      )}
      {visible("form") && (
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
              <Label htmlFor="role">Perfil de acesso</Label>
              <Input id="role" value={profile?.role ?? ""} disabled />
            </div>
            <Button>Guardar alterações</Button>
          </CardContent>
        </Card>
      )}
      <PrivacySection userId={profile?.id ?? null} />
    </div>
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
              Anonimizar Dados Pessoais (RGPD)
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
              <span>Confirmo que desejo anonimizar os meus dados.</span>
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
                {mut.isPending ? "A anonimizar..." : "Anonimizar definitivamente"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
