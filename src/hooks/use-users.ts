import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listUsers, updateUserRole } from "@/lib/users.functions";

export interface UserRow {
  id: string;
  full_name: string | null;
  email: string;
  role: string | null;
  created_at: string | null;
}

export function useUsers() {
  const qc = useQueryClient();
  const listFn = useServerFn(listUsers);
  const updateFn = useServerFn(updateUserRole);

  const query = useQuery({
    queryKey: ["users"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  const updateRole = useMutation({
    mutationFn: (vars: { userId: string; role: string }) =>
      updateFn({ data: vars }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["users"] });
      const prev = qc.getQueryData<UserRow[]>(["users"]);
      qc.setQueryData<UserRow[]>(["users"], (old) =>
        (old ?? []).map((u) =>
          u.id === vars.userId ? { ...u, role: vars.role } : u,
        ),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["users"], ctx.prev);
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar perfil");
    },
    onSuccess: () => {
      toast.success("Perfil atualizado.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return {
    ...query,
    users: (query.data ?? []) as UserRow[],
    updateRole,
  };
}
