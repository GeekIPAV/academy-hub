import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listActions } from "@/lib/actions.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/actions")({
  head: () => ({ meta: [{ title: "Ações — Academia Ubuntu" }] }),
  component: ActionsPage,
});

function ActionsPage() {
  const fetchFn = useServerFn(listActions);
  const { data, isLoading, error } = useQuery({
    queryKey: ["actions"],
    queryFn: () => fetchFn(),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Eventos e Formações</h1>
        <p className="text-sm text-muted-foreground">Ações sincronizadas a partir do Notion.</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {error && <p className="text-sm text-destructive">Erro a carregar ações: {(error as Error).message}</p>}

      {data && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Programa</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Capacidade</TableHead>
                <TableHead>Inscrições</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Sem ações sincronizadas ainda.
                  </TableCell>
                </TableRow>
              )}
              {data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title ?? "(sem título)"}</TableCell>
                  <TableCell>{a.programs?.title ?? "—"}</TableCell>
                  <TableCell>{a.category ? <Badge variant="outline">{a.category}</Badge> : "—"}</TableCell>
                  <TableCell>{a.action_date ?? "—"}</TableCell>
                  <TableCell>{a.max_capacity ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={a.registration_status === "Aberto" ? "default" : "secondary"}>
                      {a.registration_status ?? "Fechado"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link to="/actions/$id" params={{ id: a.id }} className="text-sm text-primary hover:underline">
                      Ver / Inscrever
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
