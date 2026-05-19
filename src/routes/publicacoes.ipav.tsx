import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/publicacoes/ipav")({
  head: () => ({ meta: [{ title: "Publicações IPAV" }] }),
  component: () => (
    <PlaceholderPage
      title="Publicações IPAV"
      description="Publicações do Instituto Padre António Vieira."
    />
  ),
});
