import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Shield, Trash2 } from "lucide-react";
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
      <UsersManager />
      <RolesManager />
      {visible("route-matrix") && <AccessTab />}
    </div>
  );
}

function UsersManager() {
  const { users, isLoading, updateRole } = useUsers();
  const { roles } = useRoles();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const activeRoles = roles.filter((r) => r.is_active);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utilizadores</CardTitle>
        <CardDescription>
          Atribui um perfil de acesso a cada utilizador. As alterações são imediatas.
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
                <TableHead className="w-[200px]">Perfil de Acesso</TableHead>
                <TableHead className="w-[140px]">Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.full_name || "—"}
                      {isSelf && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          tu
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.email || "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role ?? undefined}
                        onValueChange={(value) =>
                          updateRole.mutate({ userId: u.id, role: value })
                        }
                        disabled={isSelf}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {activeRoles.map((r) => (
                            <SelectItem key={r.id} value={r.name}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
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
