import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  APP_ROUTES,
  MOCK_PROFILE,
  MOCK_ROUTE_PERMISSIONS,
  MOCK_USER_ROLES,
} from "./mock-data";
import type { Profile, RoleName, RoutePermission } from "./types";

interface AppState {
  profile: Profile;
  activeRoles: RoleName[];
  setActiveRoles: (roles: RoleName[]) => void;
  routePermissions: RoutePermission[];
  setRoutePermissions: (rp: RoutePermission[]) => void;
  canAccess: (path: string) => boolean;
  visibleRoutes: typeof APP_ROUTES;
  isAdmin: boolean;
}

const AppCtx = createContext<AppState | null>(null);

const LS_ROLES = "ubuntu.activeRoles";
const LS_PERMS = "ubuntu.routePerms";

function load<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeRoles, setActiveRolesState] = useState<RoleName[]>(
    MOCK_USER_ROLES.map((r) => r.role_name),
  );
  const [routePermissions, setRoutePermissionsState] =
    useState<RoutePermission[]>(MOCK_ROUTE_PERMISSIONS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setActiveRolesState(load(LS_ROLES, MOCK_USER_ROLES.map((r) => r.role_name)));
    setRoutePermissionsState(load(LS_PERMS, MOCK_ROUTE_PERMISSIONS));
    setHydrated(true);
  }, []);

  const persist = <T,>(k: string, v: T) => {
    if (typeof window !== "undefined") window.localStorage.setItem(k, JSON.stringify(v));
  };

  const setActiveRoles = (r: RoleName[]) => {
    setActiveRolesState(r);
    persist(LS_ROLES, r);
  };
  const setRoutePermissions = (rp: RoutePermission[]) => {
    setRoutePermissionsState(rp);
    persist(LS_PERMS, rp);
  };

  const canAccess = (path: string) =>
    activeRoles.some((role) =>
      routePermissions.some(
        (p) => p.role_name === role && p.route_path === path && p.is_granted,
      ),
    );

  const visibleRoutes = useMemo(
    () => APP_ROUTES.filter((r) => canAccess(r.path)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeRoles, routePermissions],
  );

  const value: AppState = {
    profile: MOCK_PROFILE,
    activeRoles,
    setActiveRoles,
    routePermissions,
    setRoutePermissions,
    canAccess,
    visibleRoutes,
    isAdmin: activeRoles.includes("Admin"),
  };

  if (!hydrated) return null;
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const v = useContext(AppCtx);
  if (!v) throw new Error("useApp must be used within AppProvider");
  return v;
}
