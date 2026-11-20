/**
 * Jornada do utilizador na Formação de Educadores Ubuntu — conteúdo da página
 * de gestão /admin/jornada. Atualiza o `estado` (e a `fase`) de cada passo à
 * medida que as fases do plano de desbloqueio por etapas entram na plataforma.
 */

export type EstadoPasso = "funciona" | "parcial" | "falta";

export interface PassoJornada {
  titulo: string;
  detalhe: string;
  estado: EstadoPasso;
  /** Fase do plano que fecha este passo (1 a 4), quando ainda não funciona. */
  fase?: 1 | 2 | 3 | 4;
  /** Onde se faz na plataforma. */
  onde?: { label: string; to: string };
}

export interface JornadaTipo {
  id: string;
  nome: string;
  tipo: string;
  resumo: string;
  passos: PassoJornada[];
}

export const ESTADO_LABEL: Record<EstadoPasso, string> = {
  funciona: "Já funciona",
  parcial: "Parcial",
  falta: "Falta",
};

export const FASES_PLANO: Record<number, string> = {
  1: "Calendário ancorado na FTP",
  2: "Etapas com condição",
  3: "Ano letivo, replicações e planos",
  4: "Acreditação",
};

const CALENDARIO = { label: "Programas › Calendário FTP", to: "/equipa/programas" };
const ORGANIZACAO = { label: "A minha organização", to: "/entidade/dashboard" };

/** O ciclo do programa, com a FTP como âncora. */
export const CICLO: PassoJornada[] = [
  {
    titulo: "Planeamento (jun/jul)",
    detalhe: "O IPAV cria as datas de FTP por projeto e programa, os slots da Semana Ubuntu e a Sessão Final.",
    estado: "funciona",
    onde: CALENDARIO,
  },
  {
    titulo: "Inscrição das escolas",
    detalhe: "A escola inscreve-se em 1 ou 2 programas, escolhe a data da FTP para os Educadores e o slot da Semana Ubuntu.",
    estado: "funciona",
    onde: ORGANIZACAO,
  },
  {
    titulo: "FTC (e-learning)",
    detalhe: "Abre 2 semanas antes da FTP: a 1.ª semana para concluir, a 2.ª para a inscrição na FTP.",
    estado: "funciona",
    onde: { label: "E-learning", to: "/elearning" },
  },
  {
    titulo: "FTP (presencial)",
    detalhe: "Turma de 5 a 20 Educadores; só entra quem tem o badge da FTC. O IPAV marca as presenças.",
    estado: "funciona",
  },
  {
    titulo: "Semana Ubuntu",
    detalhe: "Abre só a quem esteve presente na FTP, no slot escolhido pela escola.",
    estado: "funciona",
  },
  {
    titulo: "Sessão Final",
    detalhe: "Fecha o ciclo: certificados e acreditação (3 meses).",
    estado: "parcial",
    fase: 4,
  },
];

