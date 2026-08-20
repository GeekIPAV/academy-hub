import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { WidgetRoadmap } from "@/components/WidgetRoadmap";
import { WidgetMeusProgramas } from "@/components/WidgetMeusProgramas";
import { BookMarked, User, ArrowRight } from "lucide-react";
import { ComponentAccessMatrix } from "@/components/ComponentAccessMatrix";
import mandela from "@/assets/mandela-traced.svg";

import { RouteGate } from "@/components/RouteGate";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Página Inicial — Academia de Líderes Ubuntu" },
      {
        name: "description",
        content:
          "Acompanha o teu percurso na Academia de Líderes Ubuntu: programas, formações e centro de recursos num só lugar.",
      },
      { property: "og:title", content: "Página Inicial — Academia de Líderes Ubuntu" },
      {
        property: "og:description",
        content: "Acompanha o teu percurso, programas e recursos da Academia de Líderes Ubuntu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
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

function ShortcutCard({
  to,
  title,
  description,
  icon: Icon,
  tone,
}: {
  to: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "accent";
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          tone === "primary"
            ? "bg-primary/12 text-primary"
            : "bg-accent/20 text-accent-foreground"
        }`}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function DashboardPage() {
  const { isComponentVisible, profile } = useApp();

  const visible = (id: string) => isComponentVisible("/dashboard", id);
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <ComponentAccessMatrix pagePath="/dashboard" />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-secondary text-secondary-foreground">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-contain bg-right bg-no-repeat opacity-10 invert"
          style={{ backgroundImage: `url(${mandela})` }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-secondary via-secondary/95 to-secondary/60"
          aria-hidden="true"
        />
        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-medium tracking-wide text-primary-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            Academia de Líderes Ubuntu
          </span>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-secondary-foreground sm:text-4xl">
            {getGreeting()}
            {firstName ? (
              <>
                ,<br className="sm:hidden" />{" "}
                <span className="text-accent">{firstName}</span>
              </>
            ) : null}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-secondary-foreground/75 sm:text-base">
            «Eu sou porque tu és.» Acompanha aqui os teus programas, o teu percurso de formação e
            todos os recursos da comunidade.
          </p>
        </div>
      </section>

      {/* Atalhos */}
      {(visible("profile-button") || visible("recursos-button")) && (
        <section className="grid gap-3 sm:grid-cols-2">
          {visible("profile-button") && (
            <ShortcutCard
              to="/profile"
              title="O meu Perfil"
              description="Dados pessoais e de certificação"
              icon={User}
              tone="primary"
            />
          )}
          {visible("recursos-button") && (
            <ShortcutCard
              to="/recursos"
              title="Centro de Recursos"
              description="Materiais e conteúdos de formação"
              icon={BookMarked}
              tone="accent"
            />
          )}
        </section>
      )}

      <WidgetMeusProgramas showRoadmap={visible("roadmap")} />

    </div>
  );
}
