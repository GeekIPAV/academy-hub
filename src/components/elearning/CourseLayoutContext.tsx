import { createContext, useContext } from "react";
import type { CursoDetalhe } from "@/lib/elearning.functions";

export type CourseLayoutValue = {
  data: CursoDetalhe;
  turmaId: string;
  setTurmaId: (id: string) => void;
  isPreview: boolean;
  isEnrolling: boolean;
  enroll: () => void;
  formationStepId: string | null;
  /** Elemento do cabeçalho do curso onde o leitor injeta os seus controlos (Passo X de Y, módulos, notas). */
  headerSlot: HTMLElement | null;
  /** Ação principal do curso (Começar / Continuar / Inscrever-me / Ver certificado). */
  primary: { label: string; disabled: boolean; run: () => void };
};

const CourseLayoutContext = createContext<CourseLayoutValue | null>(null);

export function CourseLayoutProvider({ value, children }: { value: CourseLayoutValue; children: React.ReactNode }) {
  return <CourseLayoutContext.Provider value={value}>{children}</CourseLayoutContext.Provider>;
}

export function useCourseLayout() {
  const value = useContext(CourseLayoutContext);
  if (!value) throw new Error("useCourseLayout must be used inside the course layout.");
  return value;
}

/** Evento escutado pelo leitor para abrir o diálogo de atalhos de teclado. */
export const SHORTCUTS_EVENT = "elearning:atalhos";
