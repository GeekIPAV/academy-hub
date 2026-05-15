import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Copy, Link2, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyEntidade, updateMyEntidade } from "@/lib/entidade.functions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/lib/app-context";
import { MOCK_ENTITY, MOCK_ENTITY_TRAINEES } from "@/lib/mock-data";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";

export const Route = createFileRoute("/entidade/dashboard")({
  head: () => ({ meta: [{ title: "Painel da Entidade — Academia Ubuntu" }] }),
  component: EntidadeDashboardPage,
});

function EntidadeDashboardPage() {
  const { activeRoles, isAdmin, isComponentVisible } = useApp();
  const visible = (id: string) => isComponentVisible("/entidade/dashboard", id);
  const hasAccess = isAdmin || activeRoles.includes("Entidade");

  if (!hasAccess) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta área é exclusiva para Representantes de Entidades parceiras.
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ComponentAccessMatrix pagePath="/entidade/dashboard" />

      {visible("header") && (
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Painel da Entidade
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Bem-vindo, {MOCK_ENTITY.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe os seus formandos e mantenha os dados institucionais atualizados.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          {visible("tab-overview") && <TabsTrigger value="overview">Visão Geral</TabsTrigger>}
          {visible("tab-data") && <TabsTrigger value="data">Dados da Entidade</TabsTrigger>}
        </TabsList>

        {visible("tab-overview") && (
          <TabsContent value="overview" className="space-y-6">
            {visible("invite-card") && <InviteCard />}
            {visible("trainees-table") && <TraineesTable />}
          </TabsContent>
        )}

        {visible("tab-data") && (
          <TabsContent value="data">
            <EntityDataForm />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function InviteCard() {
  const inviteUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/inscricao/${MOCK_ENTITY.invite_token}`;
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Link copiado para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Link de Acesso para Formandos</CardTitle>
        </div>
        <CardDescription>
          Partilhe este link com os formandos da sua entidade para que se possam inscrever
          automaticamente associados ao seu grupo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input readOnly value={inviteUrl} className="font-mono text-xs" />
          <Button onClick={copy} className="shrink-0">
            <Copy className="mr-2 h-4 w-4" />
            Copiar Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TraineesTable() {
  // Filtragem rigorosa: apenas formandos do cohort_id da Entidade logada.
  const trainees = MOCK_ENTITY_TRAINEES;

  const statusVariant = (s: string) =>
    s === "Inscrito" ? "default" : s === "Concluído" ? "secondary" : "outline";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Ponto de Situação</CardTitle>
            <CardDescription>Formandos inscritos através do seu link.</CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {trainees.length} Formandos Inscritos
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status da Inscrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Ainda não há formandos inscritos.
                  </TableCell>
                </TableRow>
              )}
              {trainees.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{t.email}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function EntityDataForm() {
  const [name, setName] = useState(MOCK_ENTITY.name);
  const [contactName, setContactName] = useState(MOCK_ENTITY.contact_name);
  const [contactEmail, setContactEmail] = useState(MOCK_ENTITY.contact_email);
  const [contactPhone, setContactPhone] = useState(MOCK_ENTITY.contact_phone);

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Dados atualizados (mock)");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados Institucionais</CardTitle>
        <CardDescription>
          Mantenha o nome da entidade e o ponto de contacto atualizados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="entity-name">Nome da Entidade</Label>
            <Input id="entity-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <div className="border-t pt-4">
              <p className="text-sm font-medium">Ponto de Contacto</p>
              <p className="text-xs text-muted-foreground">
                Pessoa responsável pela ligação com a Academia.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-name">Nome do Responsável</Label>
            <Input
              id="contact-name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Email de Contacto</Label>
            <Input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-phone">Telefone da Entidade</Label>
            <Input
              id="contact-phone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit">Guardar Alterações</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
