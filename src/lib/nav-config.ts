import {
  BookMarked,
  BookOpen,
  Building2,
  CalendarCog,
  Copyright,
  FolderCog,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Library,
  ListChecks,
  Lock,
  Mail,
  Medal,
  Megaphone,
  
  Shield,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  /** If true, item respects the route permission matrix in the sidebar. */
  gated?: boolean;
};

export type NavGroup = {
  label?: string;
  adminOnly?: boolean;
  items: NavItem[];
};

/**
 * Single source of truth for the app's navigation.
 * The sidebar and the access matrices (rotas + componentes) are both
 * derived from this list, so adding/removing a page here updates them all.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, gated: true },
      { path: "/entidade/dashboard", label: "Painel da Entidade", icon: Building2, gated: true },
      { path: "/actions", label: "Eventos e Formações", icon: ListChecks, gated: true },
    ],
  },
  {
    label: "Formação",
    items: [
      { path: "/elearning", label: "E-learning", icon: GraduationCap, gated: true },
      { path: "/recursos", label: "Centro de Recursos", icon: BookMarked, gated: true },
    ],
  },
  {
    label: "Publicações",
    items: [
      { path: "/publicacoes/revistas", label: "Revistas Científicas", icon: BookOpen, gated: true },
      { path: "/publicacoes/biblioteca", label: "Biblioteca", icon: Library, gated: true },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { path: "/comunicacao/press-media-kit", label: "Press Media Kit", icon: Megaphone, gated: true },
      { path: "/comunicacao/propriedade-intelectual", label: "Propriedade Intelectual", icon: Copyright, gated: true },
      { path: "/faqs", label: "FAQs", icon: HelpCircle, gated: true },
    ],
  },

  {
    label: "Admin",
    items: [
      { path: "/admin/programas", label: "Gestão de Programas", icon: Shield, gated: true },
      { path: "/admin/acoes", label: "Gestão de Ações", icon: CalendarCog, gated: true },
      { path: "/admin/recursos", label: "Gestão de Recursos", icon: FolderCog, gated: true },
      { path: "/admin/badges", label: "Gestão de Badges", icon: Medal, gated: true },
      { path: "/admin/manager", label: "Central de Comando", icon: Shield, gated: true },
      { path: "/admin/governacao", label: "Governação de Dados", icon: Lock, gated: true },
      { path: "/admin/emails", label: "Gestão de Emails", icon: Mail, gated: true },
      { path: "/admin/biblioteca", label: "Gestão da Biblioteca", icon: Library, gated: true },
    ],
  },

];

/** Flat list of every nav item, in display order. */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) =>
  g.items.map((it) => ({ ...it, _group: g.label, _adminOnly: g.adminOnly })),
);
