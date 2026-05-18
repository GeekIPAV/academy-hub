import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { APP_ROUTES } from "./mock-data";
import type { RoleName } from "./types";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile, type CurrentProfile } from "@/hooks/use-current-profile";

const LS_IMPERSONATE = "appalu:impersonate-role";

interface AppState {
  profile: CurrentProfile | null;
  realRole: RoleName | null;
  isRealAdmin: boolean;
  impersonatedRole: RoleName | null;
  setImpersonatedRole: (role: RoleName | null) => void;
  activeRoles: RoleName[];
  canAccess: (path: string) => boolean;
  isComponentVisible: (pagePath: string, componentId: string) => boolean;
  visibleRoutes: typeof APP_ROUTES;
  isAdmin: boolean;
}

const AppCtx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { isAllowed } = usePermissions();
  const { profile, role } = useCurrentProfile();

  const realRole: RoleName | null = role;
  const isRealAdmin = realRole === "Admin";

  const [impersonatedRole, setImpersonatedRoleState] = useState<RoleName | null>(() => {
    if (typeof window === "undefined") return null;
    return (window.localStorage.getItem(LS_IMPERSONATE) as RoleName | null) || null;
  });

  // Only admins can impersonate; clear if non-admin
  useEffect(() => {
    if (!isRealAdmin && impersonatedRole) {
      setImpersonatedRoleState(null);
      window.localStorage.removeItem(LS_IMPERSONATE);
    }
  }, [isRealAdmin, impersonatedRole]);

  const setImpersonatedRole = (r: RoleName | null) => {
    setImpersonatedRoleState(r);
    if (typeof window !== "undefined") {
      if (r) window.localStorage.setItem(LS_IMPERSONATE, r);
      else window.localStorage.removeItem(LS_IMPERSONATE);
    }
  };

  const effectiveRole: RoleName | null =
    isRealAdmin && impersonatedRole ? impersonatedRole : realRole;
  const activeRoles: RoleName[] = effectiveRole ? [effectiveRole] : [];
  const isAdmin = effectiveRole === "Admin";

  const canAccess = (path: string) =>
    activeRoles.some((r) => isAllowed(r, path, "rota"));

  const isComponentVisible = (pagePath: string, componentId: string) => {
    if (isAdmin) return true;
    const resourceId = `${pagePath}#${componentId}`;
    return activeRoles.some((r) => isAllowed(r, resourceId, "componente"));
  };

  const visibleRoutes = useMemo(
    () => APP_ROUTES.filter((r) => canAccess(r.path)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeRoles.join("|"), isAllowed],
  );

  const value: AppState = {
    profile,
    realRole,
    isRealAdmin,
    impersonatedRole,
    setImpersonatedRole,
    activeRoles,
    canAccess,
    isComponentVisible,
    visibleRoutes,
    isAdmin,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const v = useContext(AppCtx);
  if (!v) throw new Error("useApp must be used within AppProvider");
  return v;
}
