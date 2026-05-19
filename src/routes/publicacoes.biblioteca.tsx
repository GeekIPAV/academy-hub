import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/publicacoes/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca" }] }),
  component: () => (
    <PlaceholderPage title="Biblioteca" description="Catálogo de livros e recursos." />
  ),
});
