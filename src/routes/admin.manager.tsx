import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { useApp } from "@/lib/app-context";
import { ALL_ROLES, ALL_WIDGETS, APP_ROUTES } from "@/lib/mock-data";
import type { DashboardTemplate, RoleName } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/manager")({
  head: () => ({ meta: [{ title: "Central de Comando — Admin" }] }),
  component: AdminManagerPage,
});

function AdminManagerPage() {
  const { isAdmin } = useApp();
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Central de Comando</h1>
        <p className="text-sm text-muted-foreground">
          Configure acessos e templates de dashboard por role.
        </p>
      </div>
      <Tabs defaultValue="access" className="space-y-4">
        <TabsList>
          <TabsTrigger value="access">Acessos</TabsTrigger>
          <TabsTrigger value="dashboards">Templates de Dashboard</TabsTrigger>
        </TabsList>
        <TabsContent value="access">
          <AccessTab />
        </TabsContent>
        <TabsContent value="dashboards">
          <DashboardsTab />
        </TabsContent>
      </Tabs>
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

function DashboardsTab() {
  const { dashboardTemplates, setDashboardTemplates } = useApp();
  const [role, setRole] = useState<RoleName>("Formando");

  const enabled = dashboardTemplates
    .filter((t) => t.role_name === role)
    .sort((a, b) => a.position - b.position);
  const enabledIds = enabled.map((t) => t.widget_id);
  const disabled = ALL_WIDGETS.filter((w) => !enabledIds.includes(w.id));

  const updateForRole = (newEnabledIds: string[]) => {
    const others = dashboardTemplates.filter((t) => t.role_name !== role);
    const next: DashboardTemplate[] = [
      ...others,
      ...newEnabledIds.map((id, i) => ({
        role_name: role,
        widget_id: id,
        position: i,
      })),
    ];
    setDashboardTemplates(next);
  };

  const toggleWidget = (id: string, on: boolean) => {
    if (on) updateForRole([...enabledIds, id]);
    else updateForRole(enabledIds.filter((x) => x !== id));
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = enabledIds.indexOf(String(active.id));
    const newIdx = enabledIds.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    updateForRole(arrayMove(enabledIds, oldIdx, newIdx));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Role</CardTitle>
          <CardDescription>Configure o template base do dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={role} onValueChange={(v) => setRole(v as RoleName)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium">Widgets disponíveis</p>
            {disabled.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Todos os widgets já estão ativos para este role.
              </p>
            )}
            {disabled.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{w.label}</p>
                  <p className="text-xs text-muted-foreground">{w.description}</p>
                </div>
                <Switch
                  checked={false}
                  onCheckedChange={(v) => toggleWidget(w.id, v)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ordem do Dashboard — {role}</CardTitle>
          <CardDescription>Arraste para definir a ordem base.</CardDescription>
        </CardHeader>
        <CardContent>
          {enabled.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum widget ativo para este role.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={enabledIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {enabled.map((t, i) => {
                    const w = ALL_WIDGETS.find((x) => x.id === t.widget_id);
                    if (!w) return null;
                    return (
                      <SortableRow
                        key={t.widget_id}
                        id={t.widget_id}
                        index={i}
                        label={w.label}
                        description={w.description}
                        onRemove={() => toggleWidget(t.widget_id, false)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SortableRow({
  id,
  index,
  label,
  description,
  onRemove,
}: {
  id: string;
  index: number;
  label: string;
  description: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border bg-card p-3"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Badge variant="outline">{index + 1}</Badge>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked onCheckedChange={() => onRemove()} />
    </div>
  );
}
