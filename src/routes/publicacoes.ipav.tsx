import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { RouteGate } from "@/components/RouteGate";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";

export const Route = createFileRoute("/publicacoes/ipav")({
  head: () => ({ meta: [{ title: "Publicações IPAV" }] }),
  component: () => (
    <RouteGate path="/publicacoes/ipav">
      <div className="mx-auto max-w-6xl space-y-6">
        <ComponentAccessMatrix pagePath="/publicacoes/ipav" />
        <PlaceholderPage
          title="Publicações IPAV"
          description="Publicações do Instituto Padre António Vieira."
        />
      </div>
    </RouteGate>
  ),
});
