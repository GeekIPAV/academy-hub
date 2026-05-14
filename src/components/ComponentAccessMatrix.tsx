import { useState } from "react";
import { ChevronDown, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/lib/app-context";
import { ALL_ROLES, PAGE_COMPONENTS } from "@/lib/mock-data";
import type { RoleName } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  pagePath: string;
}

/**
 * Matriz de acessos por componente, visível apenas a admins.
 * Permite ligar/desligar a visibilidade de cada componente da página por role.
 */
export function ComponentAccessMatrix({ pagePath }: Props) {
  const { isAdmin, componentPermissions, setComponentPermissions } = useApp();
  if (!isAdmin) return null;

  const components = PAGE_COMPONENTS[pagePath] ?? [];
  if (components.length === 0) return null;

  const isGranted = (role: RoleName, componentId: string) =>
    componentPermissions.some(
      (p) =>
        p.role_name === role &&
        p.page_path === pagePath &&
        p.component_id === componentId &&
        p.is_granted,
    );

  const toggle = (role: RoleName, componentId: string) => {
    const exists = componentPermissions.find(
      (p) =>
        p.role_name === role &&
        p.page_path === pagePath &&
        p.component_id === componentId,
    );
    let next;
    if (exists) {
      next = componentPermissions.map((p) =>
        p.role_name === role &&
        p.page_path === pagePath &&
        p.component_id === componentId
          ? { ...p, is_granted: !p.is_granted }
          : p,
      );
    } else {
      next = [
        ...componentPermissions,
        { role_name: role, page_path: pagePath, component_id: componentId, is_granted: true },
      ];
    }
    setComponentPermissions(next);
    toast.success("Visibilidade atualizada");
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Matriz de Acessos (componentes)</CardTitle>
        <CardDescription>
          Apenas visível para administradores. Define que componentes desta página são visíveis a cada role.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Componente</TableHead>
              {ALL_ROLES.map((r) => (
                <TableHead key={r} className="text-center">
                  {r}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.id}</div>
                </TableCell>
                {ALL_ROLES.map((role) => (
                  <TableCell key={role} className="text-center">
                    <Switch
                      checked={isGranted(role, c.id)}
                      onCheckedChange={() => toggle(role, c.id)}
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
