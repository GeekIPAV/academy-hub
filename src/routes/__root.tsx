import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AppProvider, useApp } from "@/lib/app-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/use-auth";
import { LoadingU, LoadingUInline } from "@/components/LoadingU";
import { ImprovingBanner } from "@/components/ImprovingBanner";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyEntidade } from "@/lib/entidade.functions";
import { useCurrentProfile } from "@/hooks/use-current-profile";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo correu mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "light" },
      { title: "Academia de Líderes Ubuntu" },
      { name: "description", content: "Plataforma Ubuntu" },
      { property: "og:title", content: "Academia de Líderes Ubuntu" },
      { name: "twitter:title", content: "Academia de Líderes Ubuntu" },
      { property: "og:description", content: "Plataforma Ubuntu" },
      { name: "twitter:description", content: "Plataforma Ubuntu" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/0CyVmC43rsdbyq9F0rpAcHPUG632/social-images/social-1780333883974-55204926615_9d8e69c4d7_k_(2).webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/0CyVmC43rsdbyq9F0rpAcHPUG632/social-images/social-1780333883974-55204926615_9d8e69c4d7_k_(2).webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="light">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AppShell />
        <Toaster />
      </AppProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const { session, loading } = useAuth();
  const isRouterLoading = useRouterState({ select: (s) => s.isLoading || s.isTransitioning });

  // Only the initial auth bootstrap shows the full-screen loader.
  // Router transitions show a loader inside <main> so the sidebar stays mounted.
  if (loading) {
    return <LoadingU />;
  }

  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const isPublicRoute =
    pathname === "/auth" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/inscricao/") ||
    pathname.startsWith("/evento/") ||
    pathname.startsWith("/convite/");

  if (!session) {
    if (!isPublicRoute) {
      if (typeof window !== "undefined") {
        const redirectTo = encodeURIComponent(
          window.location.pathname + window.location.search,
        );
        window.location.replace(`/auth?redirect=${redirectTo}`);
      }
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-sm text-muted-foreground">A redirecionar…</div>
        </div>
      );
    }
    if (isRouterLoading) {
      return <LoadingU />;
    }
    return (
      <div className="min-h-screen bg-muted/30">
        <Outlet />
      </div>
    );
  }

  // /reset-password must always render as a standalone page (sem sidebar),
  // mesmo quando o Supabase já criou uma sessão a partir do token de recovery.
  if (pathname === "/reset-password") {
    return (
      <div className="min-h-screen bg-muted/30">
        {isRouterLoading ? <InlineLoader /> : <Outlet />}
      </div>
    );
  }

  return (
    <ShellWithSidebar pathname={pathname} isRouterLoading={isRouterLoading} />
  );
}

function ShellWithSidebar({
  pathname,
  isRouterLoading,
}: {
  pathname: string;
  isRouterLoading: boolean;
}) {
  const { isAdmin } = useApp();
  const { isLoading: profileLoading } = useCurrentProfile();
  const fetchEntidade = useServerFn(getMyEntidade);
  // Run for every non-admin user so we know whether they completed onboarding,
  // regardless of which route they landed on after login.
  const { data: entidade, isFetched } = useQuery({
    queryKey: ["my-entidade", "self"],
    queryFn: () => fetchEntidade(undefined as never),
    enabled: !isAdmin && !profileLoading,
    retry: false,
    staleTime: 60_000,
  });

  // Avoid flashing the sidebar / dashboard while we still don't know roles
  // or whether the user already has an entidade.
  if (!isAdmin && (profileLoading || !isFetched)) {
    return <LoadingU />;
  }

  const needsOnboarding = !isAdmin && isFetched && !entidade;
  const router = useRouter();

  useEffect(() => {
    if (needsOnboarding && pathname !== "/entidade/dashboard") {
      router.navigate({ to: "/entidade/dashboard", replace: true });
    }
  }, [needsOnboarding, pathname, router]);

  if (needsOnboarding) {
    // Sidebar stays hidden until the user completes the onboarding forms.
    return (
      <div className="min-h-screen bg-muted/30">
        <main className="p-4 sm:p-6 lg:p-8">
          {pathname !== "/entidade/dashboard" || isRouterLoading ? (
            <InlineLoader />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="text-sm font-medium text-muted-foreground">
              Academia de Líderes Ubuntu
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {isRouterLoading ? <InlineLoader /> : <Outlet />}
            <ImprovingBanner />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function InlineLoader() {
  return <LoadingUInline />;
}

