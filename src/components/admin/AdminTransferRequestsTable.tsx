import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, X, Inbox } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminDecideTransferRequest,
  adminListTransferRequests,
} from "@/lib/entidade.functions";

export function AdminTransferRequestsTable() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListTransferRequests);
  const decideFn = useServerFn(adminDecideTransferRequest);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "transfer-requests"],
    queryFn: () => listFn(),
  });

  const decide = useMutation({
    mutationFn: (vars: { requestId: string; decision: "aprovado" | "recusado" }) =>
      decideFn({ data: vars }),
    onSuccess: (_d, vars) => {
      if (vars.decision === "aprovado") toast.success("Transferência concluída");
      else toast.error("Pedido recusado");
      qc.invalidateQueries({ queryKey: ["admin", "transfer-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "entidades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-5 w-5" /> Pedidos de Transferência de Responsável
        </CardTitle>
        <CardDescription>
          Aprove ou recuse pedidos de utilizadores que querem assumir uma organização já
          com responsável.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Não há pedidos pendentes.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organização</TableHead>
                <TableHead>Responsável Atual</TableHead>
                <TableHead>Requerente</TableHead>
                <TableHead>Data do Pedido</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const pending = decide.isPending && decide.variables?.requestId === r.id;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.entity_name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="text-sm">{r.current_owner?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.current_owner?.email ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{r.requester.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.requester.email ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pt-PT")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={pending}
                          onClick={() =>
                            decide.mutate({ requestId: r.id, decision: "aprovado" })
                          }
                        >
                          <Check className="mr-1 h-3.5 w-3.5" /> Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={pending}
                          onClick={() =>
                            decide.mutate({ requestId: r.id, decision: "recusado" })
                          }
                        >
                          <X className="mr-1 h-3.5 w-3.5" /> Recusar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
