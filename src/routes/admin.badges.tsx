import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
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

import {
  useAllBadges,
  useAssignBadge,
  useDeleteBadge,
  useRevokeBadge,
  useUpsertBadge,
  useUsersByBadge,
  type BadgeInput,
} from "@/hooks/use-badges";
import { useUsers } from "@/hooks/use-users";
import { useCurrentProfile } from "@/hooks/use-current-profile";

export const Route = createFileRoute("/admin/badges")({
  head: () => ({ meta: [{ title: "Gestão de Badges — Academia Ubuntu" }] }),
  component: AdminBadgesPage,
});

type BadgeRow = {
  id: string;
  title: string;
  description: string | null;
  cluster: string;
  cover_url: string | null;
  required_program_id: string | null;
};

function AdminBadgesPage() {
  const { roles, isLoading } = useCurrentProfile();
  const isAdmin = roles.includes("Admin");

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">A carregar…</p>;
  }
  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
          <CardDescription>Esta área é exclusiva para administradores.</CardDescription>
        </CardHeader>
      </Card>
    );
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
        </TabsList>

        <TabsContent value="catalogo" className="mt-4">
          <CatalogoTab />
        </TabsContent>
        <TabsContent value="utilizadores" className="mt-4">
          <UtilizadoresTab />
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
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {badges.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    {b.cover_url ? (
                      <img
                        src={b.cover_url}
                        alt={b.title}
                        className="h-10 w-10 rounded-full object-cover"
                      />
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
                  <TableCell className="text-sm text-muted-foreground">{b.cluster}</TableCell>
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
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setToDelete(b)}
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

function useProgramsList() {
  return useQuery({
    queryKey: ["programs", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programas")
        .select("id, title")
        .order("title");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
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
  const { data: programs } = useProgramsList();

  const [form, setForm] = useState<BadgeInput>({
    title: "",
    description: "",
    cluster: "",
    cover_url: "",
    required_program_id: null,
  });

  useMemo(() => {
    if (open) {
      setForm({
        id: editing?.id,
        title: editing?.title ?? "",
        description: editing?.description ?? "",
        cluster: editing?.cluster ?? "",
        cover_url: editing?.cover_url ?? "",
        required_program_id: editing?.required_program_id ?? null,
      });
    }
  }, [open, editing]);

  const submit = () => {
    if (!form.title.trim() || !form.cluster.trim()) {
      toast.error("Título e cluster são obrigatórios.");
      return;
    }
    upsert.mutate(
      {
        ...form,
        description: form.description?.toString().trim() || null,
        cover_url: form.cover_url?.toString().trim() || null,
        required_program_id: form.required_program_id || null,
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
            Defina o título, cluster e (opcionalmente) o programa que o desbloqueia.
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
            <Input
              value={form.cluster}
              onChange={(e) => setForm((f) => ({ ...f, cluster: e.target.value }))}
            />
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
          </div>
          <div className="space-y-1">
            <Label>Programa que desbloqueia (opcional)</Label>
            <Select
              value={form.required_program_id ?? "none"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, required_program_id: v === "none" ? null : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {(programs ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title ?? p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    {b.title} <span className="ml-2 text-xs text-muted-foreground">· {b.cluster}</span>
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
          <DialogDescription>Procure o utilizador pelo nome ou email.</DialogDescription>
        </DialogHeader>

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <Search className="mr-2 h-4 w-4" />
              {pickedUser
                ? `${pickedUser.full_name ?? "(sem nome)"} — ${pickedUser.email}`
                : "Procurar utilizador…"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Procurar…" />
              <CommandList>
                <CommandEmpty>Sem resultados.</CommandEmpty>
                <CommandGroup>
                  {users.map((u) => (
                    <CommandItem
                      key={u.id}
                      value={`${u.full_name ?? ""} ${u.email}`}
                      onSelect={() => {
                        setPicked(u.id);
                        setPopoverOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm">{u.full_name ?? "(sem nome)"}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

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
