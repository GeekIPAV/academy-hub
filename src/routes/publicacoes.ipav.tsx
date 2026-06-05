import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { RouteGate } from "@/components/RouteGate";

export const Route = createFileRoute("/publicacoes/ipav")({
  head: () => ({ meta: [{ title: "Publicações IPAV" }] }),
  component: () => (
    <RouteGate path="/publicacoes/ipav">
      <PlaceholderPage
        title="Publicações IPAV"
        description="Publicações do Instituto Padre António Vieira."
      />
    </RouteGate>
  ),
});
