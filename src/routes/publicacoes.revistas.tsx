import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/publicacoes/revistas")({
  head: () => ({ meta: [{ title: "Revistas Científicas" }] }),
  component: () => (
    <PlaceholderPage
      title="Revistas Científicas"
      description="Artigos e revistas científicas."
    />
  ),
});
