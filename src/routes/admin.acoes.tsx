import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarDays, ShieldAlert, ListChecks, Users, GraduationCap, Trash2, Plus, UserSquare2, Link2, Copy, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  listAcoes,
  getActionDetails,
  updateAction,
  updateEnrollment,
  listEligibleTrainers,
  assignTrainer,
  updateTrainer,
  removeTrainer,
  type UpdateEnrollmentInput,
  type UpdateTrainerInput,
} from "@/lib/admin-acoes.functions";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/admin/acoes")({
  head: () => ({ meta: [{ title: "Gestão de Ações — Admin" }] }),
  component: AdminAcoesPage,
});

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
const TRAINER_STATUS = ["Pendente", "Confirmado", "Cancelado"] as const;

function AdminAcoesPage() {
  const { isAdmin } = useApp();
  const fetchAcoes = useServerFn(listAcoes);
  const { data: acoesRaw, isLoading } = useQuery({
    queryKey: ["admin-acoes"],
    queryFn: () => fetchAcoes(),
    enabled: isAdmin,
    retry: false,
  });
  const acoes = Array.isArray(acoesRaw) ? acoesRaw : [];
  const [actionId, setActionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!actionId && acoes.length > 0) setActionId(acoes[0].id);
  }, [acoes, actionId]);

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta área é exclusiva para administradores.
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ListChecks className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-semibold tracking-tight">Gestão de Ações</h1>
          <p className="text-sm text-muted-foreground">
            Logística, formandos, formadores e certificados por ação.
          </p>
        </div>
      </div>

      <Card className="p-4">
        <Label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Ação
        </Label>
        {isLoading ? (
          <Skeleton className="h-10 max-w-md" />
        ) : acoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Não existem ações registadas.</p>
        ) : (
          <Select value={actionId ?? ""} onValueChange={setActionId}>
            <SelectTrigger className="max-w-xl">
              <SelectValue placeholder="Selecionar ação…" />
            </SelectTrigger>
            <SelectContent>
              {acoes.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.category ? `[${a.category}] ` : ""}
                  {a.title ?? "(sem título)"}
                  {a.action_date ? ` — ${a.action_date}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Card>

      {actionId && <ActionPanel actionId={actionId} />}
    </div>
  );
}

function ActionPanel({ actionId }: { actionId: string }) {
  const qc = useQueryClient();
  const fetchDetails = useServerFn(getActionDetails);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-action", actionId],
    queryFn: () => fetchDetails({ data: { actionId } }),
    retry: false,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-action", actionId] });

  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;
  if (!data.action) return <p className="text-sm text-muted-foreground">Ação não encontrada.</p>;

  return (
    <Tabs defaultValue="detalhes" className="space-y-4">
      <TabsList>
        <TabsTrigger value="detalhes">
          <CalendarDays className="mr-2 h-4 w-4" /> Detalhes & Logística
        </TabsTrigger>
        <TabsTrigger value="formandos">
          <Users className="mr-2 h-4 w-4" /> Formandos
          <Badge variant="secondary" className="ml-2">{data.enrollments.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="formadores">
          <GraduationCap className="mr-2 h-4 w-4" /> Formadores
          <Badge variant="secondary" className="ml-2">{data.trainers.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="participantes">
          <UserSquare2 className="mr-2 h-4 w-4" /> Participantes
          <Badge variant="secondary" className="ml-2">{data.participantes.length}</Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="detalhes">
        <DetailsTab actionId={actionId} action={data.action} onSaved={invalidate} />
      </TabsContent>
      <TabsContent value="formandos">
        <EnrollmentsTab rows={data.enrollments} onChanged={invalidate} />
      </TabsContent>
      <TabsContent value="formadores">
        <TrainersTab actionId={actionId} rows={data.trainers} onChanged={invalidate} />
      </TabsContent>
      <TabsContent value="participantes">
        <ParticipantesReadOnly rows={data.participantes} />
      </TabsContent>
    </Tabs>
  );
}

function ParticipantesReadOnly({
  rows,
}: {
  rows: Awaited<ReturnType<typeof getActionDetails>>["participantes"];
}) {
  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Sem participantes (alunos) registados pela entidade.
        </CardContent>
      </Card>
    );
  }
  const sizeCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.tshirt_size] = (acc[r.tshirt_size] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Participantes (alunos)</CardTitle>
        <CardDescription>
          Total: {rows.length} ·{" "}
          {Object.entries(sizeCounts)
            .map(([s, n]) => `${s}: ${n}`)
            .join(" · ")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>T-shirt</TableHead>
              <TableHead>Presença</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.first_name} {p.last_name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{p.tshirt_size}</Badge>
                </TableCell>
                <TableCell>
                  {p.attendance_confirmed ? (
                    <Badge>Presente</Badge>
                  ) : (
                    <Badge variant="secondary">—</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

type ActionDetails = NonNullable<
  Awaited<ReturnType<typeof getActionDetails>>
>["action"];

function DetailsTab({
  actionId,
  action,
  onSaved,
}: {
  actionId: string;
  action: ActionDetails;
  onSaved: () => void;
}) {
  const updateFn = useServerFn(updateAction);
  const [form, setForm] = useState(() => ({
    start_date: action?.start_date ?? "",
    end_date: action?.end_date ?? "",
    tshirt_tracking_link: action?.tshirt_tracking_link ?? "",
    tshirt_value: action?.tshirt_value?.toString() ?? "",
    fotos_link: action?.fotos_link ?? "",
    avaliacao_satisfacao: action?.avaliacao_satisfacao?.toString() ?? "",
    avaliacao_satisfacao_link: action?.avaliacao_satisfacao_link ?? "",
    avaliacao_impacto: action?.avaliacao_impacto?.toString() ?? "",
    avaliacao_impacto_link: action?.avaliacao_impacto_link ?? "",
  }));

  const mut = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          actionId,
          fields: {
            start_date: form.start_date || null,
            end_date: form.end_date || null,
            tshirt_tracking_link: form.tshirt_tracking_link || null,
            tshirt_value: form.tshirt_value === "" ? null : Number(form.tshirt_value),
            fotos_link: form.fotos_link || null,
            avaliacao_satisfacao:
              form.avaliacao_satisfacao === "" ? null : Number(form.avaliacao_satisfacao),
            avaliacao_satisfacao_link: form.avaliacao_satisfacao_link || null,
            avaliacao_impacto:
              form.avaliacao_impacto === "" ? null : Number(form.avaliacao_impacto),
            avaliacao_impacto_link: form.avaliacao_impacto_link || null,
          },
        },
      }),
    onSuccess: () => {
      toast.success("Detalhes guardados.");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao guardar"),
  });

  const setField = <K extends keyof typeof form>(k: K, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{action?.title ?? "Ação"}</CardTitle>
        <CardDescription>
          {action?.category ? `${action.category} · ` : ""}
          {action?.action_date ?? "sem data"}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <InscriptionLinkBlock notionId={action?.notion_id ?? null} />

        <Field label="Data de início">
          <Input type="date" value={form.start_date} onChange={(e) => setField("start_date", e.target.value)} />
        </Field>
        <Field label="Data de fim">
          <Input type="date" value={form.end_date} onChange={(e) => setField("end_date", e.target.value)} />
        </Field>

        <Field label="Link tracking T-shirts">
          <Input value={form.tshirt_tracking_link} onChange={(e) => setField("tshirt_tracking_link", e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Valor das T-shirts (€)">
          <Input type="number" step="0.01" value={form.tshirt_value} onChange={(e) => setField("tshirt_value", e.target.value)} />
        </Field>

        <Field label="Link Fotos" className="sm:col-span-2">
          <Input value={form.fotos_link} onChange={(e) => setField("fotos_link", e.target.value)} placeholder="https://…" />
        </Field>

        <Field label="Avaliação Satisfação (0–10)">
          <Input type="number" min={0} max={10} step="0.1" value={form.avaliacao_satisfacao} onChange={(e) => setField("avaliacao_satisfacao", e.target.value)} />
        </Field>
        <Field label="Link Avaliação Satisfação">
          <Input value={form.avaliacao_satisfacao_link} onChange={(e) => setField("avaliacao_satisfacao_link", e.target.value)} placeholder="https://…" />
        </Field>

        <Field label="Avaliação Impacto (0–10)">
          <Input type="number" min={0} max={10} step="0.1" value={form.avaliacao_impacto} onChange={(e) => setField("avaliacao_impacto", e.target.value)} />
        </Field>
        <Field label="Link Avaliação Impacto">
          <Input value={form.avaliacao_impacto_link} onChange={(e) => setField("avaliacao_impacto_link", e.target.value)} placeholder="https://…" />
        </Field>

        <div className="sm:col-span-2">
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "A guardar…" : "Guardar alterações"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InscriptionLinkBlock({ notionId }: { notionId: string | null }) {
  if (!notionId) {
    return (
      <div className="sm:col-span-2 rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Link2 className="h-4 w-4" /> Link de inscrição pública
        </div>
        <p className="mt-1 text-xs">
          Esta ação ainda não tem <code>notion_id</code> associado. Defina o ID da página do Notion para gerar o link automaticamente.
        </p>
      </div>
    );
  }
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/evento/${notionId}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };
  return (
    <div className="sm:col-span-2 rounded-md border bg-muted/30 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Link2 className="h-4 w-4 text-primary" /> Link de inscrição pública
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input readOnly value={url} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 h-3.5 w-3.5" /> Abrir
            </a>
          </Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Partilhe este URL — qualquer pessoa com sessão iniciada pode inscrever-se nesta ação.
      </p>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

type EnrollmentRow = Awaited<ReturnType<typeof getActionDetails>>["enrollments"][number];

function EnrollmentsTab({ rows, onChanged }: { rows: EnrollmentRow[]; onChanged: () => void }) {
  const updateFn = useServerFn(updateEnrollment);
  const mut = useMutation({
    mutationFn: (vars: UpdateEnrollmentInput) => updateFn({ data: vars }),
    onSuccess: () => {
      toast.success("Atualizado.");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (rows.length === 0) {
    return <EmptyHint text="Sem formandos inscritos nesta ação." />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Formando</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>T-shirt</TableHead>
              <TableHead>Certificado</TableHead>
              <TableHead>URL certificado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.full_name}</div>
                  <div className="text-xs text-muted-foreground">{r.email ?? "—"}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{r.status ?? "—"}</Badge>
                </TableCell>
                <TableCell>
                  <SizeSelect
                    value={r.tshirt_size}
                    onChange={(v) => mut.mutate({ enrollmentId: r.id, fields: { tshirt_size: v } })}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={!!r.certificate_sent}
                    onCheckedChange={(v) =>
                      mut.mutate({ enrollmentId: r.id, fields: { certificate_sent: v } })
                    }
                  />
                </TableCell>
                <TableCell>
                  <UrlInput
                    initial={r.certificate_url ?? ""}
                    onSave={(v) =>
                      mut.mutate({ enrollmentId: r.id, fields: { certificate_url: v || null } })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

type TrainerRow = Awaited<ReturnType<typeof getActionDetails>>["trainers"][number];

function TrainersTab({
  actionId,
  rows,
  onChanged,
}: {
  actionId: string;
  rows: TrainerRow[];
  onChanged: () => void;
}) {
  const fetchEligible = useServerFn(listEligibleTrainers);
  const assignFn = useServerFn(assignTrainer);
  const updateFn = useServerFn(updateTrainer);
  const removeFn = useServerFn(removeTrainer);

  const { data: eligibleRaw } = useQuery({
    queryKey: ["eligible-trainers"],
    queryFn: () => fetchEligible(),
    staleTime: 60_000,
  });
  const eligible = Array.isArray(eligibleRaw) ? eligibleRaw : [];
  const assigned = new Set(rows.map((r) => r.user_id));
  const [picked, setPicked] = useState<string | undefined>();

  const assignMut = useMutation({
    mutationFn: () => assignFn({ data: { actionId, userId: picked! } }),
    onSuccess: () => {
      toast.success("Formador adicionado.");
      setPicked(undefined);
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const updateMut = useMutation({
    mutationFn: (vars: UpdateTrainerInput) => updateFn({ data: vars }),
    onSuccess: () => onChanged(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const removeMut = useMutation({
    mutationFn: (trainerId: string) => removeFn({ data: { trainerId } }),
    onSuccess: () => {
      toast.success("Formador removido.");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="min-w-[260px] flex-1">
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">
              Adicionar formador
            </Label>
            <Select value={picked ?? ""} onValueChange={setPicked}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar utilizador…" />
              </SelectTrigger>
              <SelectContent>
                {eligible
                  .filter((u) => !assigned.has(u.id))
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name ?? u.id}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => assignMut.mutate()} disabled={!picked || assignMut.isPending}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyHint text="Sem formadores associados a esta ação." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formador</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>T-shirt</TableHead>
                  <TableHead>Certificado</TableHead>
                  <TableHead>URL certificado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-xs text-muted-foreground">{r.email ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.status ?? "Pendente"}
                        onValueChange={(v) =>
                          updateMut.mutate({
                            trainerId: r.id,
                            fields: { status: v as (typeof TRAINER_STATUS)[number] },
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRAINER_STATUS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <SizeSelect
                        value={r.tshirt_size}
                        onChange={(v) =>
                          updateMut.mutate({ trainerId: r.id, fields: { tshirt_size: v } })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={!!r.certificate_sent}
                        onCheckedChange={(v) =>
                          updateMut.mutate({
                            trainerId: r.id,
                            fields: { certificate_sent: v },
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <UrlInput
                        initial={r.certificate_url ?? ""}
                        onSave={(v) =>
                          updateMut.mutate({
                            trainerId: r.id,
                            fields: { certificate_url: v || null },
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMut.mutate(r.id)}
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SizeSelect({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (v: (typeof TSHIRT_SIZES)[number]) => void;
}) {
  return (
    <Select value={value ?? ""} onValueChange={(v) => onChange(v as (typeof TSHIRT_SIZES)[number])}>
      <SelectTrigger className="h-8 w-[88px] text-xs">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        {TSHIRT_SIZES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function UrlInput({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(initial);
  useEffect(() => setVal(initial), [initial]);
  return (
    <Input
      className="h-8 text-xs"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        if (val !== initial) onSave(val);
      }}
      placeholder="https://…"
    />
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-10 text-center text-sm text-muted-foreground">{text}</CardContent>
    </Card>
  );
}
