import { useUserBadges } from "@/hooks/use-badges";
import { useAuth } from "@/hooks/use-auth";
import { slugifyCluster } from "@/lib/cluster-utils";

/** Returns the set of cluster slugs the user has earned a badge for. */
export function useUserBadgeClusterSlugs() {
  const { user } = useAuth();
  const { data } = useUserBadges(user?.id);
  const slugs = new Set<string>(
    (data ?? []).map((b) => slugifyCluster(b.cluster ?? "")).filter(Boolean),
  );
  return slugs;
}

export function useHasBadgeForCluster(clusterName: string | null | undefined) {
  const slugs = useUserBadgeClusterSlugs();
  if (!clusterName) return true;
  return slugs.has(slugifyCluster(clusterName));
}
