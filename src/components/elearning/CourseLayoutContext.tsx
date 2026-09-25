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
