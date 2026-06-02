import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  assignRole,
  deleteUser,
  listUsers,
  removeRole,
  setUserActive,
} from "@/lib/users.functions";

export interface UserRow {
  id: string;
  full_name: string | null;
  email: string;
  roles: string[];
  created_at: string | null;
  is_active: boolean;
}

export function useUsers() {
  const qc = useQueryClient();
  const listFn = useServerFn(listUsers);
  const assignFn = useServerFn(assignRole);
  const removeFn = useServerFn(removeRole);

  const query = useQuery({
    queryKey: ["users"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  const optimisticToggle = (userId: string, role: string, add: boolean) => {
    qc.setQueryData<UserRow[]>(["users"], (old) =>
      (old ?? []).map((u) => {
        if (u.id !== userId) return u;
        const set = new Set(u.roles);
        if (add) set.add(role);
        else set.delete(role);
        return { ...u, roles: [...set].sort() };
      }),
    );
  };

  const assign = useMutation({
    mutationFn: (vars: { userId: string; role: string }) =>
      assignFn({ data: vars }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["users"] });
      const prev = qc.getQueryData<UserRow[]>(["users"]);
      optimisticToggle(vars.userId, vars.role, true);
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["users"], ctx.prev);
      toast.error(err instanceof Error ? err.message : "Erro ao atribuir perfil");
    },
    onSuccess: () => toast.success("Perfil atribuído."),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["current-profile"] });
    },
  });

  const remove = useMutation({
    mutationFn: (vars: { userId: string; role: string }) =>
      removeFn({ data: vars }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["users"] });
      const prev = qc.getQueryData<UserRow[]>(["users"]);
      optimisticToggle(vars.userId, vars.role, false);
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["users"], ctx.prev);
      toast.error(err instanceof Error ? err.message : "Erro ao remover perfil");
    },
    onSuccess: () => toast.success("Perfil removido."),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["current-profile"] });
    },
  });

  return {
    ...query,
    users: (query.data ?? []) as UserRow[],
    assign,
    remove,
  };
}
