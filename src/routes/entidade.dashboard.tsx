import { useEffect, useMemo, useState } from "react";
import { useUserBadgeClusterSlugs } from "@/hooks/use-badge-access";
import { PageHeader, PageShell, Section } from "@/components/shell/PageHeader";
import { StatusChip } from "@/components/shell/StatusChip";
import { FormField } from "@/components/shell/FormField";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Building2, CalendarPlus, Copy, Lock, Pencil, ShieldAlert, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EntityOnboardingFlow } from "@/components/EntityOnboardingFlow";

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
  transferEntityOwnershipDirect,
  updateMyEntidade,
} from "@/lib/entidade.functions";
import { supabase } from "@/integrations/supabase/client";

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
  const { data: entidade, isLoading: entidadeLoading, isFetched: entidadeFetched } = useQuery({
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
          Esta área é só para quem representa uma organização parceira.
        </p>
      </Card>
    );
  }

  // Onboarding: utilizador Entidade sem entidade associada
  const needsOnboarding =
    !isAdmin && entidadeFetched && !entidadeLoading && !entidade;
  if (needsOnboarding) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <ComponentAccessMatrix pagePath="/entidade/dashboard" />
        <EntityOnboardingFlow />
      </div>
    );
  }

  const isPending =
    !!entidade?.status && entidade.status.toLowerCase() === "pendente";

  return (
    <PageShell>
      <ComponentAccessMatrix pagePath="/entidade/dashboard" />

      <Dialog open={dataDialogOpen} onOpenChange={setDataDialogOpen}>
        {visible("header") && (
          <PageHeader
            eyebrow="A minha organização"
            title={entidade?.name ?? "A minha organização"}
            chips={
              entidade?.status ? (
                <StatusChip tone={isPending ? "yellow" : "green"}>
                  {isPending ? "À espera de aprovação" : "Aprovada"}
                </StatusChip>
              ) : undefined
            }
            description="Os programas em que a organização participa, quem está inscrito e as ações marcadas."
            actions={
              <>
                {visible("tab-data") && (
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Pencil className="mr-1.5 h-4 w-4" />
                      Dados da organização
                    </Button>
                  </DialogTrigger>
                )}
                <Button asChild>
                  <Link to="/inscricao-programas">
                    <CalendarPlus className="mr-1.5 h-4 w-4" />
                    Inscrever em programas
                  </Link>
                </Button>
              </>
            }
          />
        )}

        {isPending && (
          <div className="flex gap-3 rounded-xl bg-[#FFF1CC] p-4 text-sm text-[#6B4200]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              <strong className="font-semibold">O registo está à espera de aprovação.</strong> A equipa
              da Academia vai rever o pedido. Até lá, algumas funcionalidades podem estar limitadas.
            </p>
          </div>
        )}

        {isAdmin && (
          <div className="rounded-xl border bg-card p-4">
            <Label htmlFor="admin-entidade" className="mb-1.5 block text-[13px] font-medium text-secondary">
              Ver a página de outra organização
            </Label>
            <Select value={selectedEntityId ?? ""} onValueChange={(v) => setSelectedEntityId(v)}>
              <SelectTrigger id="admin-entidade" className="max-w-md">
                <SelectValue placeholder="Escolher organização" />
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
                Não foi possível carregar as organizações ({(entidadesError as Error).message}).
              </p>
            )}
          </div>
        )}

        <ProgramsMasterTable
          cohorts={cohorts}
          isLoading={cohortsLoading}
          selectedProgramId={selectedProgramId}
          onSelect={setSelectedProgramId}
        />

        {cohorts.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="filtro-programa" className="text-[13px] font-medium text-secondary">
              Mostrar
            </Label>
            <Select
              value={selectedProgramId ?? "__todos"}
              onValueChange={(v) => setSelectedProgramId(v === "__todos" ? undefined : v)}
            >
              <SelectTrigger id="filtro-programa" className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos">Todos os programas</SelectItem>
                {cohorts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.programas?.title ?? "Programa"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {visible("tab-overview") && visible("trainees-table") && (
          <TraineesTable entityId={selectedEntityId} programTitle={selectedProgramTitle} />
        )}
        {visible("tab-acoes") && <AcoesTab entityId={selectedEntityId} programTitle={selectedProgramTitle} />}

        <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dados da organização</DialogTitle>
            <DialogDescription>
              Mantém o nome, a morada e a pessoa de contacto atualizados.
            </DialogDescription>
          </DialogHeader>
          <EntityDataForm entityId={selectedEntityId} />
        </DialogContent>
      </Dialog>
    </PageShell>
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
    <section className="space-y-3" aria-labelledby="programas-t">
      <h2 id="programas-t" className="text-base font-semibold text-secondary">
        Programas
      </h2>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : cohorts.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          Ainda não há programas associados a esta organização.
        </p>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
          {cohorts.map((c) => {
            const isSelected = c.id === selectedProgramId;
            const url = `${origin}/inscricao/${c.invite_token ?? ""}`;
            return (
              <article
                key={c.id}
                className={`flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-5 ${isSelected ? "border-primary" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 break-words text-[15px] font-semibold text-secondary">
                    {c.programas?.title ?? "Programa"}
                  </h3>
                  <StatusChip tone={c.is_active ? "green" : "grey"}>{c.is_active ? "Ativo" : "Inativo"}</StatusChip>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-secondary">Link de inscrição para participantes</p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={c.invite_token ? url : "Sem link"}
                      aria-label={`Link de inscrição de ${c.programas?.title ?? "programa"}`}
                      className="h-9 bg-muted/40 font-mono text-xs text-muted-foreground"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 shrink-0"
                      aria-label="Copiar link de inscrição"
                      disabled={!c.invite_token}
                      onClick={(e) => copy(e, url)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className="mt-auto self-start text-sm font-medium text-secondary underline-offset-4 hover:text-primary hover:underline"
                >
                  {isSelected ? "A mostrar este programa" : "Mostrar só este programa"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}


function TraineesTable({ entityId, programTitle }: { entityId?: string; programTitle?: string | null }) {
  const fetchFn = useServerFn(listMyTrainees);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-trainees", entityId ?? "self"],
    queryFn: () => fetchFn(entityId ? { data: { entityId } } : (undefined as never)),
    retry: false,
  });

  const allTrainees = Array.isArray(data) ? data : [];
  const trainees = programTitle
    ? allTrainees.filter((t) => t.program_title === programTitle)
    : allTrainees;

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
            <CardTitle className="text-base text-secondary">Participantes</CardTitle>
            <CardDescription>Quem se inscreveu através dos links da organização.</CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {trainees.length} {trainees.length === 1 ? "inscrito" : "inscritos"}
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
                <TableHead>Estado</TableHead>
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
                    Ainda não há participantes inscritos.
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
  const transferFn = useServerFn(transferEntityOwnershipDirect);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-entidade", entityId ?? "self"],
    queryFn: () => fetchFn(entityId ? { data: { entityId } } : (undefined as never)),
  });

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [locality, setLocality] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [newOwnerEmail, setNewOwnerEmail] = useState("");

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
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
          contact_name: data?.contact_name ?? null,
          contact_email: data?.contact_email ?? null,
          contact_phone: data?.contact_phone ?? null,
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

  const transferMutation = useMutation({
    mutationFn: () => transferFn({ data: { newOwnerEmail } }),
    onSuccess: async () => {
      toast.success("Contacto transferido. Vai sair desta conta…");
      // O utilizador atual perdeu a role de Entidade — terminar sessão e recarregar.
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      setTimeout(() => {
        window.location.replace("/");
      }, 800);
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
        A tua conta ainda não está ligada a nenhuma organização. Fala com a equipa da Academia.
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-secondary">Dados da organização</CardTitle>
        <CardDescription>
          Mantém o nome e a morada da organização atualizados.
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
            <Label htmlFor="entity-name">Nome da organização</Label>
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
            <Label htmlFor="postal-code">Código postal</Label>
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
                Estes dados refletem a pessoa responsável pela ligação com a Academia.
                Para os alterar, transfira o contacto para outro utilizador.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pessoa de contacto</Label>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              {data.contact_name || "—"}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              {data.contact_email || "—"}
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Telemóvel</Label>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              {data.contact_phone || "—"}
            </div>
          </div>

          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2">
            <AlertDialog open={transferOpen} onOpenChange={setTransferOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline">
                  Trocar pessoa de contacto
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Transferir contacto da entidade</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2 text-sm">
                      <p>
                        Ao confirmar, a pessoa indicada passa a ser o novo responsável
                        desta organização. <strong>Você perde imediatamente o acesso</strong>{" "}
                        à área da entidade e a sessão será terminada.
                      </p>
                      <p>
                        Esta ação <strong>não requer aprovação</strong> e é imediata.
                        Indique o email do novo responsável (tem de já ter conta na
                        plataforma).
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-2">
                  <Label htmlFor="new-owner-email">Email do novo responsável</Label>
                  <Input
                    id="new-owner-email"
                    type="email"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    placeholder="responsavel@exemplo.pt"
                    autoComplete="off"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={transferMutation.isPending}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      if (!newOwnerEmail.trim()) {
                        toast.error("Indique o email do novo responsável.");
                        return;
                      }
                      transferMutation.mutate();
                    }}
                    disabled={transferMutation.isPending}
                  >
                    {transferMutation.isPending
                      ? "A transferir…"
                      : "Confirmar e sair"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

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

function AcoesTab({ entityId, programTitle }: { entityId?: string; programTitle?: string | null }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyAcoes);
  const createFn = useServerFn(createAcaoProposta);
  const cancelFn = useServerFn(cancelAcaoProposta);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-acoes", entityId ?? "self"],
    queryFn: () => listFn(entityId ? { data: { entityId } } : (undefined as never)),
    retry: false,
  });
  const allAcoes = Array.isArray(data) ? data : [];

  // Match this program to a known action type (loose: contains, case/accents-insensitive)
  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const programActionType = useMemo(() => {
    if (!programTitle) return null;
    const np = normalize(programTitle);
    return ACTION_TYPES.find((t) => np.includes(normalize(t))) ?? null;
  }, [programTitle]);

  const acoes = programActionType
    ? allAcoes.filter((a) => a.action_type === programActionType)
    : allAcoes;

  const [open, setOpen] = useState(false);
  const [actionType, setActionType] = useState<string>(programActionType ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tentou, setTentou] = useState(false);

  useEffect(() => {
    if (programActionType) setActionType(programActionType);
  }, [programActionType]);

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
      toast.success("Proposta enviada. A equipa da Academia vai confirmar.");
      setOpen(false);
      setTentou(false);
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
            <CardTitle className="text-base text-secondary">Ações</CardTitle>
            <CardDescription>
              As ações marcadas para a organização. Propõe uma nova e a equipa da Academia confirma.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <CalendarPlus className="mr-1.5 h-4 w-4" />
                Propor nova ação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Propor nova ação</DialogTitle>
                <DialogDescription>
                  Escolhe o tipo de ação e as datas. A equipa da Academia confirma a marcação.
                </DialogDescription>
              </DialogHeader>
              <form
                id="new-acao-form"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  setTentou(true);
                  if (!actionType || !startDate || !endDate || endDate < startDate) return;
                  createMut.mutate();
                }}
                className="grid gap-5"
              >
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-[13px] font-medium text-secondary">
                    Tipo de ação <span className="text-[#B42318]" aria-hidden="true">*</span>
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ACTION_TYPES.map((t) => {
                      const locked = !allowedActionTypes.has(t);
                      const fixo = !!programActionType && programActionType !== t;
                      const desativado = locked || fixo;
                      const escolhido = actionType === t;
                      return (
                        <label
                          key={t}
                          className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm ${
                            desativado
                              ? "cursor-not-allowed bg-muted/40 text-muted-foreground"
                              : escolhido
                                ? "cursor-pointer border-primary bg-primary/5"
                                : "cursor-pointer bg-card hover:border-secondary/40"
                          }`}
                        >
                          <input
                            type="radio"
                            name="tipo-acao"
                            className="mt-0.5 accent-[var(--primary)]"
                            checked={escolhido}
                            disabled={desativado}
                            onChange={() => setActionType(t)}
                          />
                          <span className="min-w-0">
                            <span className="block font-medium">{t}</span>
                            {locked && (
                              <span className="mt-0.5 flex items-start gap-1 text-xs">
                                <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                                Precisa de um badge que ainda não tens
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {tentou && !actionType && (
                    <p role="alert" className="text-xs font-medium text-[#B42318]">
                      Escolhe o tipo de ação.
                    </p>
                  )}
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    id="start-date"
                    label="Início"
                    required
                    error={tentou && !startDate ? "Escolhe a data de início." : null}
                  >
                    <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </FormField>
                  <FormField
                    id="end-date"
                    label="Fim"
                    required
                    error={
                      tentou && !endDate
                        ? "Escolhe a data de fim."
                        : startDate && endDate && endDate < startDate
                          ? "O fim tem de ser no mesmo dia ou depois do início."
                          : null
                    }
                  >
                    <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </FormField>
                </div>
              </form>
              <DialogFooter className="gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" form="new-acao-form" disabled={createMut.isPending}>
                  {createMut.isPending ? "A enviar…" : "Enviar proposta"}
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
                    Ainda não há ações marcadas.
                  </TableCell>
                </TableRow>
              )}
              {acoes.map((a) => {
                const days = daysUntil(a.start_date);
                const isCancelled = (a.status ?? "").toLowerCase().startsWith("cancel");
                const canCancel = !isCancelled && days !== null && days >= 14;
                const reason = isCancelled
                  ? "Esta marcação já foi cancelada."
                  : "Faltam menos de 14 dias. Para cancelar, contacta a equipa central.";
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
                                <AlertDialogTitle>Cancelar esta ação?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O estado passa a Cancelada. Depois disso, só a equipa central pode voltar atrás.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Voltar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => cancelMut.mutate(a.id)}
                                >
                                  Cancelar ação
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

