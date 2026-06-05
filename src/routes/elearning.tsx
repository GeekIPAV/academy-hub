import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { RouteGate } from "@/components/RouteGate";

export const Route = createFileRoute("/elearning")({
  head: () => ({ meta: [{ title: "E-learning" }] }),
  component: () => (
    <RouteGate path="/elearning">
      <PlaceholderPage
        title="E-learning"
        description="Plataforma de formação online. Em breve."
      />
    </RouteGate>
  ),
});
