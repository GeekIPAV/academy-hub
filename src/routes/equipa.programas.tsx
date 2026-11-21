import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarDays, Check, Copy, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  listEquipaProgramas,
  listProgramaOrganizacoes,
  decidirOrganizacaoInscricao,
} from "@/lib/equipa-programas.functions";
import { RouteGate } from "@/components/RouteGate";
import { CalendarioFtpEquipa } from "@/components/equipa/CalendarioFtpEquipa";
import { EnrollmentToggle, OrganizacaoDetalhe, ParticipantesEquipa, STATUS_LABEL, copy } from "@/components/equipa/ProgramaEquipa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { seo, titulo } from "@/lib/seo";

export const Route = createFileRoute("/equipa/programas")({
  head: () => ({
    meta: seo({
      title: titulo("Programas da equipa"),
      description: "Inscrições de organizações e participantes e calendário das FTP de cada programa.",
      privada: true,
    }),
  }),
  component: EquipaProgramasRoute,
});

/** Quem é Admin gere os programas na Gestão; a Equipa IPAV continua a usar esta página. */
function EquipaProgramasRoute() {
  const { isAdmin } = useApp();
  if (isAdmin) return <Navigate to="/admin/programas" replace />;
  return (
    <RouteGate path="/equipa/programas">
      <EquipaProgramasPage />
    </RouteGate>
  );
}

function EquipaProgramasPage() {
  const listFn = useServerFn(listEquipaProgramas);
  const [programId, setProgramId] = useState<string | undefined>();
  const [onlyActive, setOnlyActive] = useState(true);
  const [openEntity, setOpenEntity] = useState<{ cohortId: string; name: string } | null>(
    null,
  );

  const { data, isLoading } = useQuery({
    queryKey: ["equipa-programas"],
    queryFn: () => listFn(),
  });
  const programas = Array.isArray(data) ? data : [];
  const visible = onlyActive ? programas.filter((p) => p.is_active) : programas;
  const selected = programas.find((p) => p.id === programId);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicLink = selected?.public_enroll_token
    ? `${origin}/inscricao-entidade/${selected.public_enroll_token}`
    : null;

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Equipa"
        title="Programas"
        description="Pedidos das organizações e participantes de cada programa."
      />

      <Card className="p-4">
        <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Programa
        </Label>
        {isLoading ? (
          <Skeleton className="h-10 max-w-md" />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={programId ?? ""}
              onValueChange={(v) => {
                setProgramId(v);
                setOpenEntity(null);
              }}
            >
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Selecionar programa…" />
              </SelectTrigger>
              <SelectContent>
                {visible.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title ?? "(sem título)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOnlyActive((v) => !v)}
            >
              {onlyActive ? "Ver todos" : "Ver só ativos"}
            </Button>
            {selected && (
              <EnrollmentToggle programId={selected.id} open={!!selected.enrollment_open} />
            )}
          </div>
        )}

        {publicLink && (
          <div className="mt-3 flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Link orgs
            </span>
            <code className="flex-1 truncate text-[10px]">{publicLink}</code>
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => copy(publicLink)}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        )}
      </Card>

      {!programId ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Seleciona um programa para ver as organizações e participantes.
        </Card>
      ) : openEntity ? (
        <OrganizacaoDetalhe
          programId={programId}
          cohortId={openEntity.cohortId}
          entityName={openEntity.name}
          onBack={() => setOpenEntity(null)}
        />
      ) : (
        <Tabs defaultValue="organizacoes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="organizacoes">
              <Building2 className="mr-2 h-4 w-4" />
              Organizações
            </TabsTrigger>
            <TabsTrigger value="participantes">
              <Users className="mr-2 h-4 w-4" />
              Participantes
            </TabsTrigger>
            <TabsTrigger value="calendario">
              <CalendarDays className="mr-2 h-4 w-4" />
              Calendário FTP
            </TabsTrigger>
          </TabsList>
          <TabsContent value="organizacoes">
            <OrganizacoesTab
              programId={programId}
              onOpenEntity={(cohortId, name) => setOpenEntity({ cohortId, name })}
            />
          </TabsContent>
          <TabsContent value="participantes">
            <ParticipantesEquipa
              programId={programId}
              onOpenEntity={(cohortId, name) => setOpenEntity({ cohortId, name })}
            />
          </TabsContent>
          <TabsContent value="calendario">
            <CalendarioFtpEquipa programId={programId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function OrganizacoesTab({
  programId,
  onOpenEntity,
}: {
  programId: string;
  onOpenEntity: (cohortId: string, name: string) => void;
}) {
  const qc = useQueryClient();
  const fn = useServerFn(listProgramaOrganizacoes);
  const decide = useServerFn(decidirOrganizacaoInscricao);

  const { data, isLoading } = useQuery({
    queryKey: ["equipa-organizacoes", programId],
    queryFn: () => fn({ data: { programId } }),
  });
  const rows = Array.isArray(data) ? data : [];

  const mutation = useMutation({
    mutationFn: (vars: { cohortId: string; decision: "aprovada" | "rejeitada" | "pendente" }) =>
      decide({ data: vars }),
    onSuccess: (_r, vars) => {
      toast.success(
        vars.decision === "aprovada"
          ? "Organização aprovada. O convite foi enviado por email."
          : vars.decision === "pendente"
            ? "Inscrição reposta como pendente."
            : "Inscrição rejeitada.",
      );
      qc.invalidateQueries({ queryKey: ["equipa-organizacoes", programId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Organizações</CardTitle>
            <CardDescription>
              Inscrições submetidas através do link público e organizações já ativas.
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
                <TableHead>Organização</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="w-24">Formandos</TableHead>
                <TableHead className="w-28">Estado</TableHead>
                <TableHead className="w-44 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma organização inscrita neste programa.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow
                  key={r.cohort_id}
                  className="cursor-pointer"
                  onClick={() => onOpenEntity(r.cohort_id, r.entity_name)}
                >
                  <TableCell className="font-medium">
                    {r.entity_name}
                    {r.entity_locality && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {r.entity_locality}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="text-sm">{r.contact_name ?? "—"}</div>
                    <div className="text-xs">{r.contact_email ?? ""}</div>
                  </TableCell>
                  <TableCell>{r.participantes}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "aprovada"
                          ? "default"
                          : r.status === "rejeitada"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap justify-end gap-2">
                      {r.status !== "aprovada" && (
                        <Button
                          size="sm"
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({ cohortId: r.cohort_id, decision: "aprovada" })
                          }
                        >
                          <Check className="mr-1 h-3.5 w-3.5" /> Aprovar
                        </Button>
                      )}
                      {r.status !== "pendente" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({ cohortId: r.cohort_id, decision: "pendente" })
                          }
                        >
                          Repor como pendente
                        </Button>
                      )}
                      {r.status !== "rejeitada" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({ cohortId: r.cohort_id, decision: "rejeitada" })
                          }
                        >
                          <X className="mr-1 h-3.5 w-3.5" /> Rejeitar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpenEntity(r.cohort_id, r.entity_name)}
                      >
                        Ver
                      </Button>
                    </div>
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

