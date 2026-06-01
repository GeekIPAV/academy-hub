import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, ExternalLink, Plus, Shield, Trash2, UserPlus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

import { useApp } from "@/lib/app-context";
import { APP_ROUTES } from "@/lib/mock-data";
import type { RoleName } from "@/lib/types";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";
import { useRoles } from "@/hooks/use-roles";
import { useUsers } from "@/hooks/use-users";
import { usePermissions } from "@/hooks/use-permissions";
import { createRole, deleteRole, updateRole } from "@/lib/roles.functions";
import { createInvite, listInvites, revokeInvite } from "@/lib/invites.functions";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/manager")({
  head: () => ({ meta: [{ title: "Central de Comando — Admin" }] }),
  component: AdminManagerPage,
});

function AdminManagerPage() {
  const { isAdmin, isComponentVisible } = useApp();
  const visible = (id: string) => isComponentVisible("/admin/manager", id);
  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <Shield className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ative o role "Admin" na sidebar para continuar (modo mock).
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ComponentAccessMatrix pagePath="/admin/manager" />
      {visible("header") && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Central de Comando</h1>
          <p className="text-sm text-muted-foreground">
            Gere os perfis de utilizador e configure os respetivos acessos.
          </p>
        </div>
      )}
      <InviteLinksManager />
      <UsersManager />
      <RolesManager />
      {visible("route-matrix") && <AccessTab />}
    </div>
  );
}

