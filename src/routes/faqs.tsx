import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/faqs")({
  head: () => ({ meta: [{ title: "FAQs" }] }),
  component: () => (
    <PlaceholderPage title="FAQs" description="Perguntas frequentes." />
  ),
});
