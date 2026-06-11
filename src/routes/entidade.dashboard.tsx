import { useEffect, useMemo, useState } from "react";
import { useUserBadgeClusterSlugs } from "@/hooks/use-badge-access";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, CalendarPlus, Copy, Link2, Pencil, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cancelAcaoProposta,
  createAcaoProposta,
  getMyEntidade,
  listAllEntidades,
  listMyAcoes,
  listMyCohorts,
  listMyTrainees,
  updateMyEntidade,
} from "@/lib/entidade.functions";
import { listMyEntityProgramEnrollments } from "@/lib/inscricao-entidade.functions";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApp } from "@/lib/app-context";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";


export const Route = createFileRoute("/entidade/dashboard")({
  head: () => ({ meta: [{ title: "Página da Organização — Academia Ubuntu" }] }),
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
  const [selectedProgramId, setSelectedProgramId] = useState<string | undefined>(
    undefined,
  );
  const [dataDialogOpen, setDataDialogOpen] = useState(false);

  useEffect(() => {
    if (isAdmin && !selectedEntityId && entidades.length > 0) {
      setSelectedEntityId(entidades[0].id);
    }
  }, [isAdmin, entidades, selectedEntityId]);

  // Reset program selection when entity changes
  useEffect(() => {
    setSelectedProgramId(undefined);
  }, [selectedEntityId]);

  const fetchEntidade = useServerFn(getMyEntidade);
  const { data: entidade } = useQuery({
    queryKey: ["my-entidade", selectedEntityId ?? "self"],
    queryFn: () =>
      fetchEntidade(selectedEntityId ? { data: { entityId: selectedEntityId } } : undefined as never),
    enabled: hasAccess && (!isAdmin || !!selectedEntityId),
  });

  const fetchCohorts = useServerFn(listMyCohorts);
  const { data: cohortsRaw, isLoading: cohortsLoading } = useQuery({
    queryKey: ["my-cohorts", selectedEntityId ?? "self"],
    queryFn: () => fetchCohorts(selectedEntityId ? { data: { entityId: selectedEntityId } } : (undefined as never)),
    enabled: hasAccess && (!isAdmin || !!selectedEntityId),
    retry: false,
  });
  const cohorts = (Array.isArray(cohortsRaw) ? cohortsRaw : []) as CohortRow[];

  useEffect(() => {
    if (!selectedProgramId && cohorts.length === 1) {
      setSelectedProgramId(cohorts[0].id);
    }
  }, [cohorts, selectedProgramId]);

  const selectedCohort = cohorts.find((c) => c.id === selectedProgramId);
  const selectedProgramTitle = selectedCohort?.programas?.title ?? null;

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
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Bem-vindo{entidade?.name ? `, ${entidade.name}` : ""}
          </h1>
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
          {entidadesError && (
            <p className="mt-2 text-xs text-destructive">
              Não foi possível carregar entidades. Verifica que tens sessão iniciada
              ({(entidadesError as Error).message}).
            </p>
          )}
        </Card>
      )}

      <Dialog open={dataDialogOpen} onOpenChange={setDataDialogOpen}>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to="/inscricao-programas">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Inscrever em Programas
            </Link>
          </Button>
          {visible("tab-data") && (
            <DialogTrigger asChild>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Editar Dados da Organização
              </Button>
            </DialogTrigger>
          )}
        </div>

        <ProgramEnrollmentsCard entityId={selectedEntityId} />

        <ProgramsMasterTable
          cohorts={cohorts}
          isLoading={cohortsLoading}
          selectedProgramId={selectedProgramId}
          onSelect={setSelectedProgramId}
        />

        {selectedProgramId ? (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              {visible("tab-overview") && <TabsTrigger value="overview">Visão Geral</TabsTrigger>}
              {visible("tab-acoes") && <TabsTrigger value="acoes">Marcações</TabsTrigger>}
            </TabsList>

            {visible("tab-overview") && (
              <TabsContent value="overview" className="space-y-6">
                {visible("trainees-table") && (
                  <TraineesTable
                    entityId={selectedEntityId}
                    programTitle={selectedProgramTitle}
                  />
                )}
              </TabsContent>
            )}

            {visible("tab-acoes") && (
              <TabsContent value="acoes">
                <AcoesTab
                  entityId={selectedEntityId}
                  programTitle={selectedProgramTitle}
                />
              </TabsContent>
            )}
          </Tabs>
        ) : (
          !cohortsLoading && cohorts.length > 1 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Selecione um programa na tabela acima para gerir os formandos e marcações correspondentes.
            </Card>
          )
        )}

        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Dados da Organização</DialogTitle>
            <DialogDescription>
              Mantenha o nome da entidade, morada e ponto de contacto atualizados.
            </DialogDescription>
          </DialogHeader>
          <EntityDataForm entityId={selectedEntityId} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

