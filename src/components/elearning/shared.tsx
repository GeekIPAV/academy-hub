import { CheckCircle2, Circle, Lock } from "lucide-react";
import type { PassoEstado } from "@/lib/elearning.functions";

export const TIPO_PASSO: Record<string, string> = { video: "Vídeo", texto: "Leitura", recurso: "Recurso", quiz: "Quiz", reflexao: "Reflexão" };
export const MODALIDADE_LABEL: Record<string, string> = { autonomo: "Autónomo", turma: "Em turma" };

export function EstadoIcon({ estado }: { estado: PassoEstado }) {
  if (estado === "concluido") return <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />;
  if (estado === "bloqueado") return <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
}
