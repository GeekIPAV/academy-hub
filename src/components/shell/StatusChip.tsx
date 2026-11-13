import type { ReactNode } from "react";

export type ChipTone = "navy" | "orange" | "yellow" | "red" | "green" | "grey" | "tag";

const TONES: Record<ChipTone, string> = {
  navy: "bg-[#E6EDF6] text-secondary",
  orange: "bg-[#FFEBDC] text-[#A1420A]",
  yellow: "bg-[#FFF1CC] text-[#6B4200]",
  red: "bg-[#FDEDEC] text-[#B42318]",
  green: "bg-[#E7F5EE] text-[#11643F]",
  grey: "bg-[#EFEFF1] text-[#544E4F]",
  tag: "bg-muted text-secondary rounded-md",
};

/** Etiqueta de estado com cor fixa por significado. */
export function StatusChip({
  tone = "grey",
  dot,
  children,
  className,
}: {
  tone?: ChipTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${TONES[tone]} ${className ?? ""}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Cor do estado de uma ação. */
export function acaoStatusTone(status: string | null | undefined): ChipTone {
  const s = (status ?? "").toLowerCase();
  if (s.startsWith("confirm")) return "navy";
  if (s.startsWith("cancel")) return "red";
  if (s.startsWith("realiz") || s.startsWith("conclu") || s.startsWith("termin")) return "grey";
  return "yellow";
}
