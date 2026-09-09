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
export type NavGroup = { label?: string; adminOnly?: boolean; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  { items: [
    { path: "/dashboard", label: "Página Inicial", icon: LayoutDashboard, gated: true },
    { path: "/entidade/dashboard", label: "Página da Organização", icon: Building2, gated: true },
    { path: "/acoes", label: "Ações", icon: CalendarDays, gated: true },
  ] },
  { label: "Formação", items: [
    { path: "/elearning", label: "E-learning", icon: GraduationCap, gated: true },
    { path: "/recursos", label: "Centro de Recursos", icon: BookMarked, gated: true },
  ] },
  { label: "Cultura Ubuntu", items: [
    { path: "/cultura-ubuntu/avaliacao", label: "Avaliação de Impacto", icon: ClipboardCheck },
  ] },
  { label: "Publicações", items: [
    { path: "/publicacoes/revistas", label: "Revista Científica", icon: BookOpen, gated: true },
    { path: "/publicacoes/biblioteca", label: "Biblioteca", icon: Library, gated: true },
  ] },
  { label: "Comunicação", items: [
    { path: "/comunicacao/press-media-kit", label: "Press Media Kit", icon: Megaphone, gated: true },
    { path: "/comunicacao/propriedade-intelectual", label: "Propriedade Intelectual", icon: Copyright, gated: true },
    { path: "/faqs", label: "FAQs", icon: HelpCircle, gated: true },
  ] },
  { label: "Equipa", items: [{ path: "/equipa/programas", label: "Programas", icon: Users, gated: true }] },
  { label: "Admin", adminOnly: true, items: [
    { path: "/admin/programas", label: "Gestão de Programas", icon: Shield },
    { path: "/admin/entidades", label: "Gestão de Entidades", icon: Shield },
    { path: "/admin/acoes", label: "Gestão de Ações", icon: CalendarCog },
    { path: "/admin/recursos", label: "Gestão de Recursos", icon: FolderCog },
    { path: "/admin/badges", label: "Gestão de Badges", icon: Medal },
    { path: "/admin/manager", label: "Central de Comando", icon: Shield },
    { path: "/admin/governacao", label: "Governação de Dados", icon: Lock },
    { path: "/admin/emails", label: "Gestão de Emails", icon: Mail },
    { path: "/admin/biblioteca", label: "Gestão da Biblioteca", icon: Library },
  ] },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items.map((item) => ({ ...item, _group: group.label, _adminOnly: group.adminOnly })));
