import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  CalendarCheck2,
  Camera,
  ExternalLink,
  FileText,
  GraduationCap,
  Info,
  LinkIcon,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Shirt,
  Sparkles,
  Stamp,
  Trash2,
  Upload,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  getEntidadeActionDetails,
  addParticipante,
  bulkAddParticipantes,
  updateParticipante,
  removeParticipante,
  cancelAcaoProposta,
  generateCertificate,
  generateAllCertificates,
  type UpdateParticipanteInput,
} from "@/lib/entidade.functions";

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
type TShirtSize = (typeof TSHIRT_SIZES)[number];

export const Route = createFileRoute("/entidade/acoes/$id")({
  head: () => ({ meta: [{ title: "Detalhe da Ação — Entidade" }] }),
  component: EntidadeAcaoDetailPage,
});

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const start = new Date(dateStr + "T00:00:00Z").getTime();
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  return Math.floor((start - today) / (1000 * 60 * 60 * 24));
}

function EntidadeAcaoDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchDetails = useServerFn(getEntidadeActionDetails);
  const cancelFn = useServerFn(cancelAcaoProposta);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["entidade-action", id],
    queryFn: () => fetchDetails({ data: { actionId: id } }),
    retry: false,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["entidade-action", id] });

  const cancelMut = useMutation({
    mutationFn: () => cancelFn({ data: { actionId: id } }),
    onSuccess: () => {
      toast.success("Ação cancelada.");
      invalidate();
      qc.invalidateQueries({ queryKey: ["my-acoes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (isLoading) return <Skeleton className="mx-auto h-64 w-full max-w-6xl" />;
  if (isError || !data?.action) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <p className="font-medium">Ação não encontrada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Sem acesso a esta ação."}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/entidade/dashboard">Voltar</Link>
        </Button>
      </Card>
    );
  }

  const a = data.action;
  const days = daysUntil(a.start_date);
  const canCancel = a.status !== "Cancelada" && (days === null || days >= 14);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/entidade/dashboard">
          <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
        </Link>
      </Button>

      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {a.action_type ?? "Ação"}
            </p>
            <h1 className="text-2xl font-semibold leading-tight">
              {a.title ?? "Ação"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              a.status === "Confirmada"
                ? "default"
                : a.status === "Cancelada"
                  ? "destructive"
                  : "secondary"
            }
            className="text-xs"
          >
            {a.status}
          </Badge>
          <TooltipProvider>
            {canCancel ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <XCircle className="mr-1 h-4 w-4" /> Cancelar ação
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar esta ação?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta operação altera o estado para Cancelada e não pode
                      ser revertida pela entidade.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => cancelMut.mutate()}
                      disabled={cancelMut.isPending}
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button variant="outline" size="sm" disabled>
                      <XCircle className="mr-1 h-4 w-4" /> Cancelar ação
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-center">
                  Cancelamento não permitido com menos de 14 dias de
                  antecedência. Por favor, contacte-nos diretamente.
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>

      {/* Bloco Superior: Informações + Logística */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-5 w-5 text-primary" /> Informações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow
              icon={<CalendarDays className="h-4 w-4" />}
              label="Data de Início"
              value={formatDate(a.start_date)}
            />
            <InfoRow
              icon={<CalendarCheck2 className="h-4 w-4" />}
              label="Data de Fim"
              value={formatDate(a.end_date)}
            />
            <InfoRow
              icon={<User className="h-4 w-4" />}
              label="Criado por"
              value={data.createdByName ?? "—"}
            />
            <InfoRow
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Entidade"
              value={data.entityName ?? "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LinkIcon className="h-5 w-5 text-primary" /> Logística
            </CardTitle>
            <CardDescription>
              Links partilhados pela equipa central.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <LogisticaLink
              href={a.tshirt_tracking_link}
              icon={<Shirt className="h-4 w-4" />}
              label="Tracking de T-shirts"
            />
            <LogisticaLink
              href={a.fotos_link}
              icon={<Camera className="h-4 w-4" />}
              label="Fotografias"
            />
            <LogisticaLink
              href={a.avaliacao_satisfacao_link}
              icon={<FileText className="h-4 w-4" />}
              label="Avaliação de Satisfação"
            />
            <LogisticaLink
              href={a.avaliacao_impacto_link}
              icon={<FileText className="h-4 w-4" />}
              label="Avaliação de Impacto"
            />
            {!a.tshirt_tracking_link &&
              !a.fotos_link &&
              !a.avaliacao_satisfacao_link &&
              !a.avaliacao_impacto_link && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Sem links disponíveis. Serão adicionados pela equipa central.
                </p>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Bloco do Meio: Participantes */}
      <ParticipantesSection
        actionId={id}
        rows={data.participantes}
        onChanged={invalidate}
      />

      {/* Bloco Inferior: Formadores */}
      <TrainersSection trainers={data.trainers} />
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2 last:border-none last:pb-0">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon} {label}
      </span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function LogisticaLink({
  href,
  icon,
  label,
}: {
  href: string | null | undefined;
  icon: React.ReactNode;
  label: string;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm transition hover:bg-accent"
    >
      <span className="flex items-center gap-2 font-medium">
        {icon} {label}
      </span>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}

function TrainersSection({
  trainers,
}: {
  trainers: Awaited<ReturnType<typeof getEntidadeActionDetails>>["trainers"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-5 w-5 text-primary" /> Formadores
          <Badge variant="secondary" className="ml-1">
            {trainers.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Formadores que vão facilitar esta ação.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {trainers.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            Ainda sem formadores atribuídos. A equipa central irá designá-los.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.email ? (
                      <a
                        href={`mailto:${t.email}`}
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5" /> {t.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        t.status === "Confirmado"
                          ? "default"
                          : t.status === "Cancelado"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {t.status}
                    </Badge>
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

type ParticipanteRow = Awaited<
  ReturnType<typeof getEntidadeActionDetails>
>["participantes"][number];

function ParticipantesSection({
  actionId,
  rows,
  onChanged,
}: {
  actionId: string;
  rows: ParticipanteRow[];
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const addFn = useServerFn(addParticipante);
  const bulkFn = useServerFn(bulkAddParticipantes);
  const updateFn = useServerFn(updateParticipante);
  const removeFn = useServerFn(removeParticipante);
  const genFn = useServerFn(generateCertificate);
  const genAllFn = useServerFn(generateAllCertificates);
  const [pendingCertId, setPendingCertId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const queryKey = ["entidade-action", actionId];

  const addMut = useMutation({
    mutationFn: (vars: { first_name: string; last_name: string; tshirt_size: TShirtSize }) =>
      addFn({ data: { actionId, ...vars } }),
    onSuccess: () => {
      toast.success("Participante adicionado.");
      setOpen(false);
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const bulkMut = useMutation({
    mutationFn: (vars: {
      participantes: { first_name: string; last_name: string }[];
      default_tshirt_size: TShirtSize;
    }) => bulkFn({ data: { actionId, ...vars } }),
    onSuccess: (res) => {
      toast.success(`${res.count} participantes adicionados.`);
      setBulkOpen(false);
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  // Optimistic update for inline edits
  const updateMut = useMutation({
    mutationFn: (vars: UpdateParticipanteInput) => updateFn({ data: vars }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<any>(queryKey);
      if (prev) {
        qc.setQueryData(queryKey, {
          ...prev,
          participantes: prev.participantes.map((p: ParticipanteRow) =>
            p.id === vars.participanteId ? { ...p, ...vars.fields } : p,
          ),
        });
      }
      return { prev };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error(e instanceof Error ? e.message : "Erro");
    },
    onSettled: () => onChanged(),
  });

  const removeMut = useMutation({
    mutationFn: (participanteId: string) =>
      removeFn({ data: { participanteId } }),
    onSuccess: () => {
      toast.success("Participante removido.");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const generateMut = useMutation({
    mutationFn: (participanteId: string) =>
      genFn({ data: { participanteId } }),
    onMutate: (id) => setPendingCertId(id),
    onSuccess: () => {
      toast.success("Certificado gerado.");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
    onSettled: () => setPendingCertId(null),
  });

  const generateAllMut = useMutation({
    mutationFn: () => genAllFn({ data: { actionId, onlyMissing: true } }),
    onSuccess: (res) => {
      if (res.failed > 0) {
        toast.warning(`${res.generated} gerado(s), ${res.failed} falharam.`);
      } else if (res.generated === 0) {
        toast.info("Não há novos certificados para gerar.");
      } else {
        toast.success(`${res.generated} certificados gerados.`);
      }
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" /> Participantes (Alunos)
            <Badge variant="secondary" className="ml-1">
              {rows.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Lista de alunos da escola. Sem conta na plataforma.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateAllMut.mutate()}
            disabled={generateAllMut.isPending || rows.length === 0}
          >
            {generateAllMut.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Stamp className="mr-1 h-4 w-4" />
            )}
            Gerar certificados
          </Button>
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Upload className="mr-1 h-4 w-4" /> Importar em massa
              </Button>
            </DialogTrigger>
            <BulkImportDialog
              onSubmit={(v) => bulkMut.mutate(v)}
              isPending={bulkMut.isPending}
            />
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Adicionar
              </Button>
            </DialogTrigger>
            <AddParticipanteDialog
              onSubmit={(v) => addMut.mutate(v)}
              isPending={addMut.isPending}
            />
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            Ainda sem participantes. Adicione os alunos que vão participar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-[110px]">T-shirt</TableHead>
                <TableHead className="w-[90px]">Presença</TableHead>
                <TableHead className="w-[140px]">Certificado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.first_name} {p.last_name}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={p.tshirt_size}
                      onValueChange={(v) =>
                        updateMut.mutate({
                          participanteId: p.id,
                          fields: { tshirt_size: v as TShirtSize },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-[88px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TSHIRT_SIZES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.attendance_confirmed}
                      onCheckedChange={(v) =>
                        updateMut.mutate({
                          participanteId: p.id,
                          fields: { attendance_confirmed: v },
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {p.certificate_url ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => {
                            const raw = `/api/certificates/${actionId}/${p.id}`;
                            const absolute = new URL(
                              raw,
                              window.location.origin,
                            ).toString();
                            const secureUrl = absolute.startsWith("http://")
                              ? absolute.replace(/^http:\/\//, "https://")
                              : absolute;
                            window.open(
                              secureUrl,
                              "_blank",
                              "noopener,noreferrer",
                            );
                          }}
                        >
                          <FileText className="mr-1 h-3.5 w-3.5" /> PDF
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Pendente
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={
                          generateMut.isPending && pendingCertId === p.id
                        }
                        onClick={() => generateMut.mutate(p.id)}
                        title={
                          p.certificate_url
                            ? "Regenerar certificado"
                            : "Gerar certificado"
                        }
                      >
                        {generateMut.isPending && pendingCertId === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : p.certificate_url ? (
                          <RefreshCw className="h-3.5 w-3.5" />
                        ) : (
                          <Stamp className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMut.mutate(p.id)}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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

function AddParticipanteDialog({
  onSubmit,
  isPending,
}: {
  onSubmit: (v: {
    first_name: string;
    last_name: string;
    tshirt_size: TShirtSize;
  }) => void;
  isPending: boolean;
}) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [size, setSize] = useState<TShirtSize>("M");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Adicionar participante</DialogTitle>
        <DialogDescription>
          Aluno da escola. Sem conta na plataforma.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <div>
          <Label className="mb-1 block text-xs">Primeiro nome</Label>
          <Input
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Último nome</Label>
          <Input value={last} onChange={(e) => setLast(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Tamanho de t-shirt</Label>
          <Select value={size} onValueChange={(v) => setSize(v as TShirtSize)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TSHIRT_SIZES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={isPending || !first.trim() || !last.trim()}
          onClick={() =>
            onSubmit({
              first_name: first.trim(),
              last_name: last.trim(),
              tshirt_size: size,
            })
          }
        >
          {isPending ? "A guardar…" : "Adicionar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function parseBulkNames(
  text: string,
): { first_name: string; last_name: string }[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // Aceita "Primeiro Último", "Último, Primeiro" ou separado por tab/;
      let first = "";
      let last = "";
      if (line.includes(",")) {
        const [a, b] = line.split(",").map((s) => s.trim());
        last = a;
        first = b ?? "";
      } else if (line.includes("\t") || line.includes(";")) {
        const [a, b] = line.split(/[\t;]/).map((s) => s.trim());
        first = a;
        last = b ?? "";
      } else {
        const parts = line.split(/\s+/);
        first = parts[0] ?? "";
        last = parts.slice(1).join(" ");
      }
      return { first_name: first, last_name: last };
    })
    .filter((p) => p.first_name && p.last_name);
}

function BulkImportDialog({
  onSubmit,
  isPending,
}: {
  onSubmit: (v: {
    participantes: { first_name: string; last_name: string }[];
    default_tshirt_size: TShirtSize;
  }) => void;
  isPending: boolean;
}) {
  const [text, setText] = useState("");
  const [size, setSize] = useState<TShirtSize>("M");
  const parsed = parseBulkNames(text);
  const totalLines = text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0).length;
  const skipped = totalLines - parsed.length;

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Importar participantes em massa</DialogTitle>
        <DialogDescription>
          Um aluno por linha. Formatos aceites:{" "}
          <code className="rounded bg-muted px-1">João Silva</code>,{" "}
          <code className="rounded bg-muted px-1">Silva, João</code> ou
          separado por tabulação/ponto e vírgula.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <div>
          <Label className="mb-1 block text-xs">Nomes</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={"João Silva\nMaria Santos\nAna Costa"}
            autoFocus
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {parsed.length} válido(s)
            {skipped > 0 ? ` · ${skipped} ignorada(s) (falta apelido)` : ""}
          </p>
        </div>
        <div>
          <Label className="mb-1 block text-xs">
            Tamanho de t-shirt (predefinido)
          </Label>
          <Select value={size} onValueChange={(v) => setSize(v as TShirtSize)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TSHIRT_SIZES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Pode ser ajustado por aluno depois, na tabela.
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={isPending || parsed.length === 0}
          onClick={() =>
            onSubmit({ participantes: parsed, default_tshirt_size: size })
          }
        >
          {isPending
            ? "A importar…"
            : `Importar ${parsed.length} participante(s)`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
