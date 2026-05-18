import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  GraduationCap,
  Plus,
  Trash2,
  UserSquare2,
} from "lucide-react";
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
  getEntidadeActionDetails,
  addParticipante,
  updateParticipante,
  removeParticipante,
  type UpdateParticipanteInput,
} from "@/lib/entidade.functions";

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
type TShirtSize = (typeof TSHIRT_SIZES)[number];

export const Route = createFileRoute("/entidade/acoes/$id")({
  head: () => ({ meta: [{ title: "Detalhe da Ação — Entidade" }] }),
  component: EntidadeAcaoDetailPage,
});

function EntidadeAcaoDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchDetails = useServerFn(getEntidadeActionDetails);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["entidade-action", id],
    queryFn: () => fetchDetails({ data: { actionId: id } }),
    retry: false,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["entidade-action", id] });

  if (isLoading) return <Skeleton className="mx-auto h-64 w-full max-w-5xl" />;
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/entidade/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
          </Link>
        </Button>
        <Badge
          variant={
            a.status === "Confirmada"
              ? "default"
              : a.status === "Cancelada"
                ? "destructive"
                : "secondary"
          }
        >
          {a.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {a.action_type ?? "Ação"}
              </p>
              <CardTitle className="text-xl">{a.title ?? "Ação"}</CardTitle>
              <CardDescription>
                {a.start_date ?? "—"} → {a.end_date ?? "—"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <TrainersSection trainers={data.trainers} />

      <ParticipantesSection
        actionId={id}
        rows={data.participantes}
        onChanged={invalidate}
      />
    </div>
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
          <GraduationCap className="h-5 w-5" /> Formadores
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
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.full_name}</TableCell>
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
  const addFn = useServerFn(addParticipante);
  const updateFn = useServerFn(updateParticipante);
  const removeFn = useServerFn(removeParticipante);
  const [open, setOpen] = useState(false);

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

  const updateMut = useMutation({
    mutationFn: (vars: UpdateParticipanteInput) => updateFn({ data: vars }),
    onSuccess: () => onChanged(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserSquare2 className="h-5 w-5" /> Participantes (Alunos)
            <Badge variant="secondary" className="ml-1">
              {rows.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Lista de alunos da escola. Sem conta na plataforma.
          </CardDescription>
        </div>
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
                <TableHead className="w-[120px]">T-shirt</TableHead>
                <TableHead className="w-[100px]">Presença</TableHead>
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
