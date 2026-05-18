import { createContext, useContext, useMemo, type ReactNode } from "react";
import { APP_ROUTES } from "./mock-data";
import type { RoleName } from "./types";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentProfile, type CurrentProfile } from "@/hooks/use-current-profile";

interface AppState {
  profile: CurrentProfile | null;
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

  const activeRoles: RoleName[] = role ? [role] : [];
  const isAdmin = role === "Admin";

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
