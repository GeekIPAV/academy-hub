import { useMemo } from "react";
import { useRouter } from "@tanstack/react-router";
import { PAGE_COMPONENTS } from "./mock-data";

/**
 * Dynamic source of truth for the access matrix.
 * Routes are derived from the TanStack route tree (regenerated on every
 * file create/delete under src/routes/), so the matrix auto-syncs.
 */

const ROUTE_LABEL_OVERRIDES: Record<string, string> = {
  "/": "Início",
  "/dashboard": "Dashboard",
  "/actions": "Eventos e Formações",
  "/entidade/dashboard": "Painel da Entidade",
  "/admin/manager": "Central de Comando",
  "/admin/programas": "Gestão de Programas",
  "/admin/acoes": "Gestão de Ações",
  "/recursos": "Recursos",
  "/admin/recursos": "Gestão de Recursos",
  "/profile": "Perfil",
  "/dados-certificacao": "Dados de Certificação",
};

// Routes excluded from the access matrix (always accessible or non-page).
const EXCLUDED_PATHS = new Set<string>(["/auth", "/"]);

function humanize(path: string): string {
  if (ROUTE_LABEL_OVERRIDES[path]) return ROUTE_LABEL_OVERRIDES[path];
  const seg = path
    .split("/")
    .filter(Boolean)
    .map((s) =>
      s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    )
    .join(" / ");
  return seg || path;
}

export interface AppRoute {
  path: string;
  label: string;
}

export function useAppRoutes(): AppRoute[] {
  const router = useRouter();
  return useMemo(() => {
    const flat =
      (router.flatRoutes as Array<{ fullPath?: string; id?: string }>) ?? [];
    const seen = new Set<string>();
    const out: AppRoute[] = [];
    for (const r of flat) {
      const path = r.fullPath ?? "";
      if (!path) continue;
      if (path.startsWith("/api")) continue; // server / public APIs
      if (path.includes("$")) continue; // dynamic param routes
      if (EXCLUDED_PATHS.has(path)) continue;
      if (seen.has(path)) continue;
      seen.add(path);
      out.push({ path, label: humanize(path) });
    }
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }, [router]);
}

/** Collect every resource id currently declared by the app (routes + components). */
export function collectValidResourceIds(routes: AppRoute[]) {
  const validRouteIds = routes.map((r) => r.path);
  const validComponentIds: string[] = [];
  for (const [pagePath, comps] of Object.entries(PAGE_COMPONENTS)) {
    for (const c of comps) validComponentIds.push(`${pagePath}#${c.id}`);
  }
  return { validRouteIds, validComponentIds };
}
