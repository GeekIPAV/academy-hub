import type {
  AppRoute,
  PageComponent,
  TrainingAction,
  Enrollment,
} from "./types";

// Entidade mock (representante institucional logado)
export const MOCK_ENTITY = {
  id: "entity-1",
  cohort_id: "cohort-1",
  name: "Câmara Municipal de Lisboa",
  invite_token: "a1b2c3d4e5f6",
  contact_name: "Maria Silva",
  contact_email: "maria.silva@cm-lisboa.pt",
  contact_phone: "+351 21 123 4567",
};

export const MOCK_ENTITY_TRAINEES = [
  { id: "t-1", name: "André Costa", email: "andre.costa@email.pt", status: "Inscrito" as const },
  { id: "t-2", name: "Beatriz Lopes", email: "beatriz.lopes@email.pt", status: "Pendente" as const },
  { id: "t-3", name: "Carlos Mendes", email: "carlos.mendes@email.pt", status: "Inscrito" as const },
  { id: "t-4", name: "Diana Ferreira", email: "diana.ferreira@email.pt", status: "Concluído" as const },
];

export const APP_ROUTES: AppRoute[] = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/actions", label: "Eventos e Formações" },
  { path: "/entidade/dashboard", label: "Painel da Entidade" },
  { path: "/admin/manager", label: "Central de Comando" },
  { path: "/admin/programas", label: "Gestão de Programas" },
  { path: "/recursos", label: "Recursos" },
  { path: "/admin/recursos", label: "Gestão de Recursos" },
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
  "/entidade/dashboard": [
    { id: "header", label: "Cabeçalho" },
    { id: "tab-overview", label: "Aba Visão Geral" },
    { id: "invite-card", label: "Card Link de Convite" },
    { id: "trainees-table", label: "Tabela de Formandos" },
    { id: "tab-data", label: "Aba Dados da Entidade" },
  ],
};

