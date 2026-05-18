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
import { PAGE_COMPONENTS } from "@/lib/mock-data";
import { useRoles } from "@/hooks/use-roles";
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
  const { activeRoleNames } = useRoles();
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

  const [open, setOpen] = useState(false);

  return (
    <Card className="border-dashed">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-6 py-3 text-left">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Matriz de Acessos (componentes)</div>
              <div className="text-xs text-muted-foreground">
                Apenas visível para administradores. Define que componentes desta página são visíveis a cada role.
              </div>
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Componente</TableHead>
                  {activeRoleNames.map((r) => (
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
                    {activeRoleNames.map((role) => (
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
