import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";

/**
 * Campo de formulário com rótulo ligado, ajuda e erro por baixo.
 * O erro fica junto ao campo (não num aviso que desaparece).
 * Passa `id` ao controlo filho para o rótulo funcionar.
 */
export function FormField({
  id,
  label,
  required,
  optional,
  hint,
  error,
  children,
  className,
  labelAside,
}: {
  id: string;
  label: ReactNode;
  required?: boolean;
  optional?: boolean;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
  labelAside?: ReactNode;
}) {
  return (
    <div className={`min-w-0 space-y-1.5 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id} className="text-[13px] font-medium text-secondary">
          {label}
          {required && (
            <span className="text-[#B42318]" aria-hidden="true">
              {" "}*
            </span>
          )}
          {optional && <span className="font-normal text-muted-foreground"> (opcional)</span>}
        </Label>
        {labelAside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-erro`} role="alert" className="flex items-center gap-1.5 text-xs font-medium text-[#B42318]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-ajuda`} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Classes para marcar um controlo com erro. */
export const fieldErrorClass = "border-[#B42318] bg-[#FFFBFA] focus-visible:ring-[#B42318]";

/** Atributos de acessibilidade para um controlo com erro ou ajuda. */
export function fieldA11y(id: string, error?: string | null, hint?: boolean) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-erro` : hint ? `${id}-ajuda` : undefined,
  } as const;
}
