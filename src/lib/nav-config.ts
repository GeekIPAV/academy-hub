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
  Megaphone,
  Newspaper,
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
      { path: "/elearning", label: "E-learning", icon: GraduationCap },
      { path: "/recursos", label: "Centro de Recursos", icon: BookMarked },
    ],
  },
  {
    label: "Publicações",
    items: [
      { path: "/publicacoes/revistas", label: "Revistas Científicas", icon: BookOpen },
      { path: "/publicacoes/ipav", label: "Publicações IPAV", icon: Newspaper },
      { path: "/publicacoes/biblioteca", label: "Biblioteca", icon: Library },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { path: "/comunicacao/press-media-kit", label: "Press Media Kit", icon: Megaphone },
      { path: "/comunicacao/propriedade-intelectual", label: "Propriedade Intelectual", icon: Copyright },
    ],
  },
  {
    items: [{ path: "/faqs", label: "FAQs", icon: HelpCircle }],
  },
  {
    label: "Admin",
    adminOnly: true,
    items: [
      { path: "/admin/programas", label: "Gestão de Programas", icon: Shield },
      { path: "/admin/acoes", label: "Gestão de Ações", icon: CalendarCog },
      { path: "/admin/recursos", label: "Gestão de Recursos", icon: FolderCog },
      { path: "/admin/manager", label: "Central de Comando", icon: Shield },
    ],
  },
];

/** Flat list of every nav item, in display order. */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) =>
  g.items.map((it) => ({ ...it, _group: g.label, _adminOnly: g.adminOnly })),
);
