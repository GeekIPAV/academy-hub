import { useState, useSyncExternalStore } from "react";
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
import {
  getRegisteredComponents,
  subscribeRegistry,
} from "@/lib/component-registry";
import { useRoles } from "@/hooks/use-roles";
import { usePermissions } from "@/hooks/use-permissions";
import type { PageComponent } from "@/lib/types";

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

  // Re-render when new components register at runtime.
  useSyncExternalStore(
    subscribeRegistry,
    () => getRegisteredComponents(pagePath).length,
    () => 0,
  );

  if (!isAdmin) return null;

  const declared = PAGE_COMPONENTS[pagePath] ?? [];
  const observed = getRegisteredComponents(pagePath);
  const byId = new Map<string, PageComponent>();
  for (const c of [...declared, ...observed]) {
    if (!byId.has(c.id)) byId.set(c.id, c);
  }
  const components = Array.from(byId.values());


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
            {components.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Esta página ainda não tem componentes registados na matriz. O
                acesso é controlado pela <strong>Matriz de Rotas</strong> na
                Central de Comando. Para granularidade por componente,
                adiciona-o em <code>PAGE_COMPONENTS</code> (<code>src/lib/mock-data.ts</code>).
              </p>
            ) : (
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
                      {activeRoleNames.map((role: string) => {
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
            )}
          </CardContent>
        </CollapsibleContent>

      </Collapsible>
    </Card>
  );
}
