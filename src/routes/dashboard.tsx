import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { WidgetRoadmap } from "@/components/WidgetRoadmap";
import { Button } from "@/components/ui/button";
import { BookMarked, User } from "lucide-react";
import { useIsFormando } from "@/hooks/use-is-formando";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Academia Ubuntu" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { activeRoles, isComponentVisible } = useApp();
  const isFormando = useIsFormando();
  const visible = (id: string) => isComponentVisible("/dashboard", id);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ComponentAccessMatrix pagePath="/dashboard" />
      {visible("header") && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              A visualizar como{" "}
              <span className="font-medium text-foreground">{activeRoles.join(" + ")}</span>.
            </p>
          </div>
          {visible("profile-button") && (
            <Button asChild variant="outline">
              <Link to="/profile">
                <User className="h-4 w-4" />
                Perfil
              </Link>
            </Button>
          )}
        </div>
      )}
      {isFormando && visible("recursos-button") && (
        <div className="flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link to="/recursos">
              <BookMarked className="h-4 w-4" />
              Centro de Recursos
            </Link>
          </Button>
        </div>
      )}
      {visible("roadmap") && <WidgetRoadmap />}
    </div>
  );
}
