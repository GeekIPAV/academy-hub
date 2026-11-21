import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  listEquipaProgramas,
  listProgramaOrganizacoes,
  listProgramaParticipantesEquipa,
  atualizarEstadoParticipante,
  setProgramaEnrollmentOpenEquipa,
} from "@/lib/equipa-programas.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Partes da gestão de um programa usadas na página do programa (Gestão →
 * Programas) e na página da Equipa IPAV: inscrições abertas e link público,
 * participantes com estado editável e detalhe de uma organização.
 */

export const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};

const PART_STATUS: Array<{ value: string; label: string }> = [
  { value: "aprovada", label: "Inscrito" },
  { value: "lista_espera", label: "Lista de espera" },
  { value: "desistiu", label: "Desistiu" },
  { value: "concluido", label: "Concluído" },
];

export function copy(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Link copiado");
}

export function EnrollmentToggle({ programId, open }: { programId: string; open: boolean }) {
  const qc = useQueryClient();
  const toggleFn = useServerFn(setProgramaEnrollmentOpenEquipa);
  const m = useMutation({
    mutationFn: (vars: { programId: string; open: boolean }) => toggleFn({ data: vars }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["equipa-programas"] });
      const prev = qc.getQueryData<any[]>(["equipa-programas"]);
      qc.setQueryData<any[]>(["equipa-programas"], (old) =>
        (old ?? []).map((p) =>
          p.id === vars.programId ? { ...p, enrollment_open: vars.open } : p,
        ),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["equipa-programas"], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["equipa-programas"] }),
  });
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
      <Switch
        checked={open}
        disabled={m.isPending}
        onCheckedChange={(v) => m.mutate({ programId, open: v })}
        aria-label="Inscrições abertas"
      />
      <span className="text-sm">Inscrições {open ? "abertas" : "fechadas"}</span>
    </div>
  );
}

export function ParticipantesEquipa({
  programId,
  cohortId,
  onOpenEntity,
}: {
  programId: string;
  cohortId?: string;
  onOpenEntity?: (cohortId: string, name: string) => void;
}) {
  const qc = useQueryClient();
  const fn = useServerFn(listProgramaParticipantesEquipa);
  const updateFn = useServerFn(atualizarEstadoParticipante);

  const { data, isLoading } = useQuery({
    queryKey: ["equipa-participantes", programId, cohortId ?? "all"],
    queryFn: () => fn({ data: { programId, cohortId } }),
  });
  const rows = Array.isArray(data) ? data : [];

  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: string }) =>
      updateFn({ data: vars as { id: string; status: "aprovada" | "lista_espera" | "desistiu" | "concluido" } }),
    onSuccess: () => {
      toast.success("Estado atualizado");
      qc.invalidateQueries({ queryKey: ["equipa-participantes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Participantes</CardTitle>
            <CardDescription>
              Formandos inscritos {cohortId ? "nesta organização" : "neste programa"}.
            </CardDescription>
          </div>
          <Badge variant="secondary">{rows.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                {!cohortId && <TableHead>Organização</TableHead>}
                <TableHead className="w-48">Estado</TableHead>
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
                    Sem participantes.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.email ?? "—"}</TableCell>
                  {!cohortId && (
                    <TableCell>
                      <Button
                        variant="link"
                        className="h-auto p-0 text-sm"
                        onClick={() =>
                          r.cohort_id && onOpenEntity?.(r.cohort_id, r.entity_name)
                        }
                      >
                        {r.entity_name}
                      </Button>
                    </TableCell>
                  )}
                  <TableCell>
                    <Select
                      value={r.status}
                      onValueChange={(v) => mutation.mutate({ id: r.id, status: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PART_STATUS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

export function OrganizacaoDetalhe({
  programId,
  cohortId,
  entityName,
  onBack,
}: {
  programId: string;
  cohortId: string;
  entityName: string;
  onBack: () => void;
}) {
  const fn = useServerFn(listProgramaOrganizacoes);
  const { data } = useQuery({
    queryKey: ["equipa-organizacoes", programId],
    queryFn: () => fn({ data: { programId } }),
  });
  const row = (Array.isArray(data) ? data : []).find((r) => r.cohort_id === cohortId);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteLink = row?.invite_token ? `${origin}/inscricao/${row.invite_token}` : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <h2 className="text-lg font-semibold">{entityName}</h2>
        {row && (
          <Badge variant={row.status === "aprovada" ? "default" : "secondary"}>
            {STATUS_LABEL[row.status] ?? row.status}
          </Badge>
        )}
      </div>

      {inviteLink ? (
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Link de inscrição de formandos
          </p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate text-xs">{inviteLink}</code>
            <Button size="sm" variant="outline" onClick={() => copy(inviteLink)}>
              <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-4 text-sm text-muted-foreground">
          O link de inscrição de formandos fica disponível depois da aprovação.
        </Card>
      )}

      <ParticipantesEquipa programId={programId} cohortId={cohortId} />
    </div>
  );
}

/** Interruptor das inscrições e link público para as organizações se inscreverem. */
export function InscricoesDoPrograma({ programId }: { programId: string }) {
  const listFn = useServerFn(listEquipaProgramas);
  const { data, isLoading } = useQuery({ queryKey: ["equipa-programas"], queryFn: () => listFn() });
  const p = (Array.isArray(data) ? data : []).find((x) => x.id === programId);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = p?.public_enroll_token ? `${origin}/inscricao-entidade/${p.public_enroll_token}` : null;
  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (!p) return null;
  return (
    <div className="space-y-3 rounded-xl border bg-card p-5">
      <div>
        <p className="text-sm font-semibold text-secondary">Inscrições</p>
        <p className="text-xs text-muted-foreground">Com as inscrições abertas, as organizações inscrevem-se pelo link público.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <EnrollmentToggle programId={p.id} open={!!p.enrollment_open} />
        {link && (
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5">
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Link orgs</span>
            <code className="min-w-0 flex-1 truncate text-xs">{link}</code>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Copiar link" onClick={() => copy(link)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
