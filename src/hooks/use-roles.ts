import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRoles } from "@/lib/roles.functions";
import { ALL_ROLES } from "@/lib/mock-data";

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export function useRoles() {
  const fetcher = useServerFn(listRoles);
  const query = useQuery({
    queryKey: ["roles"],
    queryFn: () => fetcher(),
    staleTime: 30_000,
  });

  const roles = (query.data ?? []) as RoleRow[];
  const activeRoleNames =
    roles.length > 0
      ? roles.filter((r) => r.is_active).map((r) => r.name)
      : ALL_ROLES;

  return { ...query, roles, activeRoleNames };
}
