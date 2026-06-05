import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { RouteGate } from "@/components/RouteGate";

export const Route = createFileRoute("/publicacoes/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca" }] }),
  component: () => (
    <RouteGate path="/publicacoes/biblioteca">
      <PlaceholderPage title="Biblioteca" description="Catálogo de livros e recursos." />
    </RouteGate>
  ),
});