function UsersManager() {
  const { users, isLoading, assign, remove } = useUsers();
  const { roles } = useRoles();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const activeRoles = roles.filter((r) => r.is_active);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Utilizadores</CardTitle>
        <CardDescription>
          Atribui um ou mais perfis a cada utilizador. As alterações são imediatas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem utilizadores registados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfis de Acesso</TableHead>
                <TableHead className="w-[140px]">Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                const userRoles = new Set(u.roles);
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium align-top">
                      {u.full_name || "—"}
                      {isSelf && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          tu
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground align-top">
                      {u.email || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-3">
                        {activeRoles.map((r) => {
                          const checked = userRoles.has(r.name);
                          const isLastAdmin =
                            isSelf && r.name === "Admin" && checked;
                          return (
                            <label
                              key={r.id}
                              className="flex items-center gap-1.5 text-sm cursor-pointer"
                              title={isLastAdmin ? "Não podes despromover-te a ti próprio" : undefined}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={isLastAdmin && [...userRoles].length === 1}
                                onCheckedChange={(v) => {
                                  if (v) assign.mutate({ userId: u.id, role: r.name });
                                  else remove.mutate({ userId: u.id, role: r.name });
                                }}
                              />
                              <span>{r.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground align-top">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString("pt-PT")
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function RolesManager() {
  const qc = useQueryClient();
  const { roles, isLoading } = useRoles();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createFn = useServerFn(createRole);
  const updateFn = useServerFn(updateRole);
  const deleteFn = useServerFn(deleteRole);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["roles"] });

  const createMut = useMutation({
    mutationFn: (input: { name: string; description: string }) =>
      createFn({ data: { name: input.name, description: input.description || null } }),
    onSuccess: () => {
      toast.success("Perfil criado");
      setOpen(false);
      setName("");
      setDescription("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (input: { id: string; is_active: boolean }) =>
      updateFn({ data: input }),
    onSuccess: () => {
      toast.success("Perfil atualizado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Perfil eliminado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Nome demasiado curto");
      return;
    }
    createMut.mutate({ name: trimmed, description: description.trim() });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Perfis de Utilizador</CardTitle>
          <CardDescription>
            Cria novos perfis para depois definir, na matriz abaixo, o que cada um pode ver.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Novo Perfil
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle>Criar novo perfil</DialogTitle>
                <DialogDescription>
                  O perfil ficará disponível como coluna nas matrizes de acesso.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name">Nome</Label>
                  <Input
                    id="role-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Mentor"
                    maxLength={40}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-desc">Descrição (opcional)</Label>
                  <Textarea
                    id="role-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={200}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending ? "A criar..." : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[100px] text-center">Sistema</TableHead>
                <TableHead className="w-[100px] text-center">Ativo</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.is_system ? <Badge variant="secondary">Sistema</Badge> : null}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(checked) =>
                        toggleMut.mutate({ id: r.id, is_active: checked })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {!r.is_system && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Eliminar perfil "${r.name}"?`))
                            deleteMut.mutate(r.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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

function AccessTab() {
  const { activeRoleNames } = useRoles();
  const { isAllowed, toggle } = usePermissions();

  const isGranted = (role: RoleName, path: string) => isAllowed(role, path, "rota");

  const handleToggle = (role: RoleName, path: string, next: boolean) => {
    toggle(role, path, "rota", next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matriz de Acessos</CardTitle>
        <CardDescription>
          Controle que rotas cada perfil pode aceder. Linhas: rotas. Colunas: perfis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rota</TableHead>
              {activeRoleNames.map((r: string) => (
                <TableHead key={r} className="text-center">
                  {r}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {APP_ROUTES.map((route) => (
              <TableRow key={route.path}>
                <TableCell>
                  <div className="font-medium">{route.label}</div>
                  <div className="text-xs text-muted-foreground">{route.path}</div>
                </TableCell>
                {activeRoleNames.map((role: string) => (
                  <TableCell key={role} className="text-center">
                    <Switch
                      checked={isGranted(role, route.path)}
                      onCheckedChange={(v) => handleToggle(role, route.path, v)}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface InviteRow {
  id: string;
  token: string;
  roles: string[];
  label: string | null;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  created_at: string;
}

function InviteLinksManager() {
  const qc = useQueryClient();
  const { roles } = useRoles();
  const activeRoles = roles.filter((r) => r.is_active);

  const listFn = useServerFn(listInvites);
  const createFn = useServerFn(createInvite);
  const revokeFn = useServerFn(revokeInvite);

  const invitesQ = useQuery({
    queryKey: ["invites"],
    queryFn: () => listFn() as Promise<InviteRow[]>,
  });

  const [open, setOpen] = useState(false);
  const [selRoles, setSelRoles] = useState<Set<string>>(new Set());
  const [label, setLabel] = useState("");
  const [expiresDays, setExpiresDays] = useState<string>("");
  const [maxUses, setMaxUses] = useState<string>("");

  const reset = () => {
    setSelRoles(new Set());
    setLabel("");
    setExpiresDays("");
    setMaxUses("");
  };

  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          roles: [...selRoles],
          label: label.trim() || undefined,
          expires_in_days: expiresDays ? Number(expiresDays) : undefined,
          max_uses: maxUses ? Number(maxUses) : undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Link de convite criado.");
      reset();
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Convite revogado.");
      qc.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const buildUrl = (token: string) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/convite/${token}`
      : `/convite/${token}`;

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(buildUrl(token));
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selRoles.size === 0) {
      toast.error("Seleciona pelo menos um perfil.");
      return;
    }
    createMut.mutate();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Links de Convite</CardTitle>
          <CardDescription>
            Gera um link partilhável com os perfis que escolheres. Quem aceder cria a própria conta.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="mr-1 h-4 w-4" />
              Novo Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle>Criar link de convite</DialogTitle>
                <DialogDescription>
                  Escolhe os perfis e (opcionalmente) limites de validade e utilizações.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Perfis</Label>
                  <div className="flex flex-wrap gap-3">
                    {activeRoles.map((r) => {
                      const checked = selRoles.has(r.name);
                      return (
                        <label key={r.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setSelRoles((prev) => {
                                const next = new Set(prev);
                                if (v) next.add(r.name);
                                else next.delete(r.name);
                                return next;
                              });
                            }}
                          />
                          <span>{r.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-label">Nota (opcional)</Label>
                  <Input
                    id="inv-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Ex: Mentores cohort 2026"
                    maxLength={120}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="inv-exp">Validade (dias)</Label>
                    <Input
                      id="inv-exp"
                      type="number"
                      min={1}
                      max={365}
                      value={expiresDays}
                      onChange={(e) => setExpiresDays(e.target.value)}
                      placeholder="Sem limite"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-max">Máx. utilizações</Label>
                    <Input
                      id="inv-max"
                      type="number"
                      min={1}
                      max={1000}
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      placeholder="Ilimitado"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending ? "A criar..." : "Criar link"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {invitesQ.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (invitesQ.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não criaste links.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Perfis</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="w-[180px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitesQ.data?.map((inv) => {
                const expired = inv.expires_at && new Date(inv.expires_at).getTime() < Date.now();
                const exhausted = inv.max_uses != null && inv.uses_count >= inv.max_uses;
                const status = !inv.is_active
                  ? "Revogado"
                  : expired
                  ? "Expirado"
                  : exhausted
                  ? "Esgotado"
                  : "Ativo";
                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {inv.roles.map((r) => (
                          <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{inv.label || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {inv.uses_count}
                      {inv.max_uses != null ? ` / ${inv.max_uses}` : ""}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.expires_at
                        ? new Date(inv.expires_at).toLocaleDateString("pt-PT")
                        : "Sem limite"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Badge variant={status === "Ativo" ? "default" : "outline"} className="text-xs">
                          {status}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Abrir página de adesão"
                          onClick={() => window.open(buildUrl(inv.token), "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Copiar link"
                          onClick={() => copy(inv.token)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {inv.is_active && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Revogar"
                            onClick={() => {
                              if (confirm("Revogar este link?")) revokeMut.mutate(inv.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
