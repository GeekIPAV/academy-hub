import { useEffect, useState } from "react";
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
import {
  getMyEntidade,
  listAllEntidades,
  listMyCohorts,
  listMyTrainees,
  updateMyEntidade,
} from "@/lib/entidade.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/lib/app-context";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";

export const Route = createFileRoute("/entidade/dashboard")({
  head: () => ({ meta: [{ title: "Painel da Entidade — Academia Ubuntu" }] }),
  component: EntidadeDashboardPage,
});

function EntidadeDashboardPage() {
  const { activeRoles, isAdmin, isComponentVisible } = useApp();
  const visible = (id: string) => isComponentVisible("/entidade/dashboard", id);
  const hasAccess = isAdmin || activeRoles.includes("Entidade");

  const fetchEntidades = useServerFn(listAllEntidades);
  const { data: entidadesRaw, error: entidadesError } = useQuery({
    queryKey: ["all-entidades"],
    queryFn: () => fetchEntidades(),
    enabled: hasAccess && isAdmin,
    retry: false,
  });
  const entidades = Array.isArray(entidadesRaw) ? entidadesRaw : [];

  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
  useEffect(() => {
    if (isAdmin && !selectedEntityId && entidades.length > 0) {
      setSelectedEntityId(entidades[0].id);
    }
  }, [isAdmin, entidades, selectedEntityId]);

  const fetchEntidade = useServerFn(getMyEntidade);
  const { data: entidade } = useQuery({
    queryKey: ["my-entidade", selectedEntityId ?? "self"],
    queryFn: () =>
      fetchEntidade(selectedEntityId ? { data: { entityId: selectedEntityId } } : undefined as never),
    enabled: hasAccess && (!isAdmin || !!selectedEntityId),
  });

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
              Bem-vindo{entidade?.name ? `, ${entidade.name}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe os seus formandos e mantenha os dados institucionais atualizados.
            </p>
          </div>
        </div>
      )}

      {isAdmin && (
        <Card className="p-4">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Entidade (modo admin)
          </Label>
          <Select
            value={selectedEntityId ?? ""}
            onValueChange={(v) => setSelectedEntityId(v)}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Selecionar entidade…" />
            </SelectTrigger>
            <SelectContent>
              {(entidades ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          {visible("tab-overview") && <TabsTrigger value="overview">Visão Geral</TabsTrigger>}
          {visible("tab-data") && <TabsTrigger value="data">Dados da Entidade</TabsTrigger>}
        </TabsList>

        {visible("tab-overview") && (
          <TabsContent value="overview" className="space-y-6">
            {visible("invite-card") && <InviteCard entityId={selectedEntityId} />}
            {visible("trainees-table") && <TraineesTable entityId={selectedEntityId} />}
          </TabsContent>
        )}

        {visible("tab-data") && (
          <TabsContent value="data">
            <EntityDataForm entityId={selectedEntityId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function InviteCard({ entityId }: { entityId?: string }) {
  const fetchFn = useServerFn(listMyCohorts);
  const { data, isLoading } = useQuery({
    queryKey: ["my-cohorts", entityId ?? "self"],
    queryFn: () => fetchFn(entityId ? { data: { entityId } } : (undefined as never)),
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
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
          <CardTitle className="text-base">Links de Acesso para Formandos</CardTitle>
        </div>
        <CardDescription>
          Partilhe estes links com os formandos da sua entidade para que se possam
          inscrever automaticamente associados ao seu grupo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-9 w-full" />}
        {!isLoading && (!data || data.length === 0) && (
          <p className="text-sm text-muted-foreground">
            Ainda não há programas associados à sua entidade.
          </p>
        )}
        {data?.map((c) => {
          const url = `${origin}/inscricao/${c.invite_token ?? ""}`;
          return (
            <div key={c.id} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium">
                  {c.programas?.title ?? "Programa"}
                </p>
                {!c.is_active && (
                  <Badge variant="outline" className="text-xs">
                    Inativo
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input readOnly value={url} className="font-mono text-xs" />
                <Button onClick={() => copy(url)} className="shrink-0">
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function TraineesTable({ entityId }: { entityId?: string }) {
  const fetchFn = useServerFn(listMyTrainees);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-trainees", entityId ?? "self"],
    queryFn: () => fetchFn(entityId ? { data: { entityId } } : (undefined as never)),
  });

  const trainees = data ?? [];

  const statusVariant = (s: string | null) => {
    const v = (s ?? "").toLowerCase();
    if (v === "aceite" || v === "inscrito") return "default" as const;
    if (v === "concluido" || v === "concluído") return "secondary" as const;
    return "outline" as const;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Ponto de Situação</CardTitle>
            <CardDescription>Formandos inscritos através dos seus links.</CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {trainees.length} Formandos Inscritos
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-destructive">
            Erro: {(error as Error).message}
          </p>
        )}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Programa</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && trainees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Ainda não há formandos inscritos.
                  </TableCell>
                </TableRow>
              )}
              {trainees.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.program_title ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(t.status)}>
                      {t.status ?? "—"}
                    </Badge>
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

function EntityDataForm({ entityId }: { entityId?: string }) {
  const fetchFn = useServerFn(getMyEntidade);
  const updateFn = useServerFn(updateMyEntidade);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-entidade", entityId ?? "self"],
    queryFn: () => fetchFn(entityId ? { data: { entityId } } : (undefined as never)),
  });

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [locality, setLocality] = useState("");

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setContactName(data.contact_name ?? "");
    setContactEmail(data.contact_email ?? "");
    setContactPhone(data.contact_phone ?? "");
    setAddress(data.address ?? "");
    setPostalCode(data.postal_code ?? "");
    setLocality(data.locality ?? "");
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          ...(entityId ? { entityId } : {}),
          name,
          contact_name: contactName || null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          address: address || null,
          postal_code: postalCode || null,
          locality: locality || null,
        },
      }),
    onSuccess: () => {
      toast.success("Dados atualizados");
      qc.invalidateQueries({ queryKey: ["my-entidade"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-sm text-destructive">
        Erro a carregar dados: {(error as Error).message}
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        A sua conta ainda não está associada a nenhuma entidade. Contacte o administrador.
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados Institucionais</CardTitle>
        <CardDescription>
          Mantenha o nome da entidade, morada e ponto de contacto atualizados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="entity-name">Nome da Entidade</Label>
            <Input
              id="entity-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <div className="border-t pt-4">
              <p className="text-sm font-medium">Morada</p>
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Morada</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={300}
              placeholder="Rua, número, andar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postal-code">Código Postal</Label>
            <Input
              id="postal-code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="1234-567"
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locality">Localidade</Label>
            <Input
              id="locality"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              maxLength={150}
            />
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
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Email de Contacto</Label>
            <Input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contact-phone">Telefone da Entidade</Label>
            <Input
              id="contact-phone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "A guardar…" : "Guardar Alterações"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
