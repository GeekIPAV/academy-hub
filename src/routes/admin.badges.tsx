import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Award, Pencil, Plus, Trash2, Crop, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CoverImage } from "@/components/CoverImage";
import { CoverAdjustDialog } from "@/components/CoverAdjustDialog";
import { toast } from "sonner";


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import {
  useAllBadges,
  useAssignBadge,
  useDeleteBadge,
  useRevokeBadge,
  useUpsertBadge,
  useUsersByBadge,
  type BadgeInput,
  type BadgeValidityType,
} from "@/hooks/use-badges";
import { useClusters } from "@/hooks/use-clusters";
import { useUsers } from "@/hooks/use-users";
import { useRoles } from "@/hooks/use-roles";
import { useCurrentProfile } from "@/hooks/use-current-profile";

import { RouteGate } from "@/components/RouteGate";

export const Route = createFileRoute("/admin/badges")({
  head: () => ({ meta: [{ title: "Gestão de Badges — Academia Ubuntu" }] }),
  component: () => (
    <RouteGate path="/admin/badges">
      <AdminBadgesPage />
    </RouteGate>
  ),
});


type BadgeRow = {
  id: string;
  title: string;
  description: string | null;
  cluster_id: string;
  cluster_name: string;
  cover_url: string | null;
  cover_position: string | null;
  cover_scale: number | null;
  validity_type: string;
  validity_years: number | null;
  validity_fixed_date: string | null;
};

