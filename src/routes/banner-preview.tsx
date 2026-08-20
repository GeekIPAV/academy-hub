import { createFileRoute } from "@tanstack/react-router";
import { ImprovingBanner } from "@/components/ImprovingBanner";

export const Route = createFileRoute("/banner-preview")({
  component: () => (
    <div className="mx-auto max-w-4xl p-8">
      <ImprovingBanner />
    </div>
  ),
});