export const JORNADAS: JornadaTipo[] = [
  {
    id: "ipav",
    nome: "Equipa IPAV",
    tipo: "Admin e Equipa IPAV",
    resumo: "Planeia o calendário, gere as turmas de cada FTP e reúne as evidências para a acreditação.",
    passos: [
      { titulo: "Cria as datas de FTP", detalhe: "Por projeto e programa, com vagas de 5 a 20 Educadores. Define a FTC do programa.", estado: "funciona", onde: CALENDARIO },
      { titulo: "Abre os slots da Semana Ubuntu", detalhe: "Conforme a disponibilidade da equipa; o máximo conta escolas.", estado: "funciona", onde: CALENDARIO },
      { titulo: "Gere as vagas de cada FTP", detalhe: "Vê as FTP abaixo do mínimo; junta, cancela ou muda escolas de data.", estado: "funciona", onde: CALENDARIO },
      { titulo: "Regista desistências e envia alertas", detalhe: "Alertas diários a quem não concluiu a FTC; na turma da FTP dá mais tempo ou regista a desistência, que trava a etapa seguinte.", estado: "funciona", onde: CALENDARIO },
      { titulo: "Marca as presenças na FTP", detalhe: "Na turma de cada FTP; a presença atribui o badge «Apto para a Semana Ubuntu».", estado: "funciona", onde: CALENDARIO },
      { titulo: "Prepara as Semanas Ubuntu", detalhe: "A partir do alerta de cada escola, com os dados dos alunos.", estado: "funciona" },
      { titulo: "Reúne a acreditação", detalhe: "Presenças, DTP, dados de certificação e declaração do Agrupamento, por turma.", estado: "falta", fase: 4 },
    ],
  },
  {
    id: "escola",
    nome: "Escola em formação",
    tipo: "tipo Entidade (pessoa de contacto)",
    resumo: "Inscreve a escola, escolhe as datas para toda a equipa e acompanha os seus Educadores.",
    passos: [
      { titulo: "Regista a escola", detalhe: "Pelo link Entidades.", estado: "funciona" },
      { titulo: "Escolhe o programa", detalhe: "1.º ciclo, 3.º ciclo e Secundário, Casas de Acolhimento, ou dois no mesmo ano.", estado: "funciona", onde: { label: "Inscrição em programas", to: "/inscricao-programas" } },
      { titulo: "Escolhe a data da FTP", detalhe: "Vale para todos os Educadores da escola. Pode mudar até a FTC abrir.", estado: "funciona", onde: ORGANIZACAO },
      { titulo: "Convida e acompanha os Educadores", detalhe: "Partilha o link da escola e vê quem está inscrito.", estado: "parcial", onde: ORGANIZACAO },
      { titulo: "Escolhe o slot da Semana Ubuntu", detalhe: "Sempre depois da FTP.", estado: "funciona", onde: ORGANIZACAO },
      { titulo: "Envia os dados dos alunos", detalhe: "Excel dos alunos e modelo de autorização dos Encarregados de Educação, no calendário da formação.", estado: "funciona", onde: ORGANIZACAO },
      { titulo: "Envia a declaração do Agrupamento", detalhe: "Com níveis de docência e grupos de recrutamento (modelo do IPAV).", estado: "parcial", fase: 4 },
    ],
  },
  {
    id: "educador",
    nome: "Educador",
    tipo: "tipo Utilizador",
    resumo: "Faz o percurso FTC → FTP → Semana Ubuntu → Sessão Final, ao ritmo da FTP escolhida pela escola.",
    passos: [
      { titulo: "Inscreve-se pelo link da escola", detalhe: "Cria conta, preenche os dados de certificação e entra no programa.", estado: "funciona" },
      { titulo: "A FTC abre 2 semanas antes da FTP", detalhe: "Entra sozinho na turma da FTC da sua FTP e recebe a data por notificação.", estado: "funciona", onde: { label: "E-learning", to: "/elearning" } },
      { titulo: "Conclui e recebe o badge da FTC", detalhe: "Na 1.ª semana.", estado: "funciona" },
      { titulo: "Inscreve-se na FTP", detalhe: "Na 2.ª semana e só com o badge da FTC, no cartão «A tua formação».", estado: "funciona", onde: { label: "Página inicial", to: "/dashboard" } },
      { titulo: "A presença na FTP abre a Semana Ubuntu", detalhe: "Badge automático e bloco da Semana Ubuntu no Centro de recursos.", estado: "funciona" },
      { titulo: "Semana Ubuntu e Sessão Final", detalhe: "Com os recursos e planos de sessão.", estado: "funciona", onde: { label: "Centro de recursos", to: "/recursos" } },
      { titulo: "Portefólio no Moodle da ESEPF", detalhe: "A plataforma mostra o link e o utilizador (apelido e nome).", estado: "falta", fase: 4 },
      { titulo: "Acesso até ao fim do ano letivo", detalhe: "Em agosto fecham a FTC e a Semana Ubuntu, com aviso para descarregar.", estado: "funciona" },
    ],
  },
  {
    id: "plano",
    nome: "Escola com plano",
    tipo: "Entidade com projeto (protocolo A, B ou C)",
    resumo: "Replica a Semana Ubuntu ao abrigo de um protocolo, dentro dos limites do plano.",
    passos: [
      { titulo: "Plano A, B ou C", detalhe: "Associado ao projeto do protocolo, com os limites a contar.", estado: "funciona", onde: { label: "Projetos", to: "/admin/projetos" } },
      { titulo: "Propõe ações de replicação", detalhe: "Na página da organização.", estado: "funciona", onde: ORGANIZACAO },
      { titulo: "Marca a Semana Ubuntu", detalhe: "A equipa recebe um alerta para preparar o material.", estado: "funciona" },
      { titulo: "Envia o Excel e as autorizações", detalhe: "Dados dos alunos e autorizações dos Encarregados de Educação.", estado: "funciona" },
      { titulo: "Regista presenças e emite certificados", detalhe: "Nas ações da organização.", estado: "funciona", onde: ORGANIZACAO },
      { titulo: "Limites do plano", detalhe: "Escolas, Educadores e replicações a contar; bloqueia ou só avisa, conforme o projeto.", estado: "funciona", onde: { label: "Projetos", to: "/admin/projetos" } },
    ],
  },
  {
    id: "isoladas",
    nome: "Participante em ações isoladas",
    tipo: "tipo Utilizador",
    resumo: "Pode estar ao mesmo tempo na formação e em ações isoladas.",
    passos: [
      { titulo: "Inscreve-se numa ação", detalhe: "Pelo link público do evento.", estado: "funciona", onde: { label: "Ações", to: "/acoes" } },
      { titulo: "Tem a presença marcada", detalhe: "Pela equipa ou pela organização.", estado: "funciona" },
      { titulo: "Recebe o certificado", detalhe: "Por email, com verificação pública.", estado: "funciona" },
    ],
  },
];

export const RAIAS = ["Equipa IPAV", "Escola", "Educador", "Plataforma"] as const;
export type Raia = (typeof RAIAS)[number];

export interface FaseFluxo {
  id: string;
  titulo: string;
  passos: Partial<Record<Raia, PassoJornada[]>>;
  decisao?: string;
}

