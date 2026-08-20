import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Check, Copy, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  listEquipaProgramas,
  listProgramaOrganizacoes,
  listProgramaParticipantesEquipa,
  decidirOrganizacaoInscricao,
  atualizarEstadoParticipante,
  setProgramaEnrollmentOpenEquipa,
} from "@/lib/equipa-programas.functions";
import { RouteGate } from "@/components/RouteGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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

export const Route = createFileRoute("/equipa/programas")({
  head: () => ({
    meta: [
      { title: "Programas — Equipa | Academia Ubuntu" },
      {
        name: "description",
        content:
          "Gestão de inscrições de organizações e participantes nos programas da Academia Ubuntu.",
      },
      { property: "og:title", content: "Programas — Equipa | Academia Ubuntu" },
      {
        property: "og:description",
        content: "Gestão de inscrições de organizações e participantes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RouteGate path="/equipa/programas">
      <EquipaProgramasPage />
    </RouteGate>
  ),
});

const STATUS_LABEL: Record<string, string> = {
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

function copy(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Link copiado");
}

function EnrollmentToggle({ programId, open }: { programId: string; open: boolean }) {
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Equipa</p>
          <h1 className="text-2xl font-semibold tracking-tight">Programas</h1>
          <p className="text-sm text-muted-foreground">
            Inscrições de organizações e participantes por programa.
          </p>
        </div>
      </div>

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
        <EntityDetail
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
          </TabsList>
          <TabsContent value="organizacoes">
            <OrganizacoesTab
              programId={programId}
              onOpenEntity={(cohortId, name) => setOpenEntity({ cohortId, name })}
            />
          </TabsContent>
          <TabsContent value="participantes">
            <ParticipantesTab
              programId={programId}
              onOpenEntity={(cohortId, name) => setOpenEntity({ cohortId, name })}
            />
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
    mutationFn: (vars: { cohortId: string; decision: "aprovada" | "rejeitada" }) =>
      decide({ data: vars }),
    onSuccess: (_r, vars) => {
      toast.success(
        vars.decision === "aprovada"
          ? "Organização aprovada — convite enviado por email."
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
                    {r.status === "pendente" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({
                              cohortId: r.cohort_id,
                              decision: "aprovada",
                            })
                          }
                        >
                          <Check className="mr-1 h-3.5 w-3.5" /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({
                              cohortId: r.cohort_id,
                              decision: "rejeitada",
                            })
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpenEntity(r.cohort_id, r.entity_name)}
                      >
                        Ver
                      </Button>
                    )}
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

function ParticipantesTab({
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

function EntityDetail({
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

      <ParticipantesTab programId={programId} cohortId={cohortId} />
    </div>
  );
}
