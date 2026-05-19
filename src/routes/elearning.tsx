import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/elearning")({
  head: () => ({ meta: [{ title: "E-learning" }] }),
  component: () => (
    <PlaceholderPage
      title="E-learning"
      description="Plataforma de formação online. Em breve."
    />
  ),
});
