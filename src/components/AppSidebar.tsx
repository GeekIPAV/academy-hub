import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Shield, ListChecks, LogIn, LogOut, BookMarked, Building2, Eye, FolderCog } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/hooks/use-auth";
import { useIsFormando } from "@/hooks/use-is-formando";
import { useRoles } from "@/hooks/use-roles";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ICONS: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/actions": ListChecks,
  "/recursos": BookMarked,
  "/admin/recursos": FolderCog,
  "/admin/programas": Shield,
  "/entidade/dashboard": Building2,
  "/admin/manager": Shield,
};

export function AppSidebar() {
  const { visibleRoutes, profile, activeRoles, isRealAdmin, impersonatedRole, setImpersonatedRole, realRole } = useApp();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isFormando = useIsFormando();
  const { activeRoleNames } = useRoles();

  const displayName = profile?.full_name ?? user?.email ?? "";
  const initials = displayName
    .split(/[\s@.]/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            U
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Academia de Líderes Ubuntu</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleRoutes
                .filter((r) => r.path !== "/admin/manager")
                .map((r) => {
                  const Icon = ICONS[r.path] ?? LayoutDashboard;
                  const active = path === r.path || path.startsWith(r.path + "/");
                  return (
                    <SidebarMenuItem key={r.path}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={r.path}>
                          <Icon className="h-4 w-4" />
                          <span>{r.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              {isFormando && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path === "/recursos"}>
                    <Link to="/recursos">
                      <BookMarked className="h-4 w-4" />
                      <span>Centro de Recursos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {visibleRoutes
                .filter((r) => r.path === "/admin/manager")
                .map((r) => {
                  const Icon = ICONS[r.path] ?? LayoutDashboard;
                  const active = path === r.path || path.startsWith(r.path + "/");
                  return (
                    <SidebarMenuItem key={r.path}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={r.path}>
                          <Icon className="h-4 w-4" />
                          <span>{r.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isRealAdmin && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> Ver como
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <Select
                value={impersonatedRole ?? "__self"}
                onValueChange={(v) => setImpersonatedRole(v === "__self" ? null : v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Eu mesmo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__self">Eu mesmo ({realRole ?? "—"})</SelectItem>
                  {activeRoleNames
                    .filter((r) => r !== realRole)
                    .map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {impersonatedRole && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  A pré-visualizar como <strong>{impersonatedRole}</strong>
                </p>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-2 p-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {initials || "?"}
          </div>
          <div className="flex-1 leading-tight overflow-hidden">
            <p className="truncate text-sm font-medium">{displayName || "—"}</p>
            <div className="flex flex-wrap gap-1">
              {activeRoles.map((r) => (
                <Badge key={r} variant="secondary" className="text-[10px]">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
          {user ? (
            <Button
              variant="ghost"
              size="icon"
              title="Sair"
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" title="Entrar" onClick={() => navigate({ to: "/auth" })}>
              <LogIn className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
