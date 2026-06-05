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
    items: [{ path: "/faqs", label: "FAQs", icon: HelpCircle, gated: true }],
  },
  {
    label: "Comunicação",
    items: [
      { path: "/comunicacao/press-media-kit", label: "Press Media Kit", icon: Megaphone, gated: true },
      { path: "/comunicacao/propriedade-intelectual", label: "Propriedade Intelectual", icon: Copyright, gated: true },
    ],
  },

  {
    label: "Admin",
    adminOnly: true,
    items: [
      { path: "/admin/programas", label: "Gestão de Programas", icon: Shield },
      { path: "/admin/acoes", label: "Gestão de Ações", icon: CalendarCog },
      { path: "/admin/recursos", label: "Gestão de Recursos", icon: FolderCog },
      { path: "/admin/badges", label: "Gestão de Badges", icon: Medal },
      { path: "/admin/manager", label: "Central de Comando", icon: Shield },
      { path: "/admin/governacao", label: "Governação de Dados", icon: Lock },
      { path: "/admin/emails", label: "Gestão de Emails", icon: Mail },
      { path: "/admin/biblioteca", label: "Gestão da Biblioteca", icon: Library },
    ],
  },
];

/** Flat list of every nav item, in display order. */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) =>
  g.items.map((it) => ({ ...it, _group: g.label, _adminOnly: g.adminOnly })),
);