function AdminBadgesPage() {
  const { isLoading } = useCurrentProfile();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">A carregar…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gestão de Badges</h1>
        <p className="text-sm text-muted-foreground">
          Catálogo de credenciais e atribuição manual a utilizadores.
        </p>
      </div>

      <Tabs defaultValue="catalogo">
        <TabsList>
          <TabsTrigger value="catalogo">Catálogo de Badges</TabsTrigger>
          <TabsTrigger value="utilizadores">Utilizadores Credenciados</TabsTrigger>
          <TabsTrigger value="massa">Atribuição em Massa</TabsTrigger>
          <TabsTrigger value="auto">Auto por Perfil</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="mt-4">
          <CatalogoTab />
        </TabsContent>
        <TabsContent value="utilizadores" className="mt-4">
          <UtilizadoresTab />
        </TabsContent>
        <TabsContent value="massa" className="mt-4">
          <AtribuicaoMassaTab />
        </TabsContent>
        <TabsContent value="auto" className="mt-4">
          <AutoPorPerfilTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------- Catálogo ------------------------- */

function CatalogoTab() {
  const { data: badges, isLoading } = useAllBadges();
  const [editing, setEditing] = useState<BadgeRow | null>(null);
  const [open, setOpen] = useState(false);
  const deleteMut = useDeleteBadge();
  const [toDelete, setToDelete] = useState<BadgeRow | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Catálogo</CardTitle>
          <CardDescription>Crie e edite os badges disponíveis.</CardDescription>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo badge
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar…</p>
        ) : !badges || badges.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não existem badges.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16"></TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Cluster</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {badges.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    {b.cover_url ? (
                      <div className="h-10 w-10 overflow-hidden rounded-full">
                        <CoverImage
                          src={b.cover_url}
                          position={b.cover_position}
                          scale={b.cover_scale}
                        />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{b.title}</div>
                    {b.description && (
                      <div className="line-clamp-1 text-xs text-muted-foreground">
                        {b.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.cluster_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatValidity(b.validity_type, b.validity_years, b.validity_fixed_date)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(b);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setToDelete(b)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <BadgeFormDialog open={open} onOpenChange={setOpen} editing={editing} />

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar badge?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível e removerá também todas as atribuições deste badge.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) deleteMut.mutate({ id: toDelete.id });
                setToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function formatValidity(
  type: string,
  years: number | null,
  fixed: string | null,
): string {
  if (type === "relative_years" && years) return `${years} ano${years === 1 ? "" : "s"}`;
  if (type === "fixed_date" && fixed) return `Até ${new Date(fixed).toLocaleDateString("pt-PT")}`;
  return "Para sempre";
}


function BadgeFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: BadgeRow | null;
}) {
  const upsert = useUpsertBadge();
  const { data: clusters } = useClusters();

  const [form, setForm] = useState<BadgeInput>({
    title: "",
    description: "",
    cluster_id: "",
    cover_url: "",
    cover_position: "50% 50%",
    cover_scale: 1,
    validity_type: "forever",
    validity_years: null,
    validity_fixed_date: null,
  });
  const [adjustOpen, setAdjustOpen] = useState(false);

  useMemo(() => {
    if (open) {
      setForm({
        id: editing?.id,
        title: editing?.title ?? "",
        description: editing?.description ?? "",
        cluster_id: editing?.cluster_id ?? "",
        cover_url: editing?.cover_url ?? "",
        cover_position: editing?.cover_position ?? "50% 50%",
        cover_scale: editing?.cover_scale ?? 1,
        validity_type: (editing?.validity_type as BadgeValidityType) ?? "forever",
        validity_years: editing?.validity_years ?? null,
        validity_fixed_date: editing?.validity_fixed_date ?? null,
      });
    }
  }, [open, editing]);

  const submit = () => {
    if (!form.title.trim() || !form.cluster_id) {
      toast.error("Título e cluster são obrigatórios.");
      return;
    }
    if (form.validity_type === "relative_years" && !form.validity_years) {
      toast.error("Indique o número de anos de validade.");
      return;
    }
    if (form.validity_type === "fixed_date" && !form.validity_fixed_date) {
      toast.error("Indique a data de expiração.");
      return;
    }
    upsert.mutate(
      {
        ...form,
        description: form.description?.toString().trim() || null,
        cover_url: form.cover_url?.toString().trim() || null,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar badge" : "Novo badge"}</DialogTitle>
          <DialogDescription>
            Defina o título, cluster, validade e (opcionalmente) o programa que o desbloqueia.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Título</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Cluster</Label>
            <Select
              value={form.cluster_id || ""}
              onValueChange={(v) => setForm((f) => ({ ...f, cluster_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolher cluster…" />
              </SelectTrigger>
              <SelectContent>
                {(clusters ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Link da imagem</Label>
            <Input
              placeholder="https://…"
              value={form.cover_url ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, cover_url: e.target.value }))}
            />
            {form.cover_url && (
              <div className="flex items-center gap-3 pt-2">
                <div className="h-14 w-14 overflow-hidden rounded-full border bg-muted">
                  <CoverImage
                    src={form.cover_url}
                    position={form.cover_position}
                    scale={form.cover_scale}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdjustOpen(true)}
                >
                  <Crop className="mr-1.5 h-3.5 w-3.5" />
                  Ajustar imagem
                </Button>
              </div>
            )}
            {form.cover_url && (
              <CoverAdjustDialog
                open={adjustOpen}
                onOpenChange={setAdjustOpen}
                imageUrl={form.cover_url}
                initialPosition={form.cover_position}
                initialScale={form.cover_scale}
                aspectRatio={1}
                onSave={(p, s) =>
                  setForm((f) => ({ ...f, cover_position: p, cover_scale: s }))
                }
              />
            )}
          </div>





          <div className="space-y-2 rounded-md border p-3">
            <Label>Validade</Label>
            <RadioGroup
              value={form.validity_type}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, validity_type: v as BadgeValidityType }))
              }
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="v-forever" value="forever" />
                <Label htmlFor="v-forever" className="font-normal">Para sempre</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="v-years" value="relative_years" />
                <Label htmlFor="v-years" className="font-normal">Expira após</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  className="w-20"
                  value={form.validity_years ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      validity_years: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  disabled={form.validity_type !== "relative_years"}
                />
                <span className="text-sm text-muted-foreground">ano(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="v-fixed" value="fixed_date" />
                <Label htmlFor="v-fixed" className="font-normal">Expira em</Label>
                <Input
                  type="date"
                  className="w-44"
                  value={form.validity_fixed_date ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, validity_fixed_date: e.target.value || null }))
                  }
                  disabled={form.validity_type !== "fixed_date"}
                />
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={upsert.isPending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------- Utilizadores ------------------------- */

function UtilizadoresTab() {
  const { data: badges } = useAllBadges();
  const [badgeId, setBadgeId] = useState<string | null>(null);
  const { data: rows, isLoading } = useUsersByBadge(badgeId);
  const revoke = useRevokeBadge();
  const [assignOpen, setAssignOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utilizadores credenciados</CardTitle>
        <CardDescription>Selecione um badge para ver quem o possui.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label>Badge</Label>
            <Select value={badgeId ?? ""} onValueChange={(v) => setBadgeId(v || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um badge…" />
              </SelectTrigger>
              <SelectContent>
                {(badges ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title}
                    <span className="ml-2 text-xs text-muted-foreground">
                      · {b.cluster_name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setAssignOpen(true)} disabled={!badgeId}>
            <Plus className="mr-2 h-4 w-4" /> Atribuir manualmente
          </Button>
        </div>

        {!badgeId ? (
          <p className="text-sm text-muted-foreground">Escolha um badge para começar.</p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar…</p>
        ) : !rows || rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguém tem este badge ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Atribuído em</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead className="w-16 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.assignment_id}>
                  <TableCell>{r.full_name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.granted_at
                      ? new Date(r.granted_at).toLocaleDateString("pt-PT")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.expires_at
                      ? new Date(r.expires_at).toLocaleDateString("pt-PT")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        revoke.mutate({ userId: r.user_id, badgeId: badgeId! })
                      }
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

      <AssignBadgeDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        badgeId={badgeId}
      />
    </Card>
  );
}

function AssignBadgeDialog({
  open,
  onOpenChange,
  badgeId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  badgeId: string | null;
}) {
  const { users } = useUsers();
  const assign = useAssignBadge();
  const [picked, setPicked] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const pickedUser = users.find((u) => u.id === picked);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setPicked(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir badge</DialogTitle>
          <DialogDescription>Escolha o utilizador a credenciar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Utilizador</Label>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {pickedUser?.full_name ?? pickedUser?.email ?? "Escolher…"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Procurar por nome ou email…" />
                <CommandList>
                  <CommandEmpty>Sem resultados.</CommandEmpty>
                  <CommandGroup>
                    {users.map((u) => (
                      <CommandItem
                        key={u.id}
                        value={`${u.full_name ?? ""} ${u.email ?? ""}`}
                        onSelect={() => {
                          setPicked(u.id);
                          setPopoverOpen(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm">{u.full_name ?? "—"}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!picked || !badgeId || assign.isPending}
            onClick={() => {
              if (!picked || !badgeId) return;
              assign.mutate(
                { userId: picked, badgeId },
                { onSuccess: () => onOpenChange(false) },
              );
            }}
          >
            Atribuir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------- Atribuição em Massa ------------------------- */

function AtribuicaoMassaTab() {
  const { data: badges } = useAllBadges();
  const { users } = useUsers();
  const { roles } = useRoles();
  const assign = useAssignBadge();

  const [badgeId, setBadgeId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [onlyActive, setOnlyActive] = useState(true);
  const [running, setRunning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const toggleRole = (name: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const targetUsers = useMemo(() => {
    if (selectedRoles.size === 0) return [];
    return users.filter((u) => {
      if (onlyActive && !u.is_active) return false;
      return u.roles.some((r) => selectedRoles.has(r));
    });
  }, [users, selectedRoles, onlyActive]);

  const selectedBadge = badges?.find((b) => b.id === badgeId);

  const runBulkAssign = async () => {
    if (!badgeId || targetUsers.length === 0) return;
    setRunning(true);
    let ok = 0;
    let fail = 0;
    for (const u of targetUsers) {
      try {
        await assign.mutateAsync({ userId: u.id, badgeId });
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setRunning(false);
    setConfirmOpen(false);
    toast.success(
      `Concluído: ${ok} atribuído(s)${fail ? `, ${fail} falha(s)` : ""}.`,
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atribuição em massa</CardTitle>
        <CardDescription>
          Atribua um badge a todos os utilizadores que pertencem a determinados perfis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <Label>Badge</Label>
          <Select value={badgeId ?? ""} onValueChange={(v) => setBadgeId(v || null)}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um badge…" />
            </SelectTrigger>
            <SelectContent>
              {(badges ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.title}
                  <span className="ml-2 text-xs text-muted-foreground">
                    · {b.cluster_name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Perfis (tipos de utilizador)</Label>
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">A carregar perfis…</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-2">
              {roles
                .filter((r) => r.is_active)
                .map((r) => (
                  <label
                    key={r.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedRoles.has(r.name)}
                      onCheckedChange={() => toggleRole(r.name)}
                    />
                    <span>{r.name}</span>
                  </label>
                ))}
            </div>
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={onlyActive}
            onCheckedChange={(v) => setOnlyActive(v === true)}
          />
          <span>Apenas utilizadores ativos</span>
        </label>

        <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              <strong>{targetUsers.length}</strong> utilizador(es) correspondem aos critérios.
            </span>
          </div>
          <Button
            disabled={!badgeId || targetUsers.length === 0 || running}
            onClick={() => setConfirmOpen(true)}
          >
            Atribuir badge
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar atribuição em massa?</AlertDialogTitle>
            <AlertDialogDescription>
              O badge <strong>{selectedBadge?.title}</strong> será atribuído a{" "}
              <strong>{targetUsers.length}</strong> utilizador(es). Utilizadores que já
              tenham este badge são ignorados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={running}
              onClick={(e) => {
                e.preventDefault();
                runBulkAssign();
              }}
            >
              {running ? "A atribuir…" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/* ------------------- Auto por Perfil ------------------- */

function AutoPorPerfilTab() {
  const { data: badges = [] } = useAllBadges();
  const { roles } = useRoles();
  const [rows, setRows] = useState<Array<{ id: string; badge_id: string; role_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [badgeId, setBadgeId] = useState<string>("");
  const [roleName, setRoleName] = useState<string>("");

  const reload = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("badge_role_auto_grant" as any)
      .select("id, badge_id, role_name")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const add = async () => {
    if (!badgeId || !roleName) {
      toast.error("Seleciona um badge e um perfil");
      return;
    }
    
    const { error } = await supabase
      .from("badge_role_auto_grant" as any)
      .insert({ badge_id: badgeId, role_name: roleName } as any);
    if (error) return toast.error(error.message);
    toast.success("Regra adicionada");
    setBadgeId(""); setRoleName("");
    reload();
  };

  const remove = async (id: string) => {
    
    const { error } = await supabase.from("badge_role_auto_grant" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Regra removida");
    reload();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-atribuição por perfil</CardTitle>
        <CardDescription>
          Quando um utilizador receber um perfil aqui listado, recebe automaticamente o badge associado. Aplica-se a novos registos e a futuras atribuições de perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Label>Badge</Label>
            <Select value={badgeId} onValueChange={setBadgeId}>
              <SelectTrigger><SelectValue placeholder="Selecionar badge" /></SelectTrigger>
              <SelectContent>
                {badges.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px] flex-1">
            <Label>Perfil</Label>
            <Select value={roleName} onValueChange={setRoleName}>
              <SelectTrigger><SelectValue placeholder="Selecionar perfil" /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Adicionar regra</Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Badge</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="text-muted-foreground">A carregar...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-muted-foreground">Sem regras configuradas.</TableCell></TableRow>
            ) : rows.map((r) => {
              const badge = badges.find((b) => b.id === r.badge_id);
              return (
                <TableRow key={r.id}>
                  <TableCell>{badge?.title ?? r.badge_id}</TableCell>
                  <TableCell>{r.role_name}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
