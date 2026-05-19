import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAppRoutes, type AppRoute } from "./access-registry";
import type { RoleName } from "./types";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile, type CurrentProfile } from "@/hooks/use-current-profile";

const LS_IMPERSONATE = "appalu:impersonate-role";

interface AppState {
  profile: CurrentProfile | null;
  realRoles: RoleName[];
  isRealAdmin: boolean;
  impersonatedRole: RoleName | null;
  setImpersonatedRole: (role: RoleName | null) => void;
  /** When impersonating, this is the single simulated role; otherwise all real roles */
  activeRoles: RoleName[];
  /** Backward-compat: first active role */
  realRole: RoleName | null;
  canAccess: (path: string) => boolean;
  isComponentVisible: (pagePath: string, componentId: string) => boolean;
  visibleRoutes: AppRoute[];
  isAdmin: boolean;
}

const AppCtx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { isAllowed } = usePermissions();
  const { profile, roles } = useCurrentProfile();

  const realRoles: RoleName[] = roles as RoleName[];
  const isRealAdmin = realRoles.includes("Admin" as RoleName);
  const realRole: RoleName | null = realRoles[0] ?? null;

  const [impersonatedRole, setImpersonatedRoleState] = useState<RoleName | null>(() => {
    if (typeof window === "undefined") return null;
    return (window.localStorage.getItem(LS_IMPERSONATE) as RoleName | null) || null;
  });

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

  const activeRoles: RoleName[] =
    isRealAdmin && impersonatedRole ? [impersonatedRole] : realRoles;
  const isAdmin = activeRoles.includes("Admin" as RoleName);

  const activeRolesKey = activeRoles.join("|");

  const canAccess = useCallback(
    (path: string) => {
      if (isAdmin) return true;
      return activeRoles.some((r) => isAllowed(r, path, "rota"));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeRolesKey, isAdmin, isAllowed],
  );

  const isComponentVisible = useCallback(
    (pagePath: string, componentId: string) => {
      if (isAdmin) return true;
      const resourceId = `${pagePath}#${componentId}`;
      return activeRoles.some((r) => isAllowed(r, resourceId, "componente"));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeRolesKey, isAdmin, isAllowed],
  );

  const visibleRoutes = useMemo(
    () => APP_ROUTES.filter((r) => canAccess(r.path)),
    [canAccess],
  );

  const value: AppState = {
    profile,
    realRoles,
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
