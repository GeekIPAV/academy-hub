import { BookOpen, CheckCircle2, Circle, FileText, HelpCircle, Lock, MessageSquareText, PlayCircle, type LucideIcon } from "lucide-react";
import type { PassoEstado } from "@/lib/elearning.functions";

export const TIPO_PASSO: Record<string, string> = { video: "Vídeo", texto: "Leitura", recurso: "Recurso", quiz: "Quiz", reflexao: "Reflexão" };
export const MODALIDADE_LABEL: Record<string, string> = { autonomo: "Autónomo", turma: "Em turma" };
export const TIPO_PASSO_DESCRICAO: Record<string, string> = {
  video: "Vídeo Vimeo com registo de visualização",
  texto: "Conteúdo de leitura com formatação",
  recurso: "Documento do Centro de Recursos",
  quiz: "Perguntas com avaliação automática",
  reflexao: "Resposta escrita do formando",
};

export const PASSO_ICONS: Record<string, LucideIcon> = {
  video: PlayCircle,
  texto: BookOpen,
  recurso: FileText,
  quiz: HelpCircle,
  reflexao: MessageSquareText,
};

export function PassoTipoIcon({ tipo, className = "h-4 w-4" }: { tipo: string; className?: string }) {
  const Icon = PASSO_ICONS[tipo] ?? Circle;
  return <Icon className={`${className} shrink-0`} />;
}

export function formatarDuracao(minutos: number) {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

export function EstadoIcon({ estado }: { estado: PassoEstado }) {
  if (estado === "concluido") return <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />;
  if (estado === "bloqueado") return <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
}
