import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface CurrentProfile {
  id: string;
  full_name: string | null;
  role: string | null; // primary role (for legacy compatibility)
  roles: string[];
}

export function useCurrentProfile() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ["current-profile", userId],
    enabled: !!userId,
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<CurrentProfile | null> => {
      if (!userId) return null;
      const [{ data: profile, error: pErr }, { data: roleRows, error: rErr }] =
        await Promise.all([
          supabase
            .from("utilizadores")
            .select("id, full_name, role")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("user_roles")
            .select("role_name")
            .eq("user_id", userId),
        ]);
      if (pErr) throw new Error(pErr.message);
      if (rErr) throw new Error(rErr.message);
      if (!profile) return null;
      const roles = (roleRows ?? []).map((r) => r.role_name).sort();
      return {
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role,
        roles,
      };
    },
  });

  return {
    profile: query.data ?? null,
    role: query.data?.role ?? null,
    roles: query.data?.roles ?? [],
    isLoading: authLoading || (!!userId && query.isLoading),
  };
}
