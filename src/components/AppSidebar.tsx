import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, User, GraduationCap, Shield, ListChecks, LogIn, LogOut, BookMarked } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/hooks/use-auth";
import { useIsFormando } from "@/hooks/use-is-formando";
import { Button } from "@/components/ui/button";
import { ALL_ROLES } from "@/lib/mock-data";
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
import { Checkbox } from "@/components/ui/checkbox";
import type { RoleName } from "@/lib/types";

const ICONS: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/profile": User,
  "/training": GraduationCap,
  "/actions": ListChecks,
  "/recursos": BookMarked,
  "/admin/manager": Shield,
};

export function AppSidebar() {
  const { visibleRoutes, profile, activeRoles, setActiveRoles } = useApp();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isFormando = useIsFormando();

  const toggleRole = (r: RoleName) => {
    const next = activeRoles.includes(r)
      ? activeRoles.filter((x) => x !== r)
      : [...activeRoles, r];
    setActiveRoles(next.length ? next : [r]);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            U
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Academia Ubuntu</span>
            <span className="text-xs text-muted-foreground">Líderes</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleRoutes.map((r) => {
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Simular Roles (mock)</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-2 px-2 py-1">
            {ALL_ROLES.map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={activeRoles.includes(r)}
                  onCheckedChange={() => toggleRole(r)}
                />
                <span>{r}</span>
              </label>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-2 p-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {(user?.email ?? profile.full_name)
              .split(/[\s@.]/)
              .filter(Boolean)
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="flex-1 leading-tight overflow-hidden">
            <p className="truncate text-sm font-medium">
              {user?.email ?? profile.full_name}
            </p>
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
            <Button
              variant="ghost"
              size="icon"
              title="Entrar"
              onClick={() => navigate({ to: "/auth" })}
            >
              <LogIn className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
