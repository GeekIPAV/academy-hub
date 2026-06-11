import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteGate } from "@/components/RouteGate";
import {
  adminListEntidades,
  getOrCreateEntidadeInvite,
} from "@/lib/entidade.functions";

export const Route = createFileRoute("/admin/entidades")({
  head: () => ({ meta: [{ title: "Gestão de Entidades — Admin" }] }),
  component: () => (
    <RouteGate path="/admin/entidades">
      <AdminEntidadesPage />
    </RouteGate>
  ),
});

function AdminEntidadesPage() {
  const listFn = useServerFn(adminListEntidades);
  const inviteFn = useServerFn(getOrCreateEntidadeInvite);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "entidades"],
    queryFn: () => listFn(),
  });

  const copyInvite = useMutation({
    mutationFn: () => inviteFn({ data: {} as never }),
    onSuccess: async (res) => {
      const url = `${window.location.origin}/convite/${res.token}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link de convite copiado.", { description: url });
      } catch {
        toast.message("Link gerado", { description: url });
      }
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Erro a gerar convite."),
  });

  const entidades = data ?? [];

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Building2 className="h-6 w-6" /> Gestão de Entidades
          </h1>
          <p className="text-sm text-muted-foreground">
            Todas as entidades registadas na plataforma.
          </p>
        </div>
        <Button
          onClick={() => copyInvite.mutate()}
          disabled={copyInvite.isPending}
        >
          <Copy className="mr-2 h-4 w-4" />
          {copyInvite.isPending ? "A gerar…" : "Copiar link de convite (Entidade)"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entidades</CardTitle>
          <CardDescription>
            {entidades.length} {entidades.length === 1 ? "entidade" : "entidades"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : entidades.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda não há entidades registadas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Localidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entidades.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>
                      {e.status ? (
                        <Badge variant="secondary">{e.status}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{e.contact_name ?? "—"}</TableCell>
                    <TableCell>{e.contact_email ?? "—"}</TableCell>
                    <TableCell>{e.contact_phone ?? "—"}</TableCell>
                    <TableCell>{e.locality ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
