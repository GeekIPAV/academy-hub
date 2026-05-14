import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { WidgetRoadmap } from "@/components/WidgetRoadmap";
import { Button } from "@/components/ui/button";
import { BookMarked, User } from "lucide-react";
import { useIsFormando } from "@/hooks/use-is-formando";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Academia Ubuntu" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { activeRoles } = useApp();
  const isFormando = useIsFormando();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            A visualizar como{" "}
            <span className="font-medium text-foreground">{activeRoles.join(" + ")}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFormando && (
            <Button asChild variant="outline">
              <Link to="/recursos">
                <BookMarked className="h-4 w-4" />
                Centro de Recursos
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/profile">
              <User className="h-4 w-4" />
              Perfil
            </Link>
          </Button>
        </div>
      </div>
      <WidgetRoadmap />
    </div>
  );
}
