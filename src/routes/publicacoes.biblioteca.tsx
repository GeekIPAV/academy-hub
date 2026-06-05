import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { RouteGate } from "@/components/RouteGate";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";

export const Route = createFileRoute("/publicacoes/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca" }] }),
  component: () => (
    <RouteGate path="/publicacoes/biblioteca">
      <div className="mx-auto max-w-6xl space-y-6">
        <ComponentAccessMatrix pagePath="/publicacoes/biblioteca" />
        <PlaceholderPage title="Biblioteca" description="Catálogo de livros e recursos." />
      </div>
    </RouteGate>
  ),
});