type CohortRow = {
  id: string;
  invite_token: string | null;
  is_active: boolean | null;
  program_id: string | null;
  programas: { title: string | null } | null;
};

function ProgramsMasterTable({
  cohorts,
  isLoading,
  selectedProgramId,
  onSelect,
}: {
  cohorts: CohortRow[];
  isLoading: boolean;
  selectedProgramId?: string;
  onSelect: (id: string) => void;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const copy = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Os Meus Programas</CardTitle>
        <CardDescription>
          Selecione um programa para gerir os respetivos formandos e marcações.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Programa</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Link de Inscrição</TableHead>
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
              {!isLoading && cohorts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Ainda não há programas associados a esta entidade.
                  </TableCell>
                </TableRow>
              )}
              {cohorts.map((c) => {
                const isSelected = c.id === selectedProgramId;
                const url = `${origin}/inscricao/${c.invite_token ?? ""}`;
                return (
                  <TableRow
                    key={c.id}
                    onClick={() => onSelect(c.id)}
                    className={`cursor-pointer ${isSelected ? "bg-primary/[0.06] border-l-4 border-primary" : ""}`}
                  >
                    <TableCell className="font-medium">
                      {c.programas?.title ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? "default" : "outline"}>
                        {c.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!c.invite_token}
                        onClick={(e) => copy(e, url)}
                      >
                        <Copy className="mr-1.5 h-3 w-3" />
                        Copiar Link
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}


function TraineesTable({ entityId }: { entityId?: string }) {
  const fetchFn = useServerFn(listMyTrainees);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-trainees", entityId ?? "self"],
    queryFn: () => fetchFn(entityId ? { data: { entityId } } : (undefined as never)),
    retry: false,
  });

  const trainees = Array.isArray(data) ? data : [];

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

// ============== Tab: Marcações (ações propostas pela Entidade) ==============

const ACTION_TYPES = [
  "Semana Ubuntu",
  "Fórum",
  "Clube Ubuntu",
  "Formação Teórico-Conceptual",
  "Formação Teórico-Prática",
  "Sessão Final",
] as const;

function daysUntil(dateISO: string | null): number | null {
  if (!dateISO) return null;
  const start = new Date(dateISO + "T00:00:00").getTime();
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = new Date(todayStr + "T00:00:00").getTime();
  return Math.floor((start - today) / (1000 * 60 * 60 * 24));
}

function statusBadge(status: string | null) {
  const s = (status ?? "Pendente").toLowerCase();
  if (s === "confirmada" || s === "confirmado")
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Confirmada</Badge>;
  if (s === "cancelada" || s === "cancelado")
    return <Badge variant="destructive">Cancelada</Badge>;
  return (
    <Badge className="bg-amber-500 text-white hover:bg-amber-500">
      {status ?? "Pendente"}
    </Badge>
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function AcoesTab({ entityId }: { entityId?: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyAcoes);
  const createFn = useServerFn(createAcaoProposta);
  const cancelFn = useServerFn(cancelAcaoProposta);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-acoes", entityId ?? "self"],
    queryFn: () => listFn(entityId ? { data: { entityId } } : (undefined as never)),
    retry: false,
  });
  const acoes = Array.isArray(data) ? data : [];

  const [open, setOpen] = useState(false);
  const [actionType, setActionType] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const userBadgeClusters = useUserBadgeClusterSlugs();
  const allowedActionTypes = useMemo(() => {
    // An action type is unlocked if the user has a badge whose cluster slug
    // matches a token in the action type label, OR if no badge restricts it.
    const set = new Set<string>();
    for (const t of ACTION_TYPES) {
      const tSlug = t
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-");
      const matches = Array.from(userBadgeClusters).some(
        (c: string) => tSlug.includes(c) || c.includes(tSlug),
      );
      if (matches || userBadgeClusters.size === 0) set.add(t);
    }
    return set;
  }, [userBadgeClusters]);

  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          ...(entityId ? { entityId } : {}),
          action_type: actionType,
          start_date: startDate,
          end_date: endDate,
        },
      }),
    onSuccess: () => {
      toast.success("Marcação criada (aguarda confirmação).");
      setOpen(false);
      setActionType("");
      setStartDate("");
      setEndDate("");
      qc.invalidateQueries({ queryKey: ["my-acoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: (actionId: string) => cancelFn({ data: { actionId } }),
    onSuccess: () => {
      toast.success("Marcação cancelada.");
      qc.invalidateQueries({ queryKey: ["my-acoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Marcações</CardTitle>
            <CardDescription>
              Proponha novas ações para a sua entidade. Aguardam confirmação da Academia.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Nova marcação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova marcação</DialogTitle>
                <DialogDescription>
                  Indique o tipo de ação e o período pretendido.
                </DialogDescription>
              </DialogHeader>
              <form
                id="new-acao-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!actionType) return toast.error("Escolha o tipo de ação.");
                  if (!startDate || !endDate) return toast.error("Defina as datas.");
                  if (endDate < startDate)
                    return toast.error("Data fim deve ser posterior à data início.");
                  createMut.mutate();
                }}
                className="grid gap-4"
              >
                <div className="space-y-2">
                  <Label>Tipo de ação</Label>
                  <Select value={actionType} onValueChange={setActionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar…" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((t) => {
                        const locked = !allowedActionTypes.has(t);
                        return (
                          <SelectItem key={t} value={t} disabled={locked}>
                            {t}{locked ? " — 🔒 requer badge" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Data início</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">Data fim</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </form>
              <DialogFooter>
                <Button
                  type="submit"
                  form="new-acao-form"
                  disabled={createMut.isPending}
                >
                  {createMut.isPending ? "A criar…" : "Criar marcação"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                <TableHead>Tipo</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
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
              {!isLoading && acoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Ainda não há marcações.
                  </TableCell>
                </TableRow>
              )}
              {acoes.map((a) => {
                const days = daysUntil(a.start_date);
                const isCancelled = (a.status ?? "").toLowerCase().startsWith("cancel");
                const canCancel = !isCancelled && days !== null && days >= 14;
                const reason = isCancelled
                  ? "Esta marcação já foi cancelada."
                  : "Cancelamento não permitido com menos de 14 dias de antecedência. Por favor, contacte-nos diretamente.";
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.action_type ?? a.title ?? "—"}
                    </TableCell>
                    <TableCell>{formatDate(a.start_date)}</TableCell>
                    <TableCell>{formatDate(a.end_date)}</TableCell>
                    <TableCell>{statusBadge(a.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="default" size="sm">
                          <Link to="/entidade/acoes/$id" params={{ id: a.id }}>
                            Abrir
                          </Link>
                        </Button>
                        {canCancel ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Cancelar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancelar marcação?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser revertida. A marcação ficará
                                  marcada como cancelada.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Voltar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => cancelMut.mutate(a.id)}
                                >
                                  Confirmar cancelamento
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-block">
                                  <Button variant="outline" size="sm" disabled>
                                    Cancelar
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                {reason}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgramEnrollmentsCard({ entityId }: { entityId?: string }) {
  const fetchFn = useServerFn(listMyEntityProgramEnrollments);
  const { data, isLoading } = useQuery({
    queryKey: ["my-entity-program-enrollments", entityId ?? "self"],
    queryFn: () => fetchFn(entityId ? { data: { entityId } } : (undefined as never)),
    retry: false,
  });
  const rows = Array.isArray(data) ? data : [];

  const cohortsFn = useServerFn(listMyCohorts);
  const { data: cohortsRaw } = useQuery({
    queryKey: ["my-cohorts", entityId ?? "self"],
    queryFn: () => cohortsFn(entityId ? { data: { entityId } } : (undefined as never)),
    retry: false,
  });
  const cohorts = Array.isArray(cohortsRaw) ? cohortsRaw : [];
  const tokenByProgram = new Map(
    cohorts.map((c) => [c.program_id, c.invite_token ?? ""]),
  );

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
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardContent className="flex flex-col gap-3 py-4 px-5">
        <div className="flex items-center gap-2 text-base font-semibold">
          <CalendarPlus className="h-5 w-5 text-primary" />
          <span>Inscrições em Programas</span>
        </div>

        {isLoading ? (
          <Skeleton className="h-8 w-40" />
        ) : rows.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            Ainda não submeteste nenhuma inscrição.
          </span>
        ) : (
          rows.map((r) => {
            const token = tokenByProgram.get((r as any).program_id);
            const url = token ? `${origin}/inscricao/${token}` : "";
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{r.program_title}</span>
                <Badge
                  variant={r.status === "pendente" ? "secondary" : "default"}
                  className="text-xs px-2 py-0.5"
                >
                  {r.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString("pt-PT") : "—"}
                </span>
                {url && (
                  <Button size="sm" variant="outline" onClick={() => copy(url)}>
                    <Copy className="mr-1.5 h-3 w-3" />
                    Copiar link
                  </Button>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

