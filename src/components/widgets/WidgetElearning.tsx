import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Wrench } from "lucide-react";

export function WidgetElearning() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>E-Learning</CardTitle>
        <CardDescription>Aceda aos seus recursos de aprendizagem</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Button variant="outline" className="h-auto justify-start gap-3 py-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <div className="text-left">
            <p className="font-medium">Moodle</p>
            <p className="text-xs text-muted-foreground">Plataforma de cursos</p>
          </div>
        </Button>
        <Button variant="outline" className="h-auto justify-start gap-3 py-4">
          <Wrench className="h-5 w-5 text-primary" />
          <div className="text-left">
            <p className="font-medium">Toolkit</p>
            <p className="text-xs text-muted-foreground">Recursos e materiais</p>
          </div>
        </Button>
      </CardContent>
    </Card>
  );
}
