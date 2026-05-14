import type {
  AppRoute,
  ComponentPermission,
  Enrollment,
  PageComponent,
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
  { user_id: "user-1", role_name: "Admin" },
  { user_id: "user-1", role_name: "Formador" },
  { user_id: "user-1", role_name: "Formando" },
];

export const APP_ROUTES: AppRoute[] = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/actions", label: "Eventos e Formações" },
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
  { role_name: "Formador", route_path: "/actions", is_granted: true },
  { role_name: "Formador", route_path: "/admin/manager", is_granted: false },
  // Formando
  { role_name: "Formando", route_path: "/dashboard", is_granted: true },
  { role_name: "Formando", route_path: "/actions", is_granted: true },
  { role_name: "Formando", route_path: "/admin/manager", is_granted: false },
];

export const MOCK_TRAINING_ACTIONS: TrainingAction[] = [
  { id: "ftc-1", category: "FTC", title: "Formação Teórica Comum", status: "open" },
  { id: "ftp-1", category: "FTP", title: "Formação Teórico-Prática", status: "scheduled" },
  { id: "su-1", category: "SU", title: "Semana Ubuntu", status: "scheduled" },
  { id: "sf-1", category: "SF", title: "Serviço Final", status: "closed" },
];

export const MOCK_ENROLLMENTS: Enrollment[] = [{ user_id: "user-1", action_id: "ftc-1", status: "completed" }];

// Registo de componentes visíveis por página, controláveis pela matriz de acessos.
export const PAGE_COMPONENTS: Record<string, PageComponent[]> = {
  "/dashboard": [
    { id: "header", label: "Cabeçalho" },
    { id: "profile-button", label: "Botão Perfil" },
    { id: "recursos-button", label: "Botão Centro de Recursos" },
    { id: "roadmap", label: "Widget Meu Percurso" },
  ],
  "/actions": [
    { id: "header", label: "Cabeçalho" },
    { id: "table", label: "Tabela de ações" },
  ],
  "/dados-certificacao": [
    { id: "header", label: "Cabeçalho" },
    { id: "step1", label: "Passo 1 — Enquadramento" },
    { id: "step2", label: "Passo 2 — Dados oficiais" },
  ],
  "/profile": [
    { id: "header", label: "Cabeçalho" },
    { id: "form", label: "Formulário de dados" },
  ],
  "/recursos": [
    { id: "header", label: "Cabeçalho" },
    { id: "tabs", label: "Tabs de fases" },
  ],
  "/admin/manager": [
    { id: "header", label: "Cabeçalho" },
    { id: "route-matrix", label: "Matriz de Rotas" },
  ],
};

// Por defeito, todos os componentes são visíveis a todos os roles.
export const MOCK_COMPONENT_PERMISSIONS: ComponentPermission[] = Object.entries(PAGE_COMPONENTS)
  .flatMap(([page_path, comps]) =>
    comps.flatMap((c) =>
      ALL_ROLES.map((role) => ({
        role_name: role,
        page_path,
        component_id: c.id,
        is_granted: true,
      })),
    ),
  );
