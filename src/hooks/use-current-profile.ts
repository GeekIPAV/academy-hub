import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface CurrentProfile {
  id: string;
  full_name: string | null;
  role: string | null;
}

export function useCurrentProfile() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ["current-profile", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<CurrentProfile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("utilizadores")
        .select("id, full_name, role")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as CurrentProfile | null;
    },
  });

  return {
    profile: query.data ?? null,
    role: query.data?.role ?? null,
    isLoading: authLoading || (!!userId && query.isLoading),
  };
}
