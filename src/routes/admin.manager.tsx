import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/lib/app-context";
import { ALL_ROLES, APP_ROUTES } from "@/lib/mock-data";
import type { RoleName } from "@/lib/types";
import { toast } from "sonner";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";

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
      {visible("header") && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Central de Comando</h1>
          <p className="text-sm text-muted-foreground">Configure acessos por role.</p>
        </div>
      )}
      {visible("route-matrix") && <AccessTab />}
      <ComponentAccessMatrix pagePath="/admin/manager" />
    </div>
  );
}

function AccessTab() {
  const { routePermissions, setRoutePermissions } = useApp();

  const isGranted = (role: RoleName, path: string) =>
    routePermissions.some(
      (p) => p.role_name === role && p.route_path === path && p.is_granted,
    );

  const toggle = (role: RoleName, path: string) => {
    const exists = routePermissions.find(
      (p) => p.role_name === role && p.route_path === path,
    );
    let next;
    if (exists) {
      next = routePermissions.map((p) =>
        p.role_name === role && p.route_path === path
          ? { ...p, is_granted: !p.is_granted }
          : p,
      );
    } else {
      next = [...routePermissions, { role_name: role, route_path: path, is_granted: true }];
    }
    setRoutePermissions(next);
    toast.success("Permissão atualizada");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matriz de Acessos</CardTitle>
        <CardDescription>
          Controle que rotas cada role pode aceder. Linhas: rotas. Colunas: roles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rota</TableHead>
              {ALL_ROLES.map((r) => (
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
                {ALL_ROLES.map((role) => (
                  <TableCell key={role} className="text-center">
                    <Switch
                      checked={isGranted(role, route.path)}
                      onCheckedChange={() => toggle(role, route.path)}
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
