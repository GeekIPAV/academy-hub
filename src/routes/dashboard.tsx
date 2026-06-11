import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { WidgetRoadmap } from "@/components/WidgetRoadmap";
import { WidgetMeusProgramas } from "@/components/WidgetMeusProgramas";
import { Button } from "@/components/ui/button";
import { BookMarked, User } from "lucide-react";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";

import { RouteGate } from "@/components/RouteGate";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Página Inicial — Academia Ubuntu" }],
  }),
  component: () => (
    <RouteGate path="/dashboard">
      <DashboardPage />
    </RouteGate>
  ),
});


function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function DashboardPage() {
  const { activeRoles, isComponentVisible, profile } = useApp();
  
  const visible = (id: string) => isComponentVisible("/dashboard", id);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ComponentAccessMatrix pagePath="/dashboard" />
      <div className="text-center text-xl font-semibold py-[20px]">
        {getGreeting()}{profile?.full_name ? `, ${profile.full_name}!` : ""}
      </div>
      {visible("profile-button") && (
        <div className="flex justify-end">
          <Button asChild variant="outline">
            <Link to="/profile">
              <User className="h-4 w-4" />
              Perfil
            </Link>
          </Button>
        </div>
      )}
      {visible("recursos-button") && (
        <div className="flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link to="/recursos">
              <BookMarked className="h-4 w-4" />
              Centro de Recursos
            </Link>
          </Button>
        </div>
      )}
      <WidgetMeusProgramas />
      {visible("roadmap") && <WidgetRoadmap />}
    </div>
  );
}
