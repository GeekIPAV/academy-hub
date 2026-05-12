import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { UserCog } from "lucide-react";

export function WidgetWelcome() {
  const { profile, activeRoles } = useApp();
  return (
    <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-lg">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider opacity-80">Bem-vindo de volta</p>
          <h2 className="mt-1 text-2xl font-semibold">{profile.full_name}</h2>
          <p className="mt-1 text-sm opacity-80">
            {activeRoles.join(" · ")} · NIF {profile.nif}
          </p>
        </div>
        <Button asChild variant="secondary" className="self-start sm:self-auto">
          <Link to="/profile">
            <UserCog className="mr-2 h-4 w-4" /> Editar Perfil
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

WidgetWelcome.displayName = "Boas-vindas";
