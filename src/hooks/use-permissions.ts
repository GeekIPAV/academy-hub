import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listPermissions, togglePermission } from "@/lib/permissions.functions";
import { useAuth } from "@/hooks/use-auth";

export type PermissionTipo = "rota" | "componente";

export interface PermissionRow {
  id: string;
  role_name: string;
  resource_id: string;
  tipo: PermissionTipo;
}

const QK = ["permissions"] as const;

export function usePermissions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const list = useServerFn(listPermissions);
  const toggleFn = useServerFn(togglePermission);

  const query = useQuery({
    queryKey: QK,
    queryFn: () => list(),
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const permissions: PermissionRow[] = Array.isArray(query.data)
    ? (query.data as PermissionRow[])
    : [];

  const isAllowed = (role: string, resourceId: string, tipo: PermissionTipo) =>
    permissions.some(
      (p) => p.role_name === role && p.resource_id === resourceId && p.tipo === tipo,
    );

  const mutation = useMutation({
    mutationFn: (vars: {
      role_name: string;
      resource_id: string;
      tipo: PermissionTipo;
      is_allowed: boolean;
    }) => toggleFn({ data: vars }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: QK });
      const prev = qc.getQueryData<PermissionRow[]>(QK) ?? [];
      const next = vars.is_allowed
        ? [
            ...prev.filter(
              (p) =>
                !(
                  p.role_name === vars.role_name &&
                  p.resource_id === vars.resource_id &&
                  p.tipo === vars.tipo
                ),
            ),
            {
              id: `optimistic-${Date.now()}`,
              role_name: vars.role_name,
              resource_id: vars.resource_id,
              tipo: vars.tipo,
            },
          ]
        : prev.filter(
            (p) =>
              !(
                p.role_name === vars.role_name &&
                p.resource_id === vars.resource_id &&
                p.tipo === vars.tipo
              ),
          );
      qc.setQueryData(QK, next);
      return { prev };
    },
    onError: (err: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK, ctx.prev);
      toast.error(err.message);
    },
    onSuccess: () => {
      toast.success("Permissão atualizada");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QK });
    },
  });

  const toggle = (
    role: string,
    resourceId: string,
    tipo: PermissionTipo,
    isAllowed: boolean,
  ) =>
    mutation.mutate({
      role_name: role,
      resource_id: resourceId,
      tipo,
      is_allowed: isAllowed,
    });

  return {
    permissions,
    isAllowed,
    toggle,
    isLoading: query.isLoading,
  };
}
