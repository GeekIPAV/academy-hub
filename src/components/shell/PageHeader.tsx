import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; to?: string; params?: Record<string, string> };

/**
 * Cabeçalho comum a todas as páginas: migalhas (opcional), área, título,
 * descrição, etiquetas por cima do título e ações à direita.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  chips,
  actions,
  crumbs,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  chips?: ReactNode;
  actions?: ReactNode;
  crumbs?: Crumb[];
}) {
  return (
    <div className="min-w-0 space-y-3">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Caminho" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
              {c.to ? (
                <Link
                  to={c.to as never}
                  params={c.params as never}
                  className="hover:text-primary"
                >
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-sm font-medium text-muted-foreground">{eyebrow}</p>}
          {chips && <div className="mb-2 flex flex-wrap items-center gap-2">{chips}</div>}
          <h1 className="break-words text-2xl font-semibold tracking-tight text-secondary sm:text-[28px]">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Faixa de resumo com 2 a 4 números ou factos, por baixo do cabeçalho. */
export function SummaryStrip({ items }: { items: { label: string; value: ReactNode; extra?: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card md:grid-cols-4">
      {items.map((it, i) => (
        <div key={i} className="min-w-0 border-b border-r p-4 last:border-r-0 md:border-b-0">
          <dt className="text-xs text-muted-foreground">{it.label}</dt>
          <dd className="mt-0.5 break-words text-sm font-medium text-secondary">{it.value}</dd>
          {it.extra}
        </div>
      ))}
    </dl>
  );
}

/** Contentor de página: mesma largura e espaçamento em todas as páginas. */
export function PageShell({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className={`mx-auto w-full min-w-0 space-y-6 ${narrow ? "max-w-4xl" : "max-w-6xl"}`}>{children}</div>
  );
}

/** Bloco com título, usado para agrupar campos e conteúdos. */
export function Section({
  title,
  description,
  actions,
  children,
  className,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`min-w-0 space-y-5 rounded-xl border bg-card p-5 sm:p-6 ${className ?? ""}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-secondary">{title}</h2>}
            {description && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
