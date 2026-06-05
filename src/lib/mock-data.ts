import type {
  AppRoute,
  PageComponent,
  TrainingAction,
  Enrollment,
} from "./types";
import { NAV_GROUPS } from "./nav-config";

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

/**
 * Derivado automaticamente do NAV_GROUPS (single source of truth).
 * Sempre que uma página é adicionada/removida da sidebar, esta matriz atualiza.
 */
export const APP_ROUTES: AppRoute[] = NAV_GROUPS.flatMap((g) =>
  g.items.map((it) => ({
    path: it.path,
    label: g.label ? `${g.label} · ${it.label}` : it.label,
  })),
);

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
    { id: "improving-banner", label: "Banner a melhorar" },
  ],
  "/actions": [
    { id: "header", label: "Cabeçalho" },
    { id: "table", label: "Tabela de ações" },
    { id: "improving-banner", label: "Banner a melhorar" },
  ],
  "/dados-certificacao": [
    { id: "header", label: "Cabeçalho" },
    { id: "step1", label: "Passo 1 — Enquadramento" },
    { id: "step2", label: "Passo 2 — Dados oficiais" },
    { id: "improving-banner", label: "Banner a melhorar" },
  ],
  "/profile": [
    { id: "header", label: "Cabeçalho" },
    { id: "form", label: "Formulário de dados" },
    { id: "improving-banner", label: "Banner a melhorar" },
  ],
  "/recursos": [
    { id: "header", label: "Cabeçalho" },
    { id: "tabs", label: "Tabs de fases" },
    { id: "improving-banner", label: "Banner a melhorar" },
  ],
  "/admin/manager": [
    { id: "header", label: "Cabeçalho" },
    { id: "route-matrix", label: "Matriz de Rotas" },
    { id: "improving-banner", label: "Banner a melhorar" },
  ],
  "/entidade/dashboard": [
    { id: "header", label: "Cabeçalho" },
    { id: "tab-overview", label: "Aba Visão Geral" },
    { id: "tab-acoes", label: "Aba Marcações" },
    { id: "tab-data", label: "Aba Dados da Entidade" },
    { id: "invite-card", label: "Card Link de Convite" },
    { id: "trainees-table", label: "Tabela de Formandos" },
    { id: "improving-banner", label: "Banner a melhorar" },
  ],
};

