import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/comunicacao/press-media-kit")({
  head: () => ({ meta: [{ title: "Press Media Kit" }] }),
  component: () => (
    <PlaceholderPage
      title="Press Media Kit"
      description="Materiais para imprensa e comunicação."
    />
  ),
});
