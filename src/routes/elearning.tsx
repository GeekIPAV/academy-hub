import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { RouteGate } from "@/components/RouteGate";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";

export const Route = createFileRoute("/elearning")({
  head: () => ({ meta: [{ title: "E-learning" }] }),
  component: () => (
    <RouteGate path="/elearning">
      <div className="mx-auto max-w-6xl space-y-6">
        <ComponentAccessMatrix pagePath="/elearning" />
        <PlaceholderPage
          title="E-learning"
          description="Plataforma de formação online. Em breve."
        />
      </div>
    </RouteGate>
  ),
});
