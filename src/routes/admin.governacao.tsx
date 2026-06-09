import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

import { useApp } from "@/lib/app-context";
import {
  listGovernanceFields,
  setFieldClassification,
  syncGovernanceSchema,
  type GovernanceField,
} from "@/lib/governance.functions";

export const Route = createFileRoute("/admin/governacao")({
  head: () => ({ meta: [{ title: "Governação de Dados — Admin" }] }),
  component: GovernancaPage,
});

function GovernancaPage() {
  const { isAdmin } = useApp();
  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <Shield className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Apenas administradores podem aceder à Governação de Dados.
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Governação de Dados</h1>
        <p className="text-sm text-muted-foreground">
          Define que colunas da tabela de utilizadores são consideradas sensíveis para
          efeitos de anonimização RGPD. A lista é sincronizada automaticamente com o schema.
        </p>
      </div>
      <FieldsTable />
    </div>
  );
}

function FieldsTable() {
  const qc = useQueryClient();
  const listFn = useServerFn(listGovernanceFields);
  const setFn = useServerFn(setFieldClassification);
  const syncFn = useServerFn(syncGovernanceSchema);

  const { data, isLoading } = useQuery({
    queryKey: ["governance-fields"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  const setMut = useMutation({
    mutationFn: (vars: { column_name: string; classification: "publica" | "sensivel" }) =>
      setFn({ data: vars }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["governance-fields"] });
      const prev = qc.getQueryData<{ fields: GovernanceField[]; pruned: number }>([
        "governance-fields",
      ]);
      if (prev) {
        qc.setQueryData(["governance-fields"], {
          ...prev,
          fields: prev.fields.map((f) =>
            f.column_name === vars.column_name
              ? { ...f, classification: vars.classification }
              : f,
          ),
        });
      }
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["governance-fields"], ctx.prev);
      toast.error(e.message);
    },
    onSuccess: () => toast.success("Classificação atualizada."),
    onSettled: () => qc.invalidateQueries({ queryKey: ["governance-fields"] }),
  });

  const syncMut = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (res) => {
      toast.success(
        res.pruned > 0
          ? `Schema sincronizado. ${res.pruned} entrada(s) órfã(s) removida(s).`
          : "Schema sincronizado.",
      );
      qc.invalidateQueries({ queryKey: ["governance-fields"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fields = data?.fields ?? [];
  const sensitiveCount = fields.filter((f) => f.classification === "sensivel").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Colunas da tabela utilizadores</CardTitle>
          <CardDescription>
            {isLoading
              ? "A carregar schema..."
              : `${fields.length} coluna(s) · ${sensitiveCount} marcada(s) como sensível.`}
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => syncMut.mutate()}
          disabled={syncMut.isPending}
        >
          <RefreshCw
            className={`mr-1 h-4 w-4 ${syncMut.isPending ? "animate-spin" : ""}`}
          />
          Sincronizar Schema
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem colunas detetadas.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Coluna</TableHead>
                <TableHead className="w-[180px]">Tipo de Dados</TableHead>
                <TableHead className="w-[260px]">Classificação de Privacidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((f) => (
                <TableRow key={f.column_name}>
                  <TableCell className="font-medium">
                    {f.column_name}
                    {f.locked && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        <Lock className="mr-1 h-3 w-3" />
                        Estrutural
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {f.data_type}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={f.classification}
                      disabled={f.locked || setMut.isPending}
                      onValueChange={(v) =>
                        setMut.mutate({
                          column_name: f.column_name,
                          classification: v as "publica" | "sensivel",
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="publica">Pública (Manter)</SelectItem>
                        <SelectItem value="sensivel" disabled={f.locked}>
                          Sensível (Anonimizar no RGPD)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
