import type { PageComponent } from "./types";

/**
 * Runtime registry of components observed via `isComponentVisible`.
 * Ensures every component used in a page automatically appears in the
 * access matrix, even if not declared in PAGE_COMPONENTS.
 */
type Registry = Map<string, Map<string, PageComponent>>;
const registry: Registry = new Map();
const listeners = new Set<() => void>();

function humanize(id: string) {
  return id
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function registerPageComponent(pagePath: string, id: string, label?: string) {
  let bucket = registry.get(pagePath);
  if (!bucket) {
    bucket = new Map();
    registry.set(pagePath, bucket);
  }
  if (bucket.has(id)) return;
  bucket.set(id, { id, label: label ?? humanize(id) });
  // Notify async to avoid setState-during-render warnings.
  queueMicrotask(() => listeners.forEach((l) => l()));
}

export function getRegisteredComponents(pagePath: string): PageComponent[] {
  return Array.from(registry.get(pagePath)?.values() ?? []);
}

export function subscribeRegistry(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
