import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/comunicacao/propriedade-intelectual")({
  head: () => ({ meta: [{ title: "Propriedade Intelectual" }] }),
  component: () => (
    <PlaceholderPage
      title="Propriedade Intelectual"
      description="Informação sobre propriedade intelectual e licenciamento."
    />
  ),
});
