import { FolderKanban } from "lucide-react";
import {
  BookMarked,
  BookOpen,
  Building2,
  CalendarCog,
  CalendarDays,
  ClipboardCheck,
  Copyright,
  FolderCog,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Library,
  Lock,
  Mail,
  Medal,
  Megaphone,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { path: string; label: string; icon: LucideIcon; gated?: boolean };
/**
 * `mode` separa o menu em dois: "plataforma" (o que se usa como participante)
 * e "gestao" (o que a equipa usa para gerir). Só quem é admin vê o interruptor
 * e os grupos de gestão.
 */
export type NavMode = "plataforma" | "gestao";
export type NavGroup = { label?: string; adminOnly?: boolean; mode?: NavMode; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  { items: [
    { path: "/dashboard", label: "Página inicial", icon: LayoutDashboard, gated: true },
    { path: "/entidade/dashboard", label: "A minha organização", icon: Building2, gated: true },
    { path: "/acoes", label: "Ações", icon: CalendarDays, gated: true },
  ] },
  { label: "Aprender", items: [
    { path: "/elearning", label: "E-learning", icon: GraduationCap, gated: true },
    { path: "/recursos", label: "Centro de recursos", icon: BookMarked, gated: true },
    { path: "/cultura-ubuntu/avaliacao", label: "Avaliação de impacto", icon: ClipboardCheck },
  ] },
  { label: "Publicações", items: [
    { path: "/publicacoes/revistas", label: "Revista científica", icon: BookOpen, gated: true },
    { path: "/publicacoes/biblioteca", label: "Biblioteca", icon: Library, gated: true },
  ] },
  { label: "Comunicação", items: [
    { path: "/comunicacao/press-media-kit", label: "Press media kit", icon: Megaphone, gated: true },
    { path: "/comunicacao/propriedade-intelectual", label: "Propriedade intelectual", icon: Copyright, gated: true },
    { path: "/faqs", label: "FAQs", icon: HelpCircle, gated: true },
  ] },
  { label: "Equipa", items: [{ path: "/equipa/programas", label: "Programas", icon: Users, gated: true }] },
  { label: "Programas e ações", adminOnly: true, mode: "gestao", items: [
    { path: "/admin/programas", label: "Programas", icon: Shield },
    { path: "/admin/acoes", label: "Ações", icon: CalendarCog },
    { path: "/admin/avaliacoes", label: "Modelos de avaliação", icon: ClipboardCheck },
    { path: "/admin/projetos", label: "Projetos", icon: FolderKanban },
  ] },
  { label: "Pessoas e organizações", adminOnly: true, mode: "gestao", items: [
    { path: "/admin/manager", label: "Utilizadores e acessos", icon: Users },
    { path: "/admin/entidades", label: "Organizações", icon: Building2 },
    { path: "/admin/badges", label: "Badges", icon: Medal },
  ] },
  { label: "Conteúdos", adminOnly: true, mode: "gestao", items: [
    { path: "/admin/elearning", label: "E-learning", icon: GraduationCap },
    { path: "/admin/recursos", label: "Centro de recursos", icon: FolderCog },
    { path: "/admin/biblioteca", label: "Biblioteca de publicações", icon: Library },
    { path: "/admin/emails", label: "Emails", icon: Mail },
  ] },
  { label: "Sistema", adminOnly: true, mode: "gestao", items: [
    { path: "/admin/governacao", label: "Governação de dados", icon: Lock },
  ] },
];

/** Grupos do modo indicado. Os grupos sem `mode` pertencem à plataforma. */
export function groupsForMode(mode: NavMode): NavGroup[] {
  return NAV_GROUPS.filter((g) => (g.mode ?? "plataforma") === mode);
}

/** Um caminho de gestão abre o menu em modo gestão. */
export function modeForPath(path: string): NavMode {
  return path === "/admin" || path.startsWith("/admin/") ? "gestao" : "plataforma";
}

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items.map((item) => ({ ...item, _group: group.label, _adminOnly: group.adminOnly })));
