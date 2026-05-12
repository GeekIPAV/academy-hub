import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ALL_WIDGETS,
  APP_ROUTES,
  MOCK_DASHBOARD_TEMPLATES,
  MOCK_PROFILE,
  MOCK_ROUTE_PERMISSIONS,
  MOCK_USER_ROLES,
} from "./mock-data";
import type { DashboardTemplate, Profile, RoleName, RoutePermission } from "./types";

interface AppState {
  profile: Profile;
  activeRoles: RoleName[];
  setActiveRoles: (roles: RoleName[]) => void;
  routePermissions: RoutePermission[];
  setRoutePermissions: (rp: RoutePermission[]) => void;
  dashboardTemplates: DashboardTemplate[];
  setDashboardTemplates: (dt: DashboardTemplate[]) => void;
  userWidgetOrder: string[];
  setUserWidgetOrder: (ids: string[]) => void;
  canAccess: (path: string) => boolean;
  visibleRoutes: typeof APP_ROUTES;
  isAdmin: boolean;
}

const AppCtx = createContext<AppState | null>(null);

const LS_ROLES = "ubuntu.activeRoles";
const LS_ORDER = "ubuntu.widgetOrder";
const LS_PERMS = "ubuntu.routePerms";
const LS_TPL = "ubuntu.dashTemplates";

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
  const [dashboardTemplates, setDashboardTemplatesState] =
    useState<DashboardTemplate[]>(MOCK_DASHBOARD_TEMPLATES);
  const [userWidgetOrder, setUserWidgetOrderState] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setActiveRolesState(load(LS_ROLES, MOCK_USER_ROLES.map((r) => r.role_name)));
    setRoutePermissionsState(load(LS_PERMS, MOCK_ROUTE_PERMISSIONS));
    setDashboardTemplatesState(load(LS_TPL, MOCK_DASHBOARD_TEMPLATES));
    setUserWidgetOrderState(load<string[]>(LS_ORDER, []));
    setHydrated(true);
  }, []);

  const persist = <T,>(k: string, v: T) => {
    if (typeof window !== "undefined") window.localStorage.setItem(k, JSON.stringify(v));
  };

  const setActiveRoles = (r: RoleName[]) => {
    setActiveRolesState(r);
    persist(LS_ROLES, r);
    // reset order when roles change
    setUserWidgetOrderState([]);
    persist(LS_ORDER, []);
  };
  const setRoutePermissions = (rp: RoutePermission[]) => {
    setRoutePermissionsState(rp);
    persist(LS_PERMS, rp);
  };
  const setDashboardTemplates = (dt: DashboardTemplate[]) => {
    setDashboardTemplatesState(dt);
    persist(LS_TPL, dt);
  };
  const setUserWidgetOrder = (ids: string[]) => {
    setUserWidgetOrderState(ids);
    persist(LS_ORDER, ids);
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
    dashboardTemplates,
    setDashboardTemplates,
    userWidgetOrder,
    setUserWidgetOrder,
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

export function useResolvedWidgets() {
  const { activeRoles, dashboardTemplates, userWidgetOrder } = useApp();
  return useMemo(() => {
    // cumulative across roles, preserving lowest position
    const map = new Map<string, number>();
    for (const t of dashboardTemplates) {
      if (!activeRoles.includes(t.role_name)) continue;
      const existing = map.get(t.widget_id);
      if (existing === undefined || t.position < existing) map.set(t.widget_id, t.position);
    }
    const baseOrdered = [...map.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([id]) => id)
      .filter((id) => ALL_WIDGETS.some((w) => w.id === id));

    // apply user override order on top, drop unknowns, append new
    const known = new Set(baseOrdered);
    const userValid = userWidgetOrder.filter((id) => known.has(id));
    const remaining = baseOrdered.filter((id) => !userValid.includes(id));
    return [...userValid, ...remaining];
  }, [activeRoles, dashboardTemplates, userWidgetOrder]);
}
