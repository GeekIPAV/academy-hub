import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRoles } from "@/lib/roles.functions";
import { useAuth } from "@/hooks/use-auth";

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export function useRoles() {
  const { user } = useAuth();
  const fetcher = useServerFn(listRoles);
  const query = useQuery({
    queryKey: ["roles"],
    queryFn: () => fetcher(),
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const roles: RoleRow[] = Array.isArray(query.data) ? (query.data as RoleRow[]) : [];
  const activeRoleNames = roles.filter((r) => r.is_active).map((r) => r.name);

  return { ...query, roles, activeRoleNames };
}
