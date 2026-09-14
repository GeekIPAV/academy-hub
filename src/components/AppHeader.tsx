import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, Home, LogOut, Search, User } from "lucide-react";
import aluLogo from "@/assets/alu-logo.svg";
import { useApp } from "@/lib/app-context";
import { NAV_GROUPS } from "@/lib/nav-config";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader({ pathname }: { pathname: string }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { canAccess, profile, isAdmin } = useApp();
  const { user, signOut } = useAuth();

  const availableGroups = useMemo(
    () =>
      NAV_GROUPS.flatMap((group) => {
        if (group.adminOnly && !isAdmin) return [];
        const items = group.items.filter((item) => (item.gated ? canAccess(item.path) : true));
        return items.map((item) => ({ ...item, group: group.label ?? "Principal" }));
      }),
    [canAccess, isAdmin],
  );

  const currentPage = [...availableGroups]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  const displayName = profile?.full_name ?? user?.email ?? "Conta";
  const initials = displayName
    .split(/[\s@.]/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openPage = (path: string) => {
    setSearchOpen(false);
    navigate({ to: path });
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 grid h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-sidebar-border bg-secondary px-3 text-secondary-foreground shadow-sm sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <SidebarTrigger className="shrink-0 text-secondary-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
          <div className="hidden h-7 w-px bg-secondary-foreground/20 sm:block" />
          <img
            src={aluLogo}
            alt="Academia de Líderes Ubuntu"
            className="hidden h-8 w-auto shrink-0 brightness-0 invert sm:block"
          />
          <div className="hidden h-7 w-px bg-secondary-foreground/20 lg:block" />
          <div className="min-w-0 lg:flex lg:items-center lg:gap-2">
            <span className="hidden shrink-0 text-xs font-semibold lg:inline">Área reservada</span>
            <span className="hidden text-secondary-foreground/45 lg:inline">/</span>
            <span className="block truncate text-sm font-medium text-secondary-foreground/80">
              {currentPage?.label ?? "Academia Ubuntu"}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-9 px-0 text-secondary-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:w-64 md:justify-start md:border md:border-secondary-foreground/20 md:bg-secondary-foreground/10 md:px-3"
            onClick={() => setSearchOpen(true)}
            aria-label="Pesquisar páginas"
          >
            <Search className="h-4 w-4" />
            <span className="hidden flex-1 text-left text-xs font-normal text-secondary-foreground/75 md:inline">
              Pesquisar páginas…
            </span>
            <kbd className="hidden rounded border border-secondary-foreground/20 px-1.5 py-0.5 text-[10px] text-secondary-foreground/55 xl:inline">
              Ctrl K
            </kbd>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden text-secondary-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground sm:inline-flex"
            title="Página inicial"
            aria-label="Página inicial"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            <Home />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-10 gap-2 px-1.5 text-secondary-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground sm:px-2"
                aria-label="Abrir menu de perfil"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {initials || "?"}
                </span>
                <span className="hidden max-w-40 truncate text-xs font-medium xl:block">{displayName}</span>
                <ChevronDown className="hidden h-3.5 w-3.5 sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate text-sm font-semibold">{displayName}</span>
                {profile?.full_name && user?.email ? (
                  <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                ) : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate({ to: "/profile" })}>
                <User /> O meu perfil
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={async () => {
                  await signOut();
                  navigate({ to: "/auth" });
                }}
              >
                <LogOut /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Pesquisar uma página…" />
        <CommandList>
          <CommandEmpty>Nenhuma página encontrada.</CommandEmpty>
          {Array.from(new Set(availableGroups.map((item) => item.group))).map((group) => (
            <CommandGroup key={group} heading={group}>
              {availableGroups
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.path}
                      value={`${item.label} ${group}`}
                      onSelect={() => openPage(item.path)}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}