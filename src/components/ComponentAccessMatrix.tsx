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
import { usePermissions } from "@/hooks/use-permissions";

interface Props {
  pagePath: string;
}

/**
 * Matriz de acessos por componente, visível apenas a admins.
 * Permite ligar/desligar a visibilidade de cada componente da página por role.
 */
export function ComponentAccessMatrix({ pagePath }: Props) {
  const { isAdmin } = useApp();
  const { activeRoleNames } = useRoles();
  const { isAllowed, toggle } = usePermissions();
  const [open, setOpen] = useState(false);

  if (!isAdmin) return null;

  const components = PAGE_COMPONENTS[pagePath] ?? [];
  if (components.length === 0) return null;

  const resourceFor = (componentId: string) => `${pagePath}#${componentId}`;

  return (
    <Card className="border-dashed">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-6 py-3 text-left">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Matriz de Acessos (componentes)</div>
              <div className="text-xs text-muted-foreground">
                Apenas visível para administradores. Define que componentes desta página são visíveis a cada perfil.
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
                  {activeRoleNames.map((r: string) => (
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
                    {activeRoleNames.map((role) => {
                      const checked = isAllowed(role, resourceFor(c.id), "componente");
                      return (
                        <TableCell key={role} className="text-center">
                          <Switch
                            checked={checked}
                            onCheckedChange={(v) =>
                              toggle(role, resourceFor(c.id), "componente", v)
                            }
                          />
                        </TableCell>
                      );
                    })}
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
