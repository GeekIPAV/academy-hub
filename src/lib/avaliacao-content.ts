import type { PageDoc } from "@/lib/avaliacao-types";

export const AVALIACAO_PAGES = [] as const;

export const AVALIACAO_OVERVIEW = [
  ["Socioemocional longitudinal — alunos", "Alunos", "Avaliar o desenvolvimento socioemocional ao longo do tempo.", "Pré/pós/follow-up; auto e heteroavaliação; mapas relacionais.", "Empatia; resiliência; autoconhecimento; autoconfiança; autorregulação; cooperação."],
  ["Socioemocional longitudinal — educadores", "Educadores e profissionais da escola", "Avaliar competências socioemocionais, práticas relacionais e impacto das formações.", "Autoavaliação; heteroavaliação por pares/alunos; pré/pós/follow-up.", "Autoconsciência; autoconfiança; relação com alunos e pares; bem-estar; integração."],
  ["Cidadania ativa", "Alunos", "Medir participação, responsabilidade social e valores democráticos.", "Questionários; observação; registo de participação; narrativas reflexivas.", "Participação; diálogo; serviço; inclusão; responsabilidade social; sentido de pertença."],
  ["Impacto comunitário", "Escola e comunidade", "Avaliar efeitos no ecossistema educativo e comunitário.", "Questionários; redes sociais/relações; observação; indicadores institucionais.", "Capital social; clima relacional; participação; inclusão; bem-estar; gestão de conflitos."],
  ["Narrativas de transformação", "Todos", "Captar mudanças profundas e significativas.", "Testemunhos; histórias de vida; portefólios; Most Significant Change.", "Sentido de propósito; identidade; relações; momentos de viragem; histórias de mudança."],
] as const;

export const emptyPageDoc = (): PageDoc => ({ blocks: [] });
