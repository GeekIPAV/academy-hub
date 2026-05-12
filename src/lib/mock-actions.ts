// Mock data espelhando a database "IPAV_DB Action Record" do Notion.
// Quando o connector Notion for ligado, substituir por fetch ao gateway.

export interface NotionAction {
  id: string;
  actionId: string; // ex: "ACT-1234"
  name: string;
  city: string | null;
  concelho: string | null;
  country: string | null;
  area: string | null;
  status: "Planeada" | "Em curso" | "Concluída" | "Cancelada";
  createdTime: string; // ISO
  certified: boolean;
}

export const MOCK_ACTIONS: NotionAction[] = [
  {
    id: "n1",
    actionId: "ACT-1041",
    name: "Semana Ubuntu — Escola Secundária de Mafra",
    city: "Mafra",
    concelho: "Mafra",
    country: "Portugal",
    area: "Educação",
    status: "Em curso",
    createdTime: "2026-03-04T10:00:00Z",
    certified: true,
  },
  {
    id: "n2",
    actionId: "ACT-1042",
    name: "Formação Teórica Comum — Lisboa",
    city: "Lisboa",
    concelho: "Lisboa",
    country: "Portugal",
    area: "Formação",
    status: "Planeada",
    createdTime: "2026-03-12T14:30:00Z",
    certified: false,
  },
  {
    id: "n3",
    actionId: "ACT-1043",
    name: "Círculo Ubuntu — Porto",
    city: "Porto",
    concelho: "Porto",
    country: "Portugal",
    area: "Comunidade",
    status: "Concluída",
    createdTime: "2026-01-22T09:00:00Z",
    certified: true,
  },
  {
    id: "n4",
    actionId: "ACT-1044",
    name: "Ação Internacional — Cabo Verde",
    city: "Praia",
    concelho: null,
    country: "Cabo Verde",
    area: "Internacional",
    status: "Em curso",
    createdTime: "2026-02-08T11:15:00Z",
    certified: false,
  },
  {
    id: "n5",
    actionId: "ACT-1045",
    name: "Ubuntu Reconcilia — Sintra",
    city: "Sintra",
    concelho: "Sintra",
    country: "Portugal",
    area: "Reconciliação",
    status: "Cancelada",
    createdTime: "2025-12-19T16:00:00Z",
    certified: false,
  },
  {
    id: "n6",
    actionId: "ACT-1046",
    name: "Avós e Netos — Mafra",
    city: "Mafra",
    concelho: "Mafra",
    country: "Portugal",
    area: "Comunidade",
    status: "Planeada",
    createdTime: "2026-04-01T09:30:00Z",
    certified: true,
  },
];
