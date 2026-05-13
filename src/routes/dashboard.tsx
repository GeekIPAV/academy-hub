import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Academia Ubuntu" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { activeRoles } = useApp();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          A visualizar como{" "}
          <span className="font-medium text-foreground">{activeRoles.join(" + ")}</span>.
        </p>
      </div>
    </div>
  );
}
