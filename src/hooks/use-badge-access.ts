import { useUserBadges } from "@/hooks/use-badges";
import { useAuth } from "@/hooks/use-auth";
import { slugifyCluster } from "@/lib/cluster-utils";

/**
 * Returns currently-valid badges (not expired). A badge with `expires_at = null`
 * is considered valid forever.
 */
function useValidBadges() {
  const { user } = useAuth();
  const { data } = useUserBadges(user?.id);
  const now = Date.now();
  return (data ?? []).filter((b) => {
    const exp = (b as { expires_at?: string | null }).expires_at;
    if (!exp) return true;
    return new Date(exp).getTime() > now;
  });
}

/** Returns the set of cluster IDs the user has a valid badge for. */
export function useUserBadgeClusterIds() {
  const badges = useValidBadges();
  return new Set<string>(
    badges.map((b) => (b as { cluster_id?: string }).cluster_id ?? "").filter(Boolean),
  );
}

/** Returns the set of cluster slugs (from cluster name) the user has a valid badge for. */
export function useUserBadgeClusterSlugs() {
  const badges = useValidBadges();
  return new Set<string>(
    badges.map((b) => slugifyCluster(b.cluster ?? "")).filter(Boolean),
  );
}

export function useHasBadgeForCluster(clusterName: string | null | undefined) {
  const slugs = useUserBadgeClusterSlugs();
  if (!clusterName) return true;
  return slugs.has(slugifyCluster(clusterName));
}

export function useHasBadgeForClusterId(clusterId: string | null | undefined) {
  const ids = useUserBadgeClusterIds();
  if (!clusterId) return true;
  return ids.has(clusterId);
}
