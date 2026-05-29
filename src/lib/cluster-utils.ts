export const slugifyCluster = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export interface ClusterDisplay {
  name: string;
  slug: string;
  title: string;
  subtitle: string | null;
}

export function parseCluster(name: string): ClusterDisplay {
  const parts = name.split(/\s+-\s+/);
  return {
    name,
    slug: slugifyCluster(name),
    title: parts[0]?.trim() || name,
    subtitle: parts.length > 1 ? parts.slice(1).join(" - ").trim() : null,
  };
}

export const CLUSTER_COMPONENT_PREFIX = "cluster:";
export const clusterComponentId = (slug: string) => `${CLUSTER_COMPONENT_PREFIX}${slug}`;
