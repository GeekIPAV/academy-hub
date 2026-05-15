import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap, ShieldAlert, Users, Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  listProgramas,
  listProgramaEntidades,
  listProgramaParticipantes,
} from "@/lib/admin-programas.functions";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/admin/programas")({
  head: () => ({ meta: [{ title: "Gestão de Programas — Admin" }] }),
  component: AdminProgramasPage,
});

function AdminProgramasPage() {
  const { isAdmin } = useApp();

  const fetchProgramas = useServerFn(listProgramas);
  const { data: programasRaw, isLoading: loadingProgramas, error: programasError } = useQuery({
    queryKey: ["admin-programas"],
    queryFn: () => fetchProgramas(),
    enabled: isAdmin,
    retry: false,
  });
  const programas = Array.isArray(programasRaw) ? programasRaw : [];

  const [programId, setProgramId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!programId && programas.length > 0) setProgramId(programas[0].id);
  }, [programas, programId]);

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta área é exclusiva para administradores.
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-semibold tracking-tight">Gestão de Programas</h1>
          <p className="text-sm text-muted-foreground">
            Visão centralizada de instituições e participantes por programa.
          </p>
        </div>
      </div>

      <Card className="p-4">
        <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Programa
        </Label>
        {loadingProgramas ? (
          <Skeleton className="h-10 max-w-md" />
        ) : (
          <Select value={programId ?? ""} onValueChange={(v) => setProgramId(v)}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Selecionar programa…" />
            </SelectTrigger>
            <SelectContent>
              {programas.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title ?? "(sem título)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {programasError && (
          <p className="mt-2 text-xs text-destructive">
            Não foi possível carregar programas ({(programasError as Error).message}).
          </p>
        )}
      </Card>

      {!programId ? (
        <EmptyState />
      ) : (
        <Tabs defaultValue="instituicoes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="instituicoes">
              <Building2 className="mr-2 h-4 w-4" />
              Instituições
            </TabsTrigger>
            <TabsTrigger value="participantes">
              <Users className="mr-2 h-4 w-4" />
              Participantes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instituicoes">
            <InstituicoesTab programId={programId} />
          </TabsContent>
          <TabsContent value="participantes">
            <ParticipantesTab programId={programId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <GraduationCap className="h-10 w-10 text-muted-foreground/60" />
        <p className="text-sm font-medium">Selecione um programa</p>
        <p className="text-xs text-muted-foreground">
          Escolha um programa no seletor acima para ver as instituições inscritas e os
          respetivos participantes.
        </p>
      </CardContent>
    </Card>
  );
}

function InstituicoesTab({ programId }: { programId: string }) {
  const fn = useServerFn(listProgramaEntidades);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-programa-entidades", programId],
    queryFn: () => fn({ data: { programId } }),
    retry: false,
  });
  const rows = Array.isArray(data) ? data : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Instituições inscritas</CardTitle>
            <CardDescription>Entidades associadas ao programa selecionado.</CardDescription>
          </div>
          <Badge variant="secondary">{rows.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-3 text-sm text-destructive">
            Erro: {(error as Error).message}
          </p>
        )}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instituição</TableHead>
                <TableHead>Localidade</TableHead>
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
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhuma instituição inscrita neste programa.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.cohort_id}>
                  <TableCell className="font-medium">{r.entity_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.entity_locality ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.is_active ? "default" : "outline"}>
                      {r.is_active ? "Ativo" : "Inativo"}
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

function ParticipantesTab({ programId }: { programId: string }) {
  const fn = useServerFn(listProgramaParticipantes);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-programa-participantes", programId],
    queryFn: () => fn({ data: { programId } }),
    retry: false,
  });
  const rows = Array.isArray(data) ? data : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Participantes</CardTitle>
            <CardDescription>
              Formandos inscritos em qualquer instituição deste programa.
            </CardDescription>
          </div>
          <Badge variant="secondary">{rows.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-3 text-sm text-destructive">
            Erro: {(error as Error).message}
          </p>
        )}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome Completo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Instituição</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Sem participantes inscritos neste programa.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.entity_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.status ?? "—"}</Badge>
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
