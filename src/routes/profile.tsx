import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";

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
              <Input id="name" defaultValue={profile.full_name} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nif">NIF</Label>
                <Input id="nif" defaultValue={profile.nif} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={profile.email} />
              </div>
            </div>
            <Button>Guardar alterações</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