/** Fluxo detalhado: quem faz o quê em cada fase. */
export const FLUXO: FaseFluxo[] = [
  {
    id: "a",
    titulo: "A · Planeamento e inscrições (junho/julho)",
    passos: {
      "Equipa IPAV": [
        { titulo: "Cria as datas de FTP e os slots da Semana", detalhe: "Por projeto e programa.", estado: "funciona" },
        { titulo: "Gere as vagas", detalhe: "Turmas de 5 a 20; junta ou cancela uma FTP.", estado: "funciona" },
      ],
      Escola: [
        { titulo: "Inscreve-se em 1 ou 2 programas", detalhe: "Pelo link Entidades.", estado: "funciona" },
        { titulo: "Escolhe a FTP e o slot da Semana", detalhe: "Para toda a equipa.", estado: "funciona" },
        { titulo: "Convida os Educadores", detalhe: "Pelo link da escola.", estado: "parcial" },
      ],
      Educador: [{ titulo: "Cria conta e entra no programa", detalhe: "Pelo link da escola.", estado: "funciona" }],
      Plataforma: [{ titulo: "Liga o Educador à FTP da escola", detalhe: "Inscreve-o na turma da FTC dessa FTP.", estado: "funciona" }],
    },
  },
  {
    id: "b",
    titulo: "B · FTC: abre 2 semanas antes da FTP (e-learning a partir de janeiro)",
    decisao: "Concluiu na 1.ª semana? Se não, o IPAV dá mais tempo ou regista a desistência.",
    passos: {
      "Equipa IPAV": [{ titulo: "Recebe alerta; regista desistência ou dá mais tempo", detalhe: "Para quem não concluiu.", estado: "funciona" }],
      Educador: [{ titulo: "1.ª semana: faz os módulos da FTC", detalhe: "Em e-learning.", estado: "funciona" }],
      Plataforma: [
        { titulo: "Abre a FTC 14 dias antes da FTP", detalhe: "E avisa os Educadores.", estado: "funciona" },
        { titulo: "Atribui o badge da FTC", detalhe: "Ao concluir o curso.", estado: "funciona" },
      ],
    },
  },
  {
    id: "c",
    titulo: "C · FTP presencial (turma de acreditação: 5 a 20 Educadores)",
    decisao: "Esteve presente? Se não, a escola é avisada e a Semana Ubuntu não abre.",
    passos: {
      "Equipa IPAV": [{ titulo: "No dia da FTP, marca as presenças", detalhe: "Na plataforma.", estado: "funciona" }],
      Escola: [{ titulo: "Desistência: a escola é avisada", detalhe: "A Semana Ubuntu não abre a esse Educador.", estado: "funciona" }],
      Educador: [{ titulo: "2.ª semana: inscreve-se na FTP", detalhe: "Só com o badge da FTC.", estado: "funciona" }],
      Plataforma: [{ titulo: "Atribui o badge «Apto para a Semana Ubuntu»", detalhe: "Ao marcar a presença.", estado: "funciona" }],
    },
  },
  {
    id: "d",
    titulo: "D · Semana Ubuntu (no slot escolhido pela escola)",
    passos: {
      "Equipa IPAV": [{ titulo: "Recebe alerta e prepara o material", detalhe: "", estado: "funciona" }],
      Escola: [{ titulo: "Marca a Semana, envia o Excel e as autorizações EE", detalhe: "", estado: "funciona" }],
      Educador: [{ titulo: "Vive a Semana Ubuntu", detalhe: "Com recursos e planos de sessão.", estado: "funciona" }],
      Plataforma: [{ titulo: "Abre o bloco Semana Ubuntu no Centro de recursos", detalhe: "", estado: "funciona" }],
    },
  },
  {
    id: "e",
    titulo: "E · Sessão Final, acreditação e fim do ano letivo",
    passos: {
      "Equipa IPAV": [
        { titulo: "Organiza a Sessão Final", detalhe: "", estado: "funciona" },
        { titulo: "Reúne evidências e dados de certificação", detalhe: "Presenças, DTP.", estado: "falta", fase: 4 },
      ],
      Escola: [{ titulo: "Envia a declaração do Agrupamento", detalhe: "Modelo do IPAV.", estado: "parcial", fase: 4 }],
      Educador: [
        { titulo: "Participa na Sessão Final", detalhe: "", estado: "funciona" },
        { titulo: "Submete portefólio e relatório no Moodle", detalhe: "Acreditação.", estado: "falta", fase: 4 },
      ],
      Plataforma: [
        { titulo: "Mostra o link e o utilizador do Moodle da ESEPF", detalhe: "", estado: "falta", fase: 4 },
        { titulo: "Em agosto fecha a FTC e a Semana Ubuntu", detalhe: "Com aviso para descarregar.", estado: "funciona" },
      ],
    },
  },
];

export function contarEstados(passos: PassoJornada[]): Record<EstadoPasso, number> {
  const out: Record<EstadoPasso, number> = { funciona: 0, parcial: 0, falta: 0 };
  for (const p of passos) out[p.estado]++;
  return out;
}
