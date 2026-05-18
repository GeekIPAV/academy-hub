import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { APP_ROUTES, MOCK_PROFILE, MOCK_USER_ROLES } from "./mock-data";
import type { Profile, RoleName } from "./types";
import { usePermissions } from "@/hooks/use-permissions";

interface AppState {
  profile: Profile;
  assignedRoles: RoleName[];
  activeRoles: RoleName[];
  setActiveRoles: (roles: RoleName[]) => void;
  canAccess: (path: string) => boolean;
  isComponentVisible: (pagePath: string, componentId: string) => boolean;
  visibleRoutes: typeof APP_ROUTES;
  isAdmin: boolean;
}

const AppCtx = createContext<AppState | null>(null);

const LS_ROLES = "ubuntu.activeRoles";

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
  const [hydrated, setHydrated] = useState(false);
  const { isAllowed } = usePermissions();

  useEffect(() => {
    setActiveRolesState(load(LS_ROLES, MOCK_USER_ROLES.map((r) => r.role_name)));
    setHydrated(true);
  }, []);

  const setActiveRoles = (r: RoleName[]) => {
    setActiveRolesState(r);
    if (typeof window !== "undefined")
      window.localStorage.setItem(LS_ROLES, JSON.stringify(r));
  };

  const canAccess = (path: string) =>
    activeRoles.some((role) => isAllowed(role, path, "rota"));

  const isAdmin = activeRoles.includes("Admin");

  const isComponentVisible = (pagePath: string, componentId: string) => {
    // Admin vê sempre tudo (escape hatch para reativar componentes ocultos).
    if (isAdmin) return true;
    const resourceId = `${pagePath}#${componentId}`;
    return activeRoles.some((role) => isAllowed(role, resourceId, "componente"));
  };

  const visibleRoutes = useMemo(
    () => APP_ROUTES.filter((r) => canAccess(r.path)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeRoles, isAllowed],
  );

  const value: AppState = {
    profile: MOCK_PROFILE,
    assignedRoles: MOCK_USER_ROLES.map((r) => r.role_name),
    activeRoles,
    setActiveRoles,
    canAccess,
    isComponentVisible,
    visibleRoutes,
    isAdmin,
  };

  if (!hydrated) return null;
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const v = useContext(AppCtx);
  if (!v) throw new Error("useApp must be used within AppProvider");
  return v;
}
