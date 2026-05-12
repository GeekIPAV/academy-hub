import type {
  AppRoute,
  DashboardTemplate,
  Enrollment,
  Profile,
  RoleName,
  RoutePermission,
  TrainingAction,
  UserRole,
} from "./types";

export const ALL_ROLES: RoleName[] = ["Admin", "Formador", "Formando"];

export const MOCK_PROFILE: Profile = {
  id: "user-1",
  full_name: "Joana Martins",
  nif: "234567890",
  email: "joana@ubuntu.pt",
};

export const MOCK_USER_ROLES: UserRole[] = [
  { user_id: "user-1", role_name: "Formando" },
];

export const APP_ROUTES: AppRoute[] = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/profile", label: "Perfil" },
  { path: "/training", label: "Formações" },
  { path: "/admin/manager", label: "Central de Comando" },
];

export const MOCK_ROUTE_PERMISSIONS: RoutePermission[] = [
  // Admin: tudo
  ...APP_ROUTES.map((r) => ({
    role_name: "Admin" as RoleName,
    route_path: r.path,
    is_granted: true,
  })),
  // Formador
  { role_name: "Formador", route_path: "/dashboard", is_granted: true },
  { role_name: "Formador", route_path: "/profile", is_granted: true },
  { role_name: "Formador", route_path: "/training", is_granted: true },
  { role_name: "Formador", route_path: "/admin/manager", is_granted: false },
  // Formando
  { role_name: "Formando", route_path: "/dashboard", is_granted: true },
  { role_name: "Formando", route_path: "/profile", is_granted: true },
  { role_name: "Formando", route_path: "/training", is_granted: true },
  { role_name: "Formando", route_path: "/admin/manager", is_granted: false },
];

export const ALL_WIDGETS: { id: string; label: string; description: string }[] = [
  { id: "welcome", label: "Boas-vindas", description: "Cabeçalho com nome e perfil" },
  { id: "elearning", label: "E-Learning", description: "Acesso ao Moodle e Toolkit" },
  { id: "program-status", label: "Ponto de Situação", description: "Fases FTC, FTP, SU, SF" },
  { id: "trainer-cohorts", label: "As Minhas Turmas", description: "Visão de Formador" },
  { id: "admin-stats", label: "Indicadores Globais", description: "KPIs para Admin" },
];

export const MOCK_DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  { role_name: "Formando", widget_id: "welcome", position: 0 },
  { role_name: "Formando", widget_id: "elearning", position: 1 },
  { role_name: "Formando", widget_id: "program-status", position: 2 },
  { role_name: "Formador", widget_id: "welcome", position: 0 },
  { role_name: "Formador", widget_id: "trainer-cohorts", position: 1 },
  { role_name: "Admin", widget_id: "welcome", position: 0 },
  { role_name: "Admin", widget_id: "admin-stats", position: 1 },
];

export const MOCK_TRAINING_ACTIONS: TrainingAction[] = [
  { id: "ftc-1", category: "FTC", title: "Formação Teórica Comum", status: "open" },
  { id: "ftp-1", category: "FTP", title: "Formação Teórico-Prática", status: "scheduled" },
  { id: "su-1", category: "SU", title: "Semana Ubuntu", status: "scheduled" },
  { id: "sf-1", category: "SF", title: "Serviço Final", status: "closed" },
];

export const MOCK_ENROLLMENTS: Enrollment[] = [
  { user_id: "user-1", action_id: "ftc-1", status: "completed" },
];
