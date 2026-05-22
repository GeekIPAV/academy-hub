export interface I18nText {
  pt: string;
  en: string;
}

export interface Article {
  id: number;
  issue: number;
  year: number;
  title: I18nText;
  subtitle: I18nText;
  authors: string[];
  affiliations: string[];
  language: "pt" | "en";
  abstract: I18nText;
  objectives: I18nText[];
  methodology: I18nText;
  methodologyDetail: I18nText;
  sampleType: I18nText;
  sampleDetail: I18nText;
  instruments: I18nText[];
  pages: string;
  keyFindings: I18nText[];
  mainResults: I18nText;
  limitations: I18nText;
  recommendations: I18nText;
  conclusion: I18nText;
  tags: I18nText[];
  impactArea: I18nText;
  resultType: "positive" | "exploratory" | "reflective";
  references: string[];
}

export const articles: Article[] = [
  // ===== ISSUE 1 (2023) =====
  {
    id: 101,
    issue: 1,
    year: 2023,
    title: {
      pt: "Ubuntu Leaders Academies in Schools – Relatório",
      en: "Ubuntu Leaders Academies in Schools – Report",
    },
    subtitle: {
      pt: "Relatório de uma consultora externa sobre o funcionamento da Academia de Líderes Ubuntu nas escolas portuguesas",
      en: "An external consultant's report on the functioning of the Ubuntu Leaders Academy in Portuguese schools",
    },
    authors: ["Jennifer Adams"],
    language: "en",
    affiliations: ["Educating Leaders, Consulting"],
    abstract: {
      pt: "Relatório de consultoria externa que analisa o funcionamento da Academia de Líderes Ubuntu (ALU) nas escolas portuguesas, estabelecendo o alinhamento com modelos internacionais de aprendizagem socioemocional (SEL), incluindo o CASEL, a Karanga e o OECD Survey on Social and Emotional Skills. Baseado em observações e discussões em escolas Ubuntu de Sintra e Tomar, bem como na participação no Ubuntu Fest 2022.",
      en: "External consultancy report analyzing the functioning of the Ubuntu Leaders Academy (ALU) in Portuguese schools, establishing alignment with international social-emotional learning (SEL) models, including CASEL, Karanga and the OECD Survey on Social and Emotional Skills. Based on observations and discussions at Ubuntu schools in Sintra and Tomar, as well as participation in Ubuntu Fest 2022.",
    },
    objectives: [
      { pt: "Estabelecer o alinhamento entre a ALU e a aprendizagem socioemocional (SEL)", en: "Establish alignment between ALU and social-emotional learning (SEL)" },
      { pt: "Identificar pontos fortes da implementação da ALU nas escolas", en: "Identify strengths of ALU implementation in schools" },
      { pt: "Levantar questões para reflexão e propor próximos passos", en: "Raise questions for reflection and propose next steps" },
    ],
    methodology: { pt: "Relatório de consultoria externa", en: "External consultancy report" },
    methodologyDetail: {
      pt: "Observação direta em escolas Ubuntu de Sintra e Tomar, discussões com lideranças da Fundação Gulbenkian e do IPAV, participação no Ubuntu Fest 2022 e análise comparativa com frameworks internacionais de SEL.",
      en: "Direct observation at Ubuntu schools in Sintra and Tomar, discussions with Gulbenkian Foundation and IPAV leadership, participation in Ubuntu Fest 2022 and comparative analysis with international SEL frameworks.",
    },
    sampleType: { pt: "Escolas Ubuntu em Sintra e Tomar", en: "Ubuntu Schools in Sintra and Tomar" },
    sampleDetail: {
      pt: "Três escolas Ubuntu em Sintra e Tomar, com participação de diretores, professores, funcionários, pais e alunos em grupos focais e sessões de observação.",
      en: "Three Ubuntu schools in Sintra and Tomar, with participation of principals, teachers, staff, parents and students in focus groups and observation sessions.",
    },
    instruments: [
      { pt: "Observação direta", en: "Direct observation" },
      { pt: "Grupos focais com stakeholders", en: "Stakeholder focus groups" },
      { pt: "Análise documental de frameworks SEL", en: "Document analysis of SEL frameworks" },
    ],
    pages: "17–34",
    keyFindings: [
      { pt: "A ALU está bem alinhada com os modelos internacionais de SEL (CASEL, Karanga, OCDE).", en: "ALU is well aligned with international SEL models (CASEL, Karanga, OECD)." },
      { pt: "A implementação excele pelo envolvimento de múltiplos stakeholders: Fundação Gulbenkian, municípios, Ministério da Educação e instituições de ensino superior.", en: "Implementation excels through multi-stakeholder engagement: Gulbenkian Foundation, municipalities, Ministry of Education and higher education institutions." },
      { pt: "O modelo de co-facilitação entre equipa Ubuntu e pessoal escolar garante consistência e contextualização local.", en: "The co-facilitation model between Ubuntu team and school staff ensures consistency and local contextualization." },
      { pt: "Os alunos relatam: 'Já não temos uma turma, temos uma família' – evidenciando transformação relacional profunda.", en: "Students report: 'We no longer have a class, we have a family' – evidencing deep relational transformation." },
    ],
    conclusion: {
      pt: "A Academia de Líderes Ubuntu está bem posicionada como programa de SEL de referência, com implementação de qualidade sustentada por parcerias estratégicas, liderança central e local, e um modelo de formação que transforma a cultura escolar.",
      en: "The Ubuntu Leaders Academy is well positioned as a benchmark SEL program, with quality implementation sustained by strategic partnerships, central and local leadership, and a training model that transforms school culture.",
    },
    mainResults: {
      pt: "O programa ALU está bem alinhado com os três principais modelos internacionais de SEL. A implementação excele em seis áreas: seleção inicial do programa, envolvimento de múltiplos stakeholders, equilíbrio entre prescrição e autonomia, liderança central e local, envolvimento nas escolas e avaliação do programa. O modelo de co-facilitação entre equipa Ubuntu e pessoal escolar garante consistência e contextualização. Os alunos relatam transformação relacional profunda.",
      en: "The ALU program is well aligned with the three main international SEL models. Implementation excels in six areas: initial program selection, multi-stakeholder engagement, balance between prescription and autonomy, central and local leadership, school engagement and program evaluation. The co-facilitation model ensures consistency and contextualization. Students report deep relational transformation.",
    },
    limitations: {
      pt: "Relatório baseado em observações preliminares e conhecimento inicial do programa; não constitui uma avaliação longitudinal.",
      en: "Report based on preliminary observations and initial program knowledge; does not constitute a longitudinal evaluation.",
    },
    recommendations: {
      pt: "Desenvolver protocolos de comunicação com pais para crianças mais novas; criar protocolos para situações de abuso partilhadas durante as sessões; consolidar linhas de investigação do Conselho Científico.",
      en: "Develop parent communication protocols for younger children; create protocols for abuse situations shared during sessions; consolidate Scientific Council research lines.",
    },
    tags: [
      { pt: "SEL", en: "SEL" },
      { pt: "Implementação", en: "Implementation" },
      { pt: "Consultoria", en: "Consultancy" },
      { pt: "Alinhamento Internacional", en: "International Alignment" },
    ],
    impactArea: { pt: "Política Educativa", en: "Education Policy" },
    resultType: "positive",
    references: [
      "CASEL (2022). Retrieved from https://casel.org/core-competencies.",
      "Chernyshenko, O., Kankaraš, M., & Drasgow, F. (2018). Social and Emotional Skills for Student Success and Well-being. OECD Education Working Paper No. 173, Paris: OECD.",
      "Fullan, M. & Gallagher, M.J. (2020). The Devil is in the Details: System solutions for equity, excellence, and student well-being. Corwin Press.",
      "Karanga (2022). Retrieved from https://karangaglobal.org.",
      "Kautz, T., Heckman, J., Diris, R., ter Weel, B., & Borghans, L. (2014). Fostering and Measuring Skills: Improving Cognitive and Non-Cognitive Skills to Promote Lifetime Success. Paris: OECD.",
      "OECD (2021). Beyond Academic Learning: First Results from the Survey of Social and Emotional Skills. OECD Publishing, Paris.",
      "Ontario Ministry of Education (2013). School Effectiveness Framework: A support for school improvement and student success. Toronto.",
    ],
  },
  {
    id: 102,
    issue: 1,
    year: 2023,
    title: {
      pt: "Semanas Ubuntu em Escolas de 3.º Ciclo e Secundário",
      en: "Ubuntu Weeks in Lower and Upper Secondary Schools",
    },
    subtitle: {
      pt: "Resultados do projeto Academias Gulbenkian do Conhecimento",
      en: "Results from the Gulbenkian Knowledge Academies project",
    },
    authors: ["Madalena Alarcão"],
    language: "pt",
    affiliations: ["Universidade de Coimbra, Faculdade de Psicologia e Ciências da Educação, Centro de Estudos Sociais"],
    abstract: {
      pt: "Este estudo avalia os efeitos da Semana Ubuntu em alunos do 3.º ciclo e secundário, no âmbito das Academias Gulbenkian do Conhecimento. Recorrendo a um desenho quase-experimental com 203 participantes (103 no grupo de estudo e 100 no grupo de controlo), avalia competências socioemocionais em dois momentos (pré e pós-teste), analisando também a satisfação dos alunos e as redes sociais de confiança e conflito na turma.",
      en: "This study evaluates the effects of Ubuntu Week on lower and upper secondary students, within the Gulbenkian Knowledge Academies. Using a quasi-experimental design with 203 participants (103 in the study group and 100 in the control group), it assesses social-emotional competencies at two time points (pre and post-test), also analyzing student satisfaction and trust and conflict social networks in the classroom.",
    },
    objectives: [
      { pt: "Estudar os efeitos da Semana Ubuntu nas competências socioemocionais dos alunos", en: "Study the effects of Ubuntu Week on students' social-emotional competencies" },
      { pt: "Avaliar diferenças entre sexos nas competências socioemocionais", en: "Assess gender differences in social-emotional competencies" },
      { pt: "Avaliar a satisfação dos jovens com a Semana Ubuntu", en: "Evaluate youth satisfaction with Ubuntu Week" },
      { pt: "Avaliar a satisfação diária com a metodologia Ubuntu", en: "Evaluate daily satisfaction with the Ubuntu methodology" },
    ],
    methodology: { pt: "Desenho quase-experimental (pré/pós-teste)", en: "Quasi-experimental design (pre/post-test)" },
    methodologyDetail: {
      pt: "Desenho quase-experimental comparando dois momentos (pré-teste 8 dias antes, pós-teste 15 dias depois) e dois grupos distintos. Utilização do OECD Survey on Social and Emotional Skills em sete dimensões (assertividade, autocontrolo, empatia, otimismo, resiliência, sociabilidade e tolerância) e da Análise da Rede Social na Turma.",
      en: "Quasi-experimental design comparing two time points (pre-test 8 days before, post-test 15 days after) and two distinct groups. Use of the OECD Survey on Social and Emotional Skills across seven dimensions (assertiveness, self-control, empathy, optimism, resilience, sociability and tolerance) and Social Network Analysis in the Classroom.",
    },
    sampleType: { pt: "203 alunos (103 GE + 100 GC)", en: "203 students (103 SG + 100 CG)" },
    sampleDetail: {
      pt: "336 alunos recrutados de 3 agrupamentos da zona norte de Portugal, resultando em 203 protocolos válidos: 103 alunos no grupo de estudo (GE) e 100 no grupo de controlo (GC). Idade média de 15.81 anos (DP=1.20), 57.6% do sexo feminino, maioria do 9.º ano.",
      en: "336 students recruited from 3 school clusters in northern Portugal, resulting in 203 valid protocols: 103 students in the study group (SG) and 100 in the control group (CG). Mean age 15.81 years (SD=1.20), 57.6% female, mostly 9th grade.",
    },
    instruments: [
      { pt: "OECD Survey on Social and Emotional Skills (56 itens, versão crianças; 21 itens, versão educadores)", en: "OECD Survey on Social and Emotional Skills (56 items, child version; 21 items, educator version)" },
      { pt: "Análise da Rede Social na Turma (confiança e conflito)", en: "Social Network Analysis in the Classroom (trust and conflict)" },
      { pt: "Questionário de Avaliação do Impacto ALU-Escolas (11 itens)", en: "ALU-Schools Impact Assessment Questionnaire (11 items)" },
      { pt: "Questionário de Satisfação com a Formação ALU (8 parâmetros)", en: "ALU Training Satisfaction Questionnaire (8 parameters)" },
      { pt: "Questionários de Avaliação Diária (5, um por dia)", en: "Daily Assessment Questionnaires (5, one per day)" },
    ],
    pages: "35–69",
    keyFindings: [
      { pt: "Diferenças estatisticamente significativas em assertividade, empatia, sociabilidade e tolerância após a Semana Ubuntu.", en: "Statistically significant differences in assertiveness, empathy, sociability and tolerance after Ubuntu Week." },
      { pt: "Os educadores percecionam um impacto ainda maior que os próprios alunos.", en: "Educators perceive an even greater impact than the students themselves." },
      { pt: "Aumento expressivo de relações de confiança na turma, mais transversais e menos mediadas por poucos alunos.", en: "Significant increase in trust relationships in the classroom, more cross-cutting and less mediated by few students." },
      { pt: "Satisfação dos alunos com a formação muito elevada em todos os parâmetros avaliados.", en: "Very high student satisfaction with the training across all assessed parameters." },
    ],
    conclusion: {
      pt: "Os resultados evidenciam ganhos significativos em competências socioemocionais, confirmados tanto pelos alunos como pelos educadores, com o método Ubuntu a demonstrar potencial validado como metodologia de referência para o desenvolvimento socioemocional.",
      en: "Results show significant gains in social-emotional competencies, confirmed by both students and educators, with the Ubuntu method demonstrating validated potential as a benchmark methodology for social-emotional development.",
    },
    mainResults: {
      pt: "Diferenças estatisticamente significativas no pós-teste em assertividade (p=0.004), empatia (p=0.01), sociabilidade (p=0.02) e tolerância (p=0.001). Os educadores percecionam impacto ainda maior. Aumento expressivo da densidade das redes de confiança na turma, tornando-as mais transversais. Satisfação muito elevada dos alunos com valores médios de 8.1–9.6 em escala de 10 pontos.",
      en: "Statistically significant post-test differences in assertiveness (p=0.004), empathy (p=0.01), sociability (p=0.02) and tolerance (p=0.001). Educators perceive even greater impact. Significant increase in classroom trust network density, making them more cross-cutting. Very high student satisfaction with mean values of 8.1–9.6 on a 10-point scale.",
    },
    limitations: {
      pt: "A investigação decorreu durante a pandemia Covid-19, afetando a aplicação de alguns protocolos. A seleção dos grupos não foi aleatória. A dimensão da amostra válida (60.4% dos recrutados) pode limitar a generalização.",
      en: "The research took place during the Covid-19 pandemic, affecting the application of some protocols. Group selection was not random. The valid sample size (60.4% of recruited) may limit generalization.",
    },
    recommendations: {
      pt: "Expandir a metodologia a mais escolas e realizar estudos longitudinais para avaliar a durabilidade dos efeitos. Aprofundar o estudo da dimensão resiliência/resistência ao stresse.",
      en: "Expand the methodology to more schools and conduct longitudinal studies to assess the durability of effects. Deepen the study of the resilience/stress resistance dimension.",
    },
    tags: [
      { pt: "Quase-Experimental", en: "Quasi-Experimental" },
      { pt: "Competências Socioemocionais", en: "Social-Emotional Competencies" },
      { pt: "Gulbenkian", en: "Gulbenkian" },
      { pt: "Validação", en: "Validation" },
    ],
    impactArea: { pt: "Ensino Básico e Secundário", en: "Primary and Secondary Education" },
    resultType: "positive",
    references: [
      "Academias Gulbenkian do Conhecimento (2019). OECD Survey on Social and Emotional Skills.",
      "Alarcão, M. & Ramos, S. (2022). Relatório Final do Projeto Academias Gulbenkian do Conhecimento – Semanas Ubuntu. IPAV.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "Gonçalves, J. L. & Alarcão, M. (2021). Desafios da Educação em tempos de (pós)pandemia: o contributo Ubuntu. IPAV.",
      "IPAV (2018). Questionário de Avaliação do Impacto ALU-Escolas.",
      "IPAV (2023). Academia de Líderes Ubuntu. https://www.academialideresubuntu.org.",
      "Ramos, S., Nunes da Silva, A. & Alarcão, M. (2022). Análise da Rede Social na Turma. In Alarcão & Ramos, Relatório Final AGC.",
    ],
  },
  {
    id: 103,
    issue: 1,
    year: 2023,
    title: {
      pt: "À Beira do(s) Outro(s) e com o(s) Outro(s)",
      en: "At the Edge of the Other(s) and with the Other(s)",
    },
    subtitle: {
      pt: "A estratégia institucional de uma Escola Ubuntu",
      en: "The institutional strategy of an Ubuntu School",
    },
    authors: ["Daniela Gonçalves", "Júlio Gonçalves Santos"],
    language: "pt",
    affiliations: ["Escola Superior de Educação Paula Frassinetti", "Universidade Católica Portuguesa"],
    abstract: {
      pt: "Estudo de caso que analisa a estratégia institucional de uma Escola Ubuntu, investigando a adesão da comunidade educativa ao programa e o seu impacto ao nível das pessoas e da própria escola. Através de consulta documental e da audição de vozes do diretor, alunos e educadores, o estudo sublinha a horizontalidade relacional e o papel do Clube Ubuntu como elemento de amplificação da filosofia.",
      en: "Case study analyzing the institutional strategy of an Ubuntu School, investigating the educational community's adherence to the program and its impact on people and the school itself. Through document analysis and hearing the voices of the principal, students and educators, the study highlights relational horizontality and the role of the Ubuntu Club as an amplifier of the philosophy.",
    },
    objectives: [
      { pt: "Compreender a adesão da comunidade educativa ao programa Escolas Ubuntu", en: "Understand the educational community's adherence to the Ubuntu Schools program" },
      { pt: "Analisar o impacto da experiência Ubuntu nas relações interpessoais", en: "Analyze the impact of the Ubuntu experience on interpersonal relationships" },
      { pt: "Avaliar o papel do Clube Ubuntu na institucionalização da filosofia", en: "Assess the role of the Ubuntu Club in institutionalizing the philosophy" },
    ],
    methodology: { pt: "Estudo de caso", en: "Case study" },
    methodologyDetail: {
      pt: "Estudo de caso baseado em consulta documental (projeto educativo, planos de atividades, relatórios) e entrevistas semiestruturadas ao diretor do agrupamento, alunos e educadores que realizaram a formação Ubuntu.",
      en: "Case study based on document analysis (educational project, activity plans, reports) and semi-structured interviews with the school cluster principal, students and educators who completed Ubuntu training.",
    },
    sampleType: { pt: "Comunidade educativa de uma escola", en: "Educational community of a school" },
    sampleDetail: {
      pt: "Comunidade educativa de um agrupamento escolar: diretor, corpo docente, alunos que participaram na Semana Ubuntu e membros do Clube Ubuntu.",
      en: "Educational community of a school cluster: principal, teaching staff, students who participated in Ubuntu Week and Ubuntu Club members.",
    },
    instruments: [
      { pt: "Análise documental", en: "Document analysis" },
      { pt: "Entrevistas semiestruturadas", en: "Semi-structured interviews" },
      { pt: "Observação participante", en: "Participant observation" },
    ],
    pages: "70–94",
    keyFindings: [
      { pt: "Forte adesão da comunidade educativa ao programa Escolas Ubuntu.", en: "Strong adherence of the educational community to the Ubuntu Schools program." },
      { pt: "A horizontalidade relacional é um resultado sublinhado: 'estamos todos no mesmo patamar'.", en: "Relational horizontality is a highlighted result: 'we are all on the same level'." },
      { pt: "O Clube Ubuntu funciona como elemento de amplificação e institucionalização da filosofia Ubuntu.", en: "The Ubuntu Club functions as an element of amplification and institutionalization of the Ubuntu philosophy." },
      { pt: "'Vestir a camisola Ubuntu significa esperança, um momento marcante para toda a vida e uma enorme responsabilidade.'", en: "'Wearing the Ubuntu jersey means hope, a life-changing moment and an enormous responsibility.'" },
    ],
    conclusion: {
      pt: "A experiência Ubuntu transforma as relações dentro da escola, promovendo uma horizontalidade relacional que envolve toda a comunidade educativa e se institucionaliza através do Clube Ubuntu.",
      en: "The Ubuntu experience transforms relationships within the school, promoting relational horizontality that involves the entire educational community and is institutionalized through the Ubuntu Club.",
    },
    mainResults: {
      pt: "Forte adesão de toda a comunidade educativa ao programa. A horizontalidade relacional emerge como resultado central: 'estamos todos no mesmo patamar'. O Clube Ubuntu funciona como amplificador institucional da filosofia. A experiência é descrita como 'esperança, um momento marcante para toda a vida e uma enorme responsabilidade'.",
      en: "Strong adherence of the entire educational community to the program. Relational horizontality emerges as a central result: 'we are all on the same level'. The Ubuntu Club functions as an institutional amplifier of the philosophy. The experience is described as 'hope, a life-changing moment and an enormous responsibility'.",
    },
    limitations: { pt: "Estudo de caso único, limitando a generalização dos resultados a outros contextos escolares.", en: "Single case study, limiting generalization of results to other school contexts." },
    recommendations: { pt: "Replicar o estudo em diferentes agrupamentos para verificar a consistência dos resultados. Aprofundar o papel dos Clubes Ubuntu na sustentabilidade a longo prazo.", en: "Replicate the study in different school clusters to verify consistency of results. Deepen the role of Ubuntu Clubs in long-term sustainability." },
    tags: [
      { pt: "Estudo de Caso", en: "Case Study" },
      { pt: "Institucionalização", en: "Institutionalization" },
      { pt: "Horizontalidade", en: "Horizontality" },
      { pt: "Clube Ubuntu", en: "Ubuntu Club" },
    ],
    impactArea: { pt: "Gestão Escolar", en: "School Management" },
    resultType: "positive",
    references: [
      "Gonçalves, D. & Santos, J. G. (2023). A estratégia institucional de uma Escola Ubuntu. Ubuntu: Revista de Ciências Sociais, 1, 70–94.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "IPAV (2023). Programa Escolas Ubuntu. https://www.academialideresubuntu.org.",
      "Yin, R. K. (2018). Case Study Research and Applications: Design and Methods. 6th ed. Sage Publications.",
    ],
  },
  {
    id: 104,
    issue: 1,
    year: 2023,
    title: {
      pt: "Ubuntu numa Escola de Segunda Oportunidade",
      en: "Ubuntu in a Second Chance School",
    },
    subtitle: {
      pt: "Contributos para a ressocialização de jovens em risco psicossocial",
      en: "Contributions to the resocialization of youth at psychosocial risk",
    },
    authors: ["Elsa Montenegro Marques", "Susana Caires"],
    language: "pt",
    affiliations: ["Instituto Superior de Serviço Social do Porto", "Universidade do Minho"],
    abstract: {
      pt: "Estudo qualitativo que investiga o potencial do método Ubuntu na ressocialização de jovens em risco psicossocial numa Escola de Segunda Oportunidade. Pela voz dos jovens e educadores, analisa a intensidade da experiência Ubuntu, o ambiente de identificação afetiva e linguagem comum, e o potencial transformador para jovens em situação de exclusão.",
      en: "Qualitative study investigating the potential of the Ubuntu method in resocializing youth at psychosocial risk in a Second Chance School. Through the voices of youth and educators, it analyzes the intensity of the Ubuntu experience, the environment of affective identification and common language, and the transformative potential for youth in situations of exclusion.",
    },
    objectives: [
      { pt: "Compreender o impacto da Semana Ubuntu em jovens em risco de exclusão", en: "Understand the impact of Ubuntu Week on youth at risk of exclusion" },
      { pt: "Analisar as relações entre educadores e jovens durante a experiência Ubuntu", en: "Analyze relationships between educators and youth during the Ubuntu experience" },
      { pt: "Avaliar o potencial do método na ressocialização", en: "Assess the method's potential for resocialization" },
    ],
    methodology: { pt: "Estudo qualitativo", en: "Qualitative study" },
    methodologyDetail: {
      pt: "Estudo qualitativo com recolha de dados através de entrevistas semiestruturadas individuais e em grupo focal com jovens e educadores, complementada por observação participante durante a Semana Ubuntu.",
      en: "Qualitative study with data collection through individual and focus group semi-structured interviews with youth and educators, complemented by participant observation during Ubuntu Week.",
    },
    sampleType: { pt: "Jovens e educadores de escola de 2ª oportunidade", en: "Youth and educators from a second chance school" },
    sampleDetail: {
      pt: "Jovens em situação de risco psicossocial e educadores de uma Escola de Segunda Oportunidade, incluindo participantes da Semana Ubuntu e equipa pedagógica.",
      en: "Youth at psychosocial risk and educators from a Second Chance School, including Ubuntu Week participants and pedagogical team.",
    },
    instruments: [
      { pt: "Entrevistas semiestruturadas", en: "Semi-structured interviews" },
      { pt: "Grupos focais", en: "Focus groups" },
      { pt: "Observação participante", en: "Participant observation" },
      { pt: "Análise de conteúdo", en: "Content analysis" },
    ],
    pages: "95–130",
    keyFindings: [
      { pt: "Ambiente de 'forte identificação afetiva' e 'linguagem comum' entre jovens e educadores.", en: "Environment of 'strong affective identification' and 'common language' between youth and educators." },
      { pt: "O método Ubuntu tem enorme potencial na ressocialização de jovens em risco de exclusão.", en: "The Ubuntu method has enormous potential in resocializing youth at risk of exclusion." },
      { pt: "Educadores ultrapassam a função tradicional do professor, criando vínculos mais profundos.", en: "Educators go beyond the traditional teacher role, creating deeper bonds." },
      { pt: "Os jovens refletiram sobre si mesmos e permitiram-se aprender dos colegas, reconhecendo-se mutuamente.", en: "Youth reflected on themselves and allowed themselves to learn from peers, recognizing each other mutually." },
    ],
    conclusion: {
      pt: "A Semana Ubuntu demonstra potencial transformador na ressocialização de jovens em risco, proporcionando um espaço onde educadores e alunos se encontram em relações de identificação afetiva e aprendizagem mútua.",
      en: "Ubuntu Week demonstrates transformative potential in resocializing at-risk youth, providing a space where educators and students meet in relationships of affective identification and mutual learning.",
    },
    mainResults: {
      pt: "A experiência proporcionou um ambiente de 'forte identificação afetiva' e 'linguagem comum'. Os educadores ultrapassaram a função tradicional do professor, criando vínculos mais profundos. Os jovens refletiram sobre si mesmos, reconhecendo-se mutuamente e permitindo-se aprender dos colegas. O método demonstrou enorme potencial na ressocialização.",
      en: "The experience provided an environment of 'strong affective identification' and 'common language'. Educators went beyond the traditional teacher role, creating deeper bonds. Youth reflected on themselves, recognizing each other mutually and allowing themselves to learn from peers. The method demonstrated enormous resocialization potential.",
    },
    limitations: { pt: "Estudo realizado numa única escola, com uma população muito específica. A curta duração da Semana Ubuntu pode limitar a profundidade das transformações.", en: "Study conducted in a single school with a very specific population. The short duration of Ubuntu Week may limit the depth of transformations." },
    recommendations: { pt: "Alargar a experiência Ubuntu a toda a comunidade educativa. Garantir a continuidade do programa para além da Semana Ubuntu. Realizar estudos longitudinais com populações em risco.", en: "Extend the Ubuntu experience to the entire educational community. Ensure program continuity beyond Ubuntu Week. Conduct longitudinal studies with at-risk populations." },
    tags: [
      { pt: "Ressocialização", en: "Resocialization" },
      { pt: "Jovens em Risco", en: "At-Risk Youth" },
      { pt: "Escola de 2ª Oportunidade", en: "Second Chance School" },
      { pt: "Inclusão", en: "Inclusion" },
    ],
    impactArea: { pt: "Inclusão Social", en: "Social Inclusion" },
    resultType: "positive",
    references: [
      "Marques, E. M. & Caires, S. (2023). Ubuntu numa Escola de Segunda Oportunidade. Ubuntu: Revista de Ciências Sociais, 1, 95–130.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "Canário, R. (2007). Escolas de 2.ª Oportunidade: um olhar sobre as práticas educativas. Análise Social, 42(184), 617–637.",
      "Freire, P. (1970). Pedagogia do Oprimido. Paz e Terra.",
    ],
  },
  {
    id: 105,
    issue: 1,
    year: 2023,
    title: {
      pt: "Academia de Líderes Ubuntu na Escola",
      en: "Ubuntu Leaders Academy at School",
    },
    subtitle: {
      pt: "Diretora e assistentes operacionais identificam os impactos no Agrupamento de Escolas Professor Agostinho da Silva",
      en: "Principal and operational assistants identify impacts at the Professor Agostinho da Silva School Cluster",
    },
    authors: ["Susana Fonseca"],
    language: "pt",
    affiliations: ["Escola Superior de Educação Paula Frassinetti"],
    abstract: {
      pt: "Estudo de caso que investiga os impactos da Academia de Líderes Ubuntu no Agrupamento de Escolas Professor Agostinho da Silva, focando a perspetiva da diretora e das assistentes operacionais. Analisa transformações pessoais e profissionais, incluindo a redescoberta do autoconhecimento, mudanças na interação com alunos e a integração dos cinco pilares Ubuntu no projeto educativo.",
      en: "Case study investigating the impacts of the Ubuntu Leaders Academy at the Professor Agostinho da Silva School Cluster, focusing on the perspective of the principal and operational assistants. Analyzes personal and professional transformations, including the rediscovery of self-knowledge, changes in interaction with students and the integration of the five Ubuntu pillars into the educational project.",
    },
    objectives: [
      { pt: "Identificar os impactos da ALU na diretora e assistentes operacionais", en: "Identify ALU impacts on the principal and operational assistants" },
      { pt: "Compreender as transformações pessoais e profissionais geradas", en: "Understand the personal and professional transformations generated" },
      { pt: "Analisar a integração dos pilares Ubuntu no projeto educativo", en: "Analyze the integration of Ubuntu pillars into the educational project" },
    ],
    methodology: { pt: "Estudo de caso", en: "Case study" },
    methodologyDetail: {
      pt: "Estudo de caso com entrevistas semiestruturadas à diretora e assistentes operacionais do agrupamento, complementado com análise documental do projeto educativo e observação das práticas quotidianas.",
      en: "Case study with semi-structured interviews of the principal and operational assistants of the cluster, complemented with document analysis of the educational project and observation of daily practices.",
    },
    sampleType: { pt: "Diretora e assistentes operacionais", en: "Principal and operational assistants" },
    sampleDetail: {
      pt: "Diretora do agrupamento e assistentes operacionais que participaram na formação Ubuntu.",
      en: "Cluster principal and operational assistants who participated in Ubuntu training.",
    },
    instruments: [
      { pt: "Entrevistas semiestruturadas", en: "Semi-structured interviews" },
      { pt: "Análise documental", en: "Document analysis" },
      { pt: "Análise de conteúdo (Bardin)", en: "Content analysis (Bardin)" },
    ],
    pages: "131–161",
    keyFindings: [
      { pt: "Redescoberta pessoal (autoconhecimento) e transformações pessoais e profissionais significativas.", en: "Personal rediscovery (self-knowledge) and significant personal and professional transformations." },
      { pt: "Olhares mais atentos, preocupação em compreender o outro e mudança na interação com alunos.", en: "More attentive perspectives, concern for understanding others and changes in interaction with students." },
      { pt: "Integração dos cinco pilares Ubuntu no projeto educativo do agrupamento.", en: "Integration of the five Ubuntu pillars into the cluster's educational project." },
      { pt: "A experiência permite 'dar importância' à pessoa e 'vai muito para além dos cinco dias da Semana'.", en: "The experience allows 'giving importance' to the person and 'goes far beyond the five days of the Week'." },
    ],
    conclusion: {
      pt: "A experiência Ubuntu transforma o pessoal não docente, promovendo autoconhecimento e mudança relacional, com os cinco pilares a integrarem-se no projeto educativo do agrupamento de forma sustentável.",
      en: "The Ubuntu experience transforms non-teaching staff, promoting self-knowledge and relational change, with the five pillars sustainably integrating into the cluster's educational project.",
    },
    mainResults: {
      pt: "Redescoberta pessoal e transformações significativas: olhares mais atentos, preocupação em compreender o outro, mudança na interação com alunos, maior facilidade no trabalho em equipa. Os cinco pilares foram integrados no projeto educativo do agrupamento. A experiência 'vai muito para além dos cinco dias da Semana'.",
      en: "Personal rediscovery and significant transformations: more attentive perspectives, concern for understanding others, changes in interaction with students, greater ease in teamwork. The five pillars were integrated into the cluster's educational project. The experience 'goes far beyond the five days of the Week'.",
    },
    limitations: { pt: "Foco exclusivo no pessoal não docente de um único agrupamento.", en: "Exclusive focus on non-teaching staff of a single cluster." },
    recommendations: { pt: "Alargar o programa para chegar a mais pessoas ou mesmo a todos os elementos da comunidade educativa. Garantir continuidade.", en: "Expand the program to reach more people or even all members of the educational community. Ensure continuity." },
    tags: [
      { pt: "Assistentes Operacionais", en: "Operational Assistants" },
      { pt: "Autoconhecimento", en: "Self-Knowledge" },
      { pt: "Projeto Educativo", en: "Educational Project" },
      { pt: "Valorização", en: "Appreciation" },
    ],
    impactArea: { pt: "Comunidade Escolar", en: "School Community" },
    resultType: "positive",
    references: [
      "Fonseca, S. (2023). Academia de Líderes Ubuntu na Escola. Ubuntu: Revista de Ciências Sociais, 1, 131–161.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "IPAV (2023). Programa Escolas Ubuntu. https://www.academialideresubuntu.org.",
      "Bardin, L. (2016). Análise de Conteúdo. Edições 70.",
    ],
  },
  {
    id: 106,
    issue: 1,
    year: 2023,
    title: {
      pt: "Semanas Ubuntu: Estudo de Caso no Agrupamento de Escolas José Régio",
      en: "Ubuntu Weeks: Case Study at the José Régio School Cluster",
    },
    subtitle: {
      pt: "Vozes de educadores, alunos, encarregados de educação e comunidade",
      en: "Voices of educators, students, parents and community",
    },
    authors: ["Fernando Rebola", "Luísa Carvalho"],
    language: "pt",
    affiliations: ["Instituto Politécnico de Santarém", "Escola Superior de Educação de Santarém"],
    abstract: {
      pt: "Estudo de caso no Agrupamento de Escolas José Régio que recolhe as vozes de educadores, alunos que participaram na formação, encarregados de educação, elementos da equipa IPAV, diretora e outros elementos da comunidade educativa que não participaram na Semana Ubuntu. Analisa o impacto diferenciador da experiência em múltiplas perspetivas.",
      en: "Case study at the José Régio School Cluster collecting the voices of educators, students who participated in the training, parents, IPAV team members, the principal and other members of the educational community who did not participate in Ubuntu Week. Analyzes the differentiating impact of the experience from multiple perspectives.",
    },
    objectives: [
      { pt: "Recolher as perspetivas de múltiplos stakeholders sobre a experiência Ubuntu", en: "Collect multiple stakeholder perspectives on the Ubuntu experience" },
      { pt: "Compreender o impacto nas relações alunos-professores", en: "Understand the impact on student-teacher relationships" },
      { pt: "Avaliar a satisfação e sugestões de todos os participantes", en: "Assess satisfaction and suggestions from all participants" },
    ],
    methodology: { pt: "Estudo de caso", en: "Case study" },
    methodologyDetail: {
      pt: "Estudo de caso com abordagem multi-stakeholder: entrevistas semiestruturadas a educadores, alunos, encarregados de educação, equipa IPAV e diretora, complementadas por observação e análise documental.",
      en: "Case study with multi-stakeholder approach: semi-structured interviews with educators, students, parents, IPAV team and principal, complemented by observation and document analysis.",
    },
    sampleType: { pt: "Múltiplos stakeholders escolares", en: "Multiple school stakeholders" },
    sampleDetail: {
      pt: "Educadores e alunos da Semana Ubuntu, encarregados de educação, equipa IPAV, diretora do agrupamento e elementos da comunidade que não participaram na formação.",
      en: "Ubuntu Week educators and students, parents, IPAV team, cluster principal and community members who did not participate in the training.",
    },
    instruments: [
      { pt: "Entrevistas semiestruturadas", en: "Semi-structured interviews" },
      { pt: "Questionários de satisfação", en: "Satisfaction questionnaires" },
      { pt: "Observação participante", en: "Participant observation" },
      { pt: "Análise documental", en: "Document analysis" },
    ],
    pages: "162–193",
    keyFindings: [
      { pt: "O caráter diferenciador da experiência Ubuntu é reconhecido por todos os stakeholders.", en: "The differentiating character of the Ubuntu experience is recognized by all stakeholders." },
      { pt: "Desenvolvimento de competências socioemocionais e transformação das relações alunos-professores.", en: "Development of social-emotional competencies and transformation of student-teacher relationships." },
      { pt: "Os encarregados de educação relatam maior motivação dos filhos em relação à escola.", en: "Parents report greater motivation of their children towards school." },
      { pt: "Apelo generalizado à continuação do projeto e expansão das Semanas e Clubes Ubuntu.", en: "Widespread appeal for project continuation and expansion of Ubuntu Weeks and Clubs." },
    ],
    conclusion: {
      pt: "A experiência Ubuntu é reconhecida por toda a comunidade educativa como diferenciadora, transformando relações e motivando alunos, com pedidos unânimes de continuidade e expansão.",
      en: "The Ubuntu experience is recognized by the entire educational community as differentiating, transforming relationships and motivating students, with unanimous requests for continuity and expansion.",
    },
    mainResults: {
      pt: "Todas as vozes afirmam o caráter diferenciador da experiência Ubuntu. Desenvolvimento de competências socioemocionais e transformação das relações alunos-professores. Os encarregados de educação relatam maior motivação dos filhos. Apelo generalizado à continuação e expansão do projeto.",
      en: "All voices affirm the differentiating character of the Ubuntu experience. Development of social-emotional competencies and transformation of student-teacher relationships. Parents report greater child motivation. Widespread appeal for project continuation and expansion.",
    },
    limitations: { pt: "Perspetiva limitada a um agrupamento. Possível viés de desejabilidade social nas respostas.", en: "Perspective limited to one cluster. Possible social desirability bias in responses." },
    recommendations: { pt: "Realizar mais Semanas Ubuntu e continuar o Clube Ubuntu. Expandir a formação a mais elementos da comunidade educativa.", en: "Conduct more Ubuntu Weeks and continue the Ubuntu Club. Expand training to more members of the educational community." },
    tags: [
      { pt: "Comunidade Educativa", en: "Educational Community" },
      { pt: "Motivação", en: "Motivation" },
      { pt: "Relação Professor-Aluno", en: "Teacher-Student Relationship" },
      { pt: "Continuidade", en: "Continuity" },
    ],
    impactArea: { pt: "Ensino Básico e Secundário", en: "Primary and Secondary Education" },
    resultType: "positive",
    references: [
      "Rebola, F. & Carvalho, L. (2023). Semanas Ubuntu: Estudo de caso no AE José Régio. Ubuntu: Revista de Ciências Sociais, 1, 162–193.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "Stake, R. E. (1995). The Art of Case Study Research. Sage Publications.",
      "IPAV (2023). Programa Escolas Ubuntu. https://www.academialideresubuntu.org.",
    ],
  },
  {
    id: 107,
    issue: 1,
    year: 2023,
    title: {
      pt: "Academia de Líderes Ubuntu Júnior no 1.º Ciclo do Ensino Básico",
      en: "Ubuntu Leaders Academy Junior in Primary Education",
    },
    subtitle: {
      pt: "Efeitos em educadores e alunos",
      en: "Effects on educators and students",
    },
    authors: ["Fernando Rebola", "Isabel Cláudia Nogueira", "João Gouveia", "José Luís Gonçalves", "Luísa Carvalho", "Susana Fonseca"],
    language: "pt",
    affiliations: ["Instituto Politécnico de Santarém", "Escola Superior de Educação Paula Frassinetti", "Universidade Católica Portuguesa"],
    abstract: {
      pt: "Estudo misto que avalia os efeitos da ALU Júnior no 1.º Ciclo do Ensino Básico, analisando o primeiro ano de implementação da adaptação da Semana Ubuntu a crianças mais novas. Foram aplicados diversos instrumentos a educadores e crianças, com resultados que apontam para uma apreciação global muito positiva e forte alinhamento com os referenciais educativos nacionais.",
      en: "Mixed-methods study evaluating the effects of ALU Junior in primary education, analyzing the first year of implementing the adaptation of Ubuntu Week for younger children. Various instruments were applied to educators and children, with results pointing to a very positive overall assessment and strong alignment with national educational frameworks.",
    },
    objectives: [
      { pt: "Avaliar os efeitos da ALU Júnior em educadores e alunos do 1.º Ciclo", en: "Evaluate the effects of ALU Junior on primary education educators and students" },
      { pt: "Verificar o alinhamento com o Perfil dos Alunos à Saída da Escolaridade Obrigatória", en: "Verify alignment with the Student Profile at the End of Compulsory Schooling" },
      { pt: "Analisar a viabilidade da adaptação do método para esta faixa etária", en: "Analyze the feasibility of adapting the method for this age group" },
    ],
    methodology: { pt: "Estudo misto (qualitativo e quantitativo)", en: "Mixed-methods study (qualitative and quantitative)" },
    methodologyDetail: {
      pt: "Estudo misto combinando abordagens qualitativas (testemunhos de educadores, entrevistas a crianças, painéis de bordo diários) e quantitativas (avaliação de impacto a educadores) no primeiro ano de implementação da ALU Júnior.",
      en: "Mixed-methods study combining qualitative approaches (educator testimonies, children interviews, daily dashboards) and quantitative (educator impact assessment) in the first year of ALU Junior implementation.",
    },
    sampleType: { pt: "Crianças do 1.º Ciclo e educadores", en: "Primary school children and educators" },
    sampleDetail: {
      pt: "Crianças do 1.º Ciclo do Ensino Básico e educadores de escolas que implementaram a ALU Júnior, incluindo professores, animadores e equipas pedagógicas.",
      en: "Primary school children and educators from schools that implemented ALU Junior, including teachers, facilitators and pedagogical teams.",
    },
    instruments: [
      { pt: "Testemunhos de educadores", en: "Educator testimonies" },
      { pt: "Entrevistas a crianças", en: "Children interviews" },
      { pt: "Painéis de bordo diários", en: "Daily dashboards" },
      { pt: "Questionário de avaliação de impacto (educadores)", en: "Impact assessment questionnaire (educators)" },
    ],
    pages: "194–235",
    keyFindings: [
      { pt: "Apreciação global muito positiva do programa ALU Júnior e das suas potencialidades.", en: "Very positive overall assessment of the ALU Junior program and its potential." },
      { pt: "Convergência das competências promovidas com o Perfil dos Alunos à Saída da Escolaridade Obrigatória.", en: "Convergence of promoted competencies with the Student Profile at the End of Compulsory Schooling." },
      { pt: "Alinhamento com a área de Cidadania e Desenvolvimento do 1.º Ciclo.", en: "Alignment with the Citizenship and Development area of primary education." },
      { pt: "Crianças demonstram capacidade de reflexão sobre competências socioemocionais adaptada à sua faixa etária.", en: "Children demonstrate age-appropriate capacity for reflection on social-emotional competencies." },
    ],
    conclusion: {
      pt: "A adaptação do método Ubuntu ao 1.º Ciclo é viável e bem recebida, com forte alinhamento entre as competências Ubuntu e os referenciais educativos nacionais para esta faixa etária.",
      en: "The adaptation of the Ubuntu method to primary education is feasible and well received, with strong alignment between Ubuntu competencies and national educational frameworks for this age group.",
    },
    mainResults: {
      pt: "Apreciação global muito positiva do programa e das suas potencialidades. Convergência das competências promovidas com o Perfil dos Alunos e com a área de Cidadania e Desenvolvimento do 1.º Ciclo. As crianças demonstram capacidade de reflexão sobre competências socioemocionais adaptada à sua faixa etária.",
      en: "Very positive overall assessment of the program and its potential. Convergence of promoted competencies with the Student Profile and Citizenship and Development area of primary education. Children demonstrate age-appropriate capacity for reflection on social-emotional competencies.",
    },
    limitations: { pt: "Primeiro ano de implementação, sem dados longitudinais. Necessidade de adaptar mais instrumentos à faixa etária.", en: "First year of implementation, without longitudinal data. Need to adapt more instruments to the age group." },
    recommendations: { pt: "Continuar a refinar os materiais pedagógicos para o 1.º Ciclo. Realizar estudos comparativos entre diferentes contextos escolares.", en: "Continue refining pedagogical materials for primary education. Conduct comparative studies across different school contexts." },
    tags: [
      { pt: "1.º Ciclo", en: "Primary Education" },
      { pt: "ALU Júnior", en: "ALU Junior" },
      { pt: "Adaptação", en: "Adaptation" },
      { pt: "Perfil do Aluno", en: "Student Profile" },
    ],
    impactArea: { pt: "Educação Infantil", en: "Early Childhood Education" },
    resultType: "positive",
    references: [
      "Rebola, F., Nogueira, I. C., Gouveia, J., Gonçalves, J. L., Carvalho, L. & Fonseca, S. (2023). ALU Júnior no 1.º Ciclo do Ensino Básico. Ubuntu: Revista de Ciências Sociais, 1, 194–235.",
      "DGE (2017). Perfil dos Alunos à Saída da Escolaridade Obrigatória. Ministério da Educação.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "Ministério da Educação (2018). Cidadania e Desenvolvimento: Linhas Orientadoras. DGE.",
    ],
  },
  {
    id: 108,
    issue: 1,
    year: 2023,
    title: {
      pt: "Semanas Ubuntu no Centro de Reabilitação de Gaia",
      en: "Ubuntu Weeks at the Gaia Rehabilitation Centre",
    },
    subtitle: {
      pt: "Análise dos efeitos percecionados pelos clientes",
      en: "Analysis of effects perceived by clients",
    },
    authors: ["Madalena Alarcão"],
    language: "pt",
    affiliations: ["Universidade de Coimbra, Faculdade de Psicologia e Ciências da Educação, Centro de Estudos Sociais"],
    abstract: {
      pt: "Investigação quantitativa que avalia os efeitos da Semana Ubuntu em clientes do Centro de Reabilitação Profissional de Gaia (CRPG), analisando a resiliência, empatia, sentido de vida, bem como a perceção de impacto e satisfação com a metodologia Ubuntu. Os clientes são pessoas que, por doença ou acidente, foram fortemente desafiadas e encontram-se em processo de reabilitação profissional.",
      en: "Quantitative research evaluating the effects of Ubuntu Week on clients of the Gaia Professional Rehabilitation Centre (CRPG), analyzing resilience, empathy, sense of life, as well as perceived impact and satisfaction with the Ubuntu methodology. Clients are people who, due to illness or accident, have been strongly challenged and are undergoing professional rehabilitation.",
    },
    objectives: [
      { pt: "Avaliar os efeitos da Semana Ubuntu em competências socioemocionais de adultos em reabilitação", en: "Evaluate the effects of Ubuntu Week on social-emotional competencies of adults in rehabilitation" },
      { pt: "Analisar a perceção de impacto e satisfação com a metodologia", en: "Analyze perceived impact and satisfaction with the methodology" },
      { pt: "Verificar a transferibilidade do método Ubuntu para contextos não escolares", en: "Verify the transferability of the Ubuntu method to non-school contexts" },
    ],
    methodology: { pt: "Investigação quantitativa (pré/pós)", en: "Quantitative research (pre/post)" },
    methodologyDetail: {
      pt: "Investigação quantitativa com desenho pré/pós-teste, comparando resultados antes e 15 dias após a Semana Ubuntu. Aplicação de escalas validadas de resiliência, empatia e sentido de vida.",
      en: "Quantitative research with pre/post-test design, comparing results before and 15 days after Ubuntu Week. Application of validated resilience, empathy and sense of life scales.",
    },
    sampleType: { pt: "Clientes do CRPG", en: "CRPG clients" },
    sampleDetail: {
      pt: "Clientes do Centro de Reabilitação Profissional de Gaia (CRPG) – pessoas em processo de reabilitação profissional após doença ou acidente.",
      en: "Clients of the Gaia Professional Rehabilitation Centre (CRPG) – people undergoing professional rehabilitation after illness or accident.",
    },
    instruments: [
      { pt: "Escala de resiliência", en: "Resilience scale" },
      { pt: "Escala de empatia", en: "Empathy scale" },
      { pt: "Questionário de sentido de vida", en: "Sense of life questionnaire" },
      { pt: "Questionário de satisfação ALU", en: "ALU satisfaction questionnaire" },
      { pt: "Questionário de avaliação de impacto", en: "Impact assessment questionnaire" },
    ],
    pages: "236–264",
    keyFindings: [
      { pt: "Clientes percecionam-se como mais autoconfiantes e com maior autoconhecimento após a Semana Ubuntu.", en: "Clients perceive themselves as more self-confident and with greater self-knowledge after Ubuntu Week." },
      { pt: "Aumento de resiliência, empatia e vontade de se colocar ao serviço do outro.", en: "Increase in resilience, empathy and willingness to serve others." },
      { pt: "Maior tolerância, capacidade de perdoar, resolver conflitos e esperança.", en: "Greater tolerance, capacity to forgive, resolve conflicts and hope." },
      { pt: "Satisfação muito elevada com a Semana Ubuntu e articulação positiva com os objetivos do CRPG.", en: "Very high satisfaction with Ubuntu Week and positive alignment with CRPG objectives." },
    ],
    conclusion: {
      pt: "O método Ubuntu demonstra potencial significativo em contextos de reabilitação, com clientes a reportar ganhos em todas as competências socioemocionais avaliadas, evidenciando a versatilidade da metodologia para além do contexto escolar.",
      en: "The Ubuntu method demonstrates significant potential in rehabilitation contexts, with clients reporting gains in all assessed social-emotional competencies, evidencing the methodology's versatility beyond the school context.",
    },
    mainResults: {
      pt: "Clientes reportam ganhos em autoconfiança, autoconhecimento, resiliência, empatia e vontade de serviço. Aumento de tolerância, capacidade de perdoar, resolver conflitos e esperança. Satisfação muito elevada e articulação positiva com os objetivos do CRPG.",
      en: "Clients report gains in self-confidence, self-knowledge, resilience, empathy and willingness to serve. Increase in tolerance, capacity to forgive, resolve conflicts and hope. Very high satisfaction and positive alignment with CRPG objectives.",
    },
    limitations: { pt: "Ausência de grupo de controlo. Pós-teste realizado apenas 15 dias após, não permitindo avaliar efeitos a longo prazo.", en: "Absence of control group. Post-test conducted only 15 days after, not allowing assessment of long-term effects." },
    recommendations: { pt: "Realizar estudos com grupo de controlo e follow-up a médio e longo prazo. Expandir a metodologia a outros centros de reabilitação.", en: "Conduct studies with control group and medium- and long-term follow-up. Expand the methodology to other rehabilitation centres." },
    tags: [
      { pt: "Reabilitação", en: "Rehabilitation" },
      { pt: "CRPG", en: "CRPG" },
      { pt: "Adultos", en: "Adults" },
      { pt: "Versatilidade", en: "Versatility" },
    ],
    impactArea: { pt: "Saúde e Reabilitação", en: "Health and Rehabilitation" },
    resultType: "positive",
    references: [
      "Alarcão, M. (2023). Semanas Ubuntu no Centro de Reabilitação de Gaia. Ubuntu: Revista de Ciências Sociais, 1, 236–264.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "CRPG (2022). Centro de Reabilitação Profissional de Gaia: Relatório de Atividades.",
      "Connor, K. M. & Davidson, J. R. T. (2003). Development of a new resilience scale. Depression and Anxiety, 18(2), 76–82.",
    ],
  },
  {
    id: 109,
    issue: 1,
    year: 2023,
    title: {
      pt: "Eu Sou (de Novo) Porque Tu És",
      en: "I Am (Again) Because You Are",
    },
    subtitle: {
      pt: "Caminhos de ressignificação de acontecimentos traumáticos no contexto da Academia de Líderes Ubuntu",
      en: "Paths for resignification of traumatic events in the context of the Ubuntu Leaders Academy",
    },
    authors: ["Marta Marques"],
    language: "pt",
    affiliations: ["Investigadora independente, Conselho Científico da ALU"],
    abstract: {
      pt: "Estudo exploratório qualitativo que investiga o papel da ALU na adaptação ao trauma, analisando os caminhos de ressignificação de acontecimentos traumáticos que a experiência Ubuntu proporciona. Com base em entrevistas, focus-group e diários sonoros a membros do Conselho Científico, animadores e participantes da ALU, explora como o processo relacional da ALU facilita a transformação pessoal.",
      en: "Qualitative exploratory study investigating the role of ALU in trauma adaptation, analyzing the paths for resignification of traumatic events provided by the Ubuntu experience. Based on interviews, focus groups and audio diaries with Scientific Council members, facilitators and ALU participants, it explores how ALU's relational process facilitates personal transformation.",
    },
    objectives: [
      { pt: "Investigar o papel da ALU na ressignificação de acontecimentos traumáticos", en: "Investigate the role of ALU in the resignification of traumatic events" },
      { pt: "Compreender o processo de mudança pessoal facilitado pela experiência Ubuntu", en: "Understand the personal change process facilitated by the Ubuntu experience" },
      { pt: "Identificar fatores que influenciam o processo de ressignificação", en: "Identify factors that influence the resignification process" },
    ],
    methodology: { pt: "Estudo exploratório qualitativo", en: "Qualitative exploratory study" },
    methodologyDetail: {
      pt: "Estudo exploratório qualitativo com entrevistas semiestruturadas, focus-group e diários sonoros. Análise de conteúdo temática dos discursos dos participantes sobre as suas experiências de ressignificação.",
      en: "Qualitative exploratory study with semi-structured interviews, focus groups and audio diaries. Thematic content analysis of participants' discourses about their resignification experiences.",
    },
    sampleType: { pt: "Membros do Conselho Científico, animadores e participantes ALU", en: "Scientific Council members, facilitators and ALU participants" },
    sampleDetail: {
      pt: "Membros do Conselho Científico da ALU, animadores Ubuntu e participantes da ALU com diferentes níveis de experiência e envolvimento no programa.",
      en: "ALU Scientific Council members, Ubuntu facilitators and ALU participants with different levels of experience and involvement in the program.",
    },
    instruments: [
      { pt: "Entrevistas semiestruturadas", en: "Semi-structured interviews" },
      { pt: "Focus-group", en: "Focus group" },
      { pt: "Diários sonoros", en: "Audio diaries" },
      { pt: "Análise de conteúdo temática", en: "Thematic content analysis" },
    ],
    pages: "265–318",
    keyFindings: [
      { pt: "O processo de mudança é essencialmente individual, com reflexo na autoimagem e relações.", en: "The change process is essentially individual, with reflection in self-image and relationships." },
      { pt: "A ALU proporciona ressignificação de acontecimentos traumáticos através de processos relacionais.", en: "ALU provides resignification of traumatic events through relational processes." },
      { pt: "O processo é influenciado por características do participante e consciência do trauma.", en: "The process is influenced by participant characteristics and trauma awareness." },
      { pt: "A continuidade é essencial para evitar desintegração em situações mais complexas.", en: "Continuity is essential to avoid disintegration in more complex situations." },
    ],
    conclusion: {
      pt: "A ALU facilita processos de ressignificação de traumas, mas requer continuidade sustentada para garantir que o processo de mudança seja completado de forma segura, especialmente em casos mais complexos.",
      en: "ALU facilitates trauma resignification processes, but requires sustained continuity to ensure the change process is completed safely, especially in more complex cases.",
    },
    mainResults: {
      pt: "O processo de mudança é essencialmente individual, com reflexo na autoimagem e relações. A ALU proporciona ressignificação de traumas através de processos relacionais. O processo é influenciado por características do participante e consciência do trauma. A continuidade é essencial para evitar desintegração em situações mais complexas.",
      en: "The change process is essentially individual, with reflection in self-image and relationships. ALU provides trauma resignification through relational processes. The process is influenced by participant characteristics and trauma awareness. Continuity is essential to avoid disintegration in more complex situations.",
    },
    limitations: { pt: "Natureza exploratória do estudo. Dificuldade em estabelecer relações causais. Necessidade de acompanhamento longitudinal dos processos de ressignificação.", en: "Exploratory nature of the study. Difficulty in establishing causal relationships. Need for longitudinal monitoring of resignification processes." },
    recommendations: { pt: "Garantir continuidade sustentada do processo de mudança. Criar mecanismos de acompanhamento para situações mais complexas. Articular com profissionais de saúde mental quando necessário.", en: "Ensure sustained continuity of the change process. Create monitoring mechanisms for more complex situations. Coordinate with mental health professionals when necessary." },
    tags: [
      { pt: "Trauma", en: "Trauma" },
      { pt: "Ressignificação", en: "Resignification" },
      { pt: "Mudança Pessoal", en: "Personal Change" },
      { pt: "Continuidade", en: "Continuity" },
    ],
    impactArea: { pt: "Saúde Mental", en: "Mental Health" },
    resultType: "exploratory",
    references: [
      "Marques, M. (2023). Eu Sou (de Novo) Porque Tu És. Ubuntu: Revista de Ciências Sociais, 1, 265–318.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "Herman, J. L. (2015). Trauma and Recovery: The Aftermath of Violence. Basic Books.",
      "Tedeschi, R. G. & Calhoun, L. G. (2004). Posttraumatic Growth: Conceptual Foundations and Empirical Evidence. Psychological Inquiry, 15(1), 1–18.",
      "Van der Kolk, B. (2014). The Body Keeps the Score: Brain, Mind, and Body in the Healing of Trauma. Viking.",
    ],
  },

  // ===== ISSUE 2 (2024) =====
  {
    id: 201,
    issue: 2,
    year: 2024,
    title: {
      pt: "Reflexões sobre o Ubuntu",
      en: "Reflections on Ubuntu",
    },
    subtitle: {
      pt: "O seu potencial como fonte de esperança em tempos desafiantes",
      en: "Its potential as source of hope in challenging times",
    },
    authors: ["Barbara Nussbaum"],
    language: "en",
    affiliations: ["Consultora, escritora e oradora especializada em Ubuntu"],
    abstract: {
      pt: "Ensaio reflexivo que explora o potencial do Ubuntu como fonte de esperança em tempos desafiantes. Argumenta que o Ubuntu é cada vez mais relevante como paradigma emergente no séc. XXI, articulando-se com três mudanças globais: da separação para a unidade, do poder individual para o poder do grupo, e uma visão quântica da realidade. Analisa a ética Ubuntu como alternativa ao individualismo ocidental.",
      en: "Reflective essay exploring the potential of Ubuntu as a source of hope in challenging times. Argues that Ubuntu is increasingly relevant as an emerging paradigm in the 21st century, articulating with three global shifts: from separation to unity, from individual power to group power, and a quantum view of reality. Analyzes Ubuntu ethics as an alternative to Western individualism.",
    },
    objectives: [
      { pt: "Explorar o Ubuntu como paradigma emergente para o séc. XXI", en: "Explore Ubuntu as an emerging paradigm for the 21st century" },
      { pt: "Articular a filosofia Ubuntu com movimentos de sabedoria coletiva no Ocidente", en: "Articulate Ubuntu philosophy with collective wisdom movements in the West" },
      { pt: "Analisar o papel do trauma coletivo como barreira ao Ubuntu", en: "Analyze the role of collective trauma as a barrier to Ubuntu" },
    ],
    methodology: { pt: "Ensaio reflexivo", en: "Reflective essay" },
    methodologyDetail: {
      pt: "Ensaio reflexivo baseado em revisão de literatura interdisciplinar, combinando filosofia africana, psicologia social, física quântica e estudos sobre sabedoria coletiva.",
      en: "Reflective essay based on interdisciplinary literature review, combining African philosophy, social psychology, quantum physics and collective wisdom studies.",
    },
    sampleType: { pt: "Revisão de literatura", en: "Literature review" },
    sampleDetail: {
      pt: "Revisão de literatura académica e filosófica sobre Ubuntu, sabedoria coletiva, trauma coletivo e paradigmas emergentes.",
      en: "Review of academic and philosophical literature on Ubuntu, collective wisdom, collective trauma and emerging paradigms.",
    },
    instruments: [
      { pt: "Revisão de literatura", en: "Literature review" },
      { pt: "Análise filosófica comparativa", en: "Comparative philosophical analysis" },
    ],
    pages: "09–41",
    keyFindings: [
      { pt: "O Ubuntu é cada vez mais relevante como paradigma emergente no séc. XXI, articulando-se com movimentos de sabedoria coletiva no Ocidente.", en: "Ubuntu is increasingly relevant as an emerging paradigm in the 21st century, articulating with collective wisdom movements in the West." },
      { pt: "Três mudanças globais sustentam a esperança: da separação para a unidade, do poder individual para o poder do grupo, e uma visão quântica da realidade.", en: "Three global shifts sustain hope: from separation to unity, from individual power to group power, and a quantum view of reality." },
      { pt: "A ética Ubuntu como abordagem à ética oferece uma alternativa ao individualismo ocidental, centrada na dignidade e responsabilidade mútua.", en: "Ubuntu ethics as an approach to ethics offers an alternative to Western individualism, centered on dignity and mutual responsibility." },
      { pt: "O trauma coletivo não processado é uma barreira fundamental para a realização do Ubuntu e necessita de processos de cura deliberados.", en: "Unprocessed collective trauma is a fundamental barrier to Ubuntu realization and requires deliberate healing processes." },
    ],
    conclusion: {
      pt: "O Ubuntu oferece uma fonte de esperança num mundo em policrise, ligando filosofia africana, sabedoria coletiva e a nova ciência para um paradigma sociético mais conectado e compassivo. A Europa, o Médio Oriente e os EUA precisam do Ubuntu tanto quanto a África.",
      en: "Ubuntu offers a source of hope in a world in polycrisis, linking African philosophy, collective wisdom and the new science for a more connected and compassionate societal paradigm. Europe, the Middle East and the USA need Ubuntu as much as Africa.",
    },
    mainResults: {
      pt: "O Ubuntu articula-se com três mudanças globais que sustentam a esperança. A ética Ubuntu oferece uma alternativa centrada na dignidade e responsabilidade mútua. O trauma coletivo não processado constitui uma barreira fundamental. A Europa, o Médio Oriente e os EUA precisam do Ubuntu tanto quanto a África.",
      en: "Ubuntu articulates with three global shifts that sustain hope. Ubuntu ethics offers an alternative centered on dignity and mutual responsibility. Unprocessed collective trauma constitutes a fundamental barrier. Europe, the Middle East and the USA need Ubuntu as much as Africa.",
    },
    limitations: { pt: "Ensaio de natureza reflexiva, sem componente empírica. As argumentações são de caráter conceptual e filosófico.", en: "Reflective essay without empirical component. Arguments are conceptual and philosophical in nature." },
    recommendations: { pt: "Desenvolver programas de processamento de trauma coletivo. Criar pontes entre a filosofia Ubuntu e os movimentos de sabedoria coletiva ocidentais.", en: "Develop collective trauma processing programs. Create bridges between Ubuntu philosophy and Western collective wisdom movements." },
    tags: [
      { pt: "Filosofia", en: "Philosophy" },
      { pt: "Esperança", en: "Hope" },
      { pt: "Sabedoria Coletiva", en: "Collective Wisdom" },
      { pt: "Ética", en: "Ethics" },
    ],
    impactArea: { pt: "Pensamento Global", en: "Global Thinking" },
    resultType: "reflective",
    references: [
      "Nussbaum, B. (2003). Ubuntu: Reflections of a South African on Our Common Humanity. Reflections, 4(4), 21–26.",
      "Tutu, D. (1999). No Future Without Forgiveness. Doubleday.",
      "Metz, T. (2007). Toward an African Moral Theory. The Journal of Political Philosophy, 15(3), 321–341.",
      "Scharmer, C. O. (2016). Theory U: Leading from the Future as It Emerges. 2nd ed. Berrett-Koehler Publishers.",
      "Wheatley, M. J. (2006). Leadership and the New Science: Discovering Order in a Chaotic World. 3rd ed. Berrett-Koehler Publishers.",
    ],
  },
  {
    id: 202,
    issue: 2,
    year: 2024,
    title: {
      pt: "Da Polarização à Paz",
      en: "From Polarization to Peace",
    },
    subtitle: {
      pt: "Como as escolas podem cultivar líderes conscientes para um mundo mais conectado e compassivo",
      en: "How Schools Can Cultivate Conscious Leaders for a More Connected and Compassionate World",
    },
    authors: ["Lyndon Rego"],
    language: "en",
    affiliations: ["Center for Creative Leadership, Global"],
    abstract: {
      pt: "Ensaio argumentativo que propõe as escolas como contexto ideal para o desenvolvimento de líderes conscientes capazes de transformar a polarização em paz. Defende que a liderança consciente, assente em autoconsciência, intenção e ação, pode ser cultivada desde a idade formativa, democratizando o acesso ao desenvolvimento da liderança.",
      en: "Argumentative essay proposing schools as the ideal context for developing conscious leaders capable of transforming polarization into peace. Argues that conscious leadership, based on self-awareness, intention and action, can be cultivated from formative age, democratizing access to leadership development.",
    },
    objectives: [
      { pt: "Argumentar que as escolas são o contexto ideal para desenvolver líderes conscientes", en: "Argue that schools are the ideal context for developing conscious leaders" },
      { pt: "Definir os elementos da liderança consciente: consciência, intenção e ação", en: "Define the elements of conscious leadership: awareness, intention and action" },
      { pt: "Demonstrar como a compaixão autêntica transforma interações", en: "Demonstrate how authentic compassion transforms interactions" },
    ],
    methodology: { pt: "Ensaio argumentativo", en: "Argumentative essay" },
    methodologyDetail: {
      pt: "Ensaio argumentativo baseado em quadro conceptual próprio, integrando teorias de liderança servidora, desenvolvimento interior e educação para a paz.",
      en: "Argumentative essay based on a proprietary conceptual framework, integrating servant leadership theories, inner development and peace education.",
    },
    sampleType: { pt: "Quadro conceptual", en: "Conceptual framework" },
    sampleDetail: { pt: "Quadro conceptual teórico, sem amostra empírica.", en: "Theoretical conceptual framework, without empirical sample." },
    instruments: [
      { pt: "Análise conceptual", en: "Conceptual analysis" },
      { pt: "Revisão de literatura sobre liderança", en: "Leadership literature review" },
    ],
    pages: "42–51",
    keyFindings: [
      { pt: "O desenvolvimento da liderança é um trabalho 'de dentro para fora': começa com autoconsciência e desenvolvimento interior.", en: "Leadership development is an 'inside-out' work: it begins with self-awareness and inner development." },
      { pt: "A liderança consciente assenta em três elementos: consciência, intenção e ação.", en: "Conscious leadership rests on three elements: awareness, intention and action." },
      { pt: "As escolas são o contexto ideal para desenvolver líderes conscientes, alcançando jovens na idade formativa e de forma democratizada.", en: "Schools are the ideal context for developing conscious leaders, reaching young people at formative age in a democratized way." },
      { pt: "A compaixão autêntica transforma interações potencialmente violentas de forma mais eficaz do que qualquer resposta combativa.", en: "Authentic compassion transforms potentially violent interactions more effectively than any combative response." },
    ],
    conclusion: {
      pt: "Ao integrar o desenvolvimento da liderança consciente nas escolas, criamos a melhor oportunidade para um mundo mais pacífico e feliz. O caminho vai do autoconhecimento individual à construção coletiva de comunidades que geram bem-estar partilhado.",
      en: "By integrating conscious leadership development into schools, we create the best opportunity for a more peaceful and happy world. The path goes from individual self-knowledge to the collective construction of communities that generate shared well-being.",
    },
    mainResults: {
      pt: "O desenvolvimento da liderança é um trabalho 'de dentro para fora'. A liderança consciente assenta em consciência, intenção e ação. As escolas permitem alcançar jovens na idade formativa de forma democratizada. A compaixão autêntica é mais eficaz que qualquer resposta combativa.",
      en: "Leadership development is an 'inside-out' work. Conscious leadership rests on awareness, intention and action. Schools allow reaching young people at formative age in a democratized way. Authentic compassion is more effective than any combative response.",
    },
    limitations: { pt: "Ensaio teórico sem validação empírica. Necessidade de operacionalização dos conceitos propostos.", en: "Theoretical essay without empirical validation. Need for operationalization of proposed concepts." },
    recommendations: { pt: "Integrar o desenvolvimento da liderança consciente nos currículos escolares. Formar professores como facilitadores de liderança.", en: "Integrate conscious leadership development into school curricula. Train teachers as leadership facilitators." },
    tags: [
      { pt: "Liderança", en: "Leadership" },
      { pt: "Escolas", en: "Schools" },
      { pt: "Paz", en: "Peace" },
      { pt: "Consciência", en: "Awareness" },
    ],
    impactArea: { pt: "Educação", en: "Education" },
    resultType: "reflective",
    references: [
      "Rego, L. (2024). From Polarization to Peace. Ubuntu: Revista de Ciências Sociais e Humanas, 2, 42–51.",
      "Greenleaf, R. K. (1977). Servant Leadership: A Journey into the Nature of Legitimate Power and Greatness. Paulist Press.",
      "Goleman, D. (1995). Emotional Intelligence: Why It Can Matter More Than IQ. Bantam Books.",
      "Senge, P. M. (2006). The Fifth Discipline: The Art & Practice of The Learning Organization. Doubleday.",
    ],
  },
  {
    id: 203,
    issue: 2,
    year: 2024,
    title: {
      pt: "Adaptação do Método Ubuntu à Educação Pré-Escolar",
      en: "Adapting the Ubuntu Method to Preschool Education",
    },
    subtitle: {
      pt: "Estudo exploratório em estabelecimentos portugueses",
      en: "Exploratory study in Portuguese establishments",
    },
    authors: ["Coletivo da ESE de Santarém"],
    language: "pt",
    affiliations: ["Escola Superior de Educação de Santarém, Instituto Politécnico de Santarém"],
    abstract: {
      pt: "Estudo exploratório qualitativo que analisa a adaptação da Semana Ubuntu à educação pré-escolar em três Jardins de Infância portugueses. Investiga a viabilidade da abordagem pedagógica transversal e integradora com crianças pequenas, identificando pontos-chave para o aperfeiçoamento da metodologia e o envolvimento institucional e das famílias.",
      en: "Qualitative exploratory study analyzing the adaptation of Ubuntu Week to preschool education in three Portuguese kindergartens. Investigates the feasibility of the cross-cutting and integrative pedagogical approach with young children, identifying key points for methodology improvement and institutional and family involvement.",
    },
    objectives: [
      { pt: "Adaptar a metodologia Ubuntu à educação pré-escolar", en: "Adapt the Ubuntu methodology to preschool education" },
      { pt: "Avaliar a viabilidade da abordagem com crianças pequenas", en: "Assess the feasibility of the approach with young children" },
      { pt: "Identificar pontos de aperfeiçoamento para esta valência", en: "Identify improvement points for this educational level" },
    ],
    methodology: { pt: "Estudo exploratório qualitativo", en: "Qualitative exploratory study" },
    methodologyDetail: {
      pt: "Estudo exploratório qualitativo com implementação piloto em três Jardins de Infância, incluindo observação participante das sessões, entrevistas a educadoras e recolha de produções das crianças.",
      en: "Qualitative exploratory study with pilot implementation in three kindergartens, including participant observation of sessions, interviews with educators and collection of children's productions.",
    },
    sampleType: { pt: "3 Jardins de Infância", en: "3 Kindergartens" },
    sampleDetail: {
      pt: "Crianças e educadoras de 3 Jardins de Infância portugueses que participaram na adaptação da Semana Ubuntu para o pré-escolar.",
      en: "Children and educators from 3 Portuguese kindergartens that participated in the adaptation of Ubuntu Week for preschool.",
    },
    instruments: [
      { pt: "Observação participante", en: "Participant observation" },
      { pt: "Entrevistas a educadoras", en: "Educator interviews" },
      { pt: "Análise de produções das crianças", en: "Analysis of children's productions" },
      { pt: "Diários de bordo", en: "Logbooks" },
    ],
    pages: "52–94",
    keyFindings: [
      { pt: "A Semana Ubuntu foi adaptada com sucesso à educação pré-escolar em três Jardins de Infância portugueses.", en: "Ubuntu Week was successfully adapted to preschool education in three Portuguese kindergartens." },
      { pt: "A abordagem pedagógica transversal e integradora mostrou-se eficaz com crianças pequenas.", en: "The cross-cutting and integrative pedagogical approach proved effective with young children." },
      { pt: "Identificados pontos-chave para o aperfeiçoamento da metodologia e recursos Ubuntu nesta valência.", en: "Key points identified for improving the Ubuntu methodology and resources at this educational level." },
      { pt: "O envolvimento institucional e das famílias é fulcral para a generalização e sustentabilidade do projeto.", en: "Institutional and family involvement is crucial for the project's generalization and sustainability." },
    ],
    conclusion: {
      pt: "A metodologia Ubuntu pode ser eficazmente adaptada à educação pré-escolar, mas requer recursos específicos para esta faixa etária e um maior envolvimento das famílias e instituições para garantir a sua sustentabilidade e generalização.",
      en: "The Ubuntu methodology can be effectively adapted to preschool education, but requires specific resources for this age group and greater family and institutional involvement to ensure its sustainability and generalization.",
    },
    mainResults: {
      pt: "A Semana Ubuntu foi adaptada com sucesso. A abordagem pedagógica transversal e integradora mostrou-se eficaz com crianças pequenas. Identificados pontos-chave para aperfeiçoamento. O envolvimento institucional e das famílias é fulcral para a sustentabilidade.",
      en: "Ubuntu Week was successfully adapted. The cross-cutting and integrative pedagogical approach proved effective with young children. Key improvement points identified. Institutional and family involvement is crucial for sustainability.",
    },
    limitations: { pt: "Estudo piloto com amostra reduzida. Necessidade de desenvolver recursos específicos para esta faixa etária.", en: "Pilot study with small sample. Need to develop specific resources for this age group." },
    recommendations: { pt: "Desenvolver materiais pedagógicos específicos para o pré-escolar. Envolver mais ativamente as famílias no processo. Realizar estudos em mais Jardins de Infância.", en: "Develop specific pedagogical materials for preschool. More actively involve families in the process. Conduct studies in more kindergartens." },
    tags: [
      { pt: "Pré-Escolar", en: "Preschool" },
      { pt: "Adaptação", en: "Adaptation" },
      { pt: "Metodologia", en: "Methodology" },
      { pt: "Famílias", en: "Families" },
    ],
    impactArea: { pt: "Educação Infantil", en: "Early Childhood Education" },
    resultType: "exploratory",
    references: [
      "Coletivo ESE de Santarém (2024). Adaptação do Método Ubuntu à Educação Pré-Escolar. Ubuntu: Revista de Ciências Sociais e Humanas, 2, 52–94.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "Silva, I. L. (coord.) (2016). Orientações Curriculares para a Educação Pré-Escolar. Ministério da Educação / DGE.",
      "Formosinho, J. (2013). Modelos Curriculares para a Educação de Infância. Porto Editora.",
    ],
  },
  {
    id: 204,
    issue: 2,
    year: 2024,
    title: {
      pt: "O Contributo Ubuntu",
      en: "The Ubuntu Contribution",
    },
    subtitle: {
      pt: "Na (res)significação e (re)valorização do papel docente",
      en: "In the (re)signification and (re)valorization of the teaching role",
    },
    authors: ["Cândida Silva", "Elisabete Carvalho", "Helena Vieira", "Joana Oliveira"],
    language: "pt",
    affiliations: ["Agrupamento de Escolas Ubuntu, Norte de Portugal"],
    abstract: {
      pt: "Estudo qualitativo que investiga o contributo da experiência Ubuntu na ressignificação e revalorização do papel docente. Analisa como a formação Ubuntu promove uma reconfiguração do locus profissional, alterando a forma como os docentes se percecionam e se relacionam com alunos e comunidade educativa, e desafiando-os a integrar competências socioemocionais na sua prática.",
      en: "Qualitative study investigating the contribution of the Ubuntu experience in the resignification and revalorization of the teaching role. Analyzes how Ubuntu training promotes a reconfiguration of the professional locus, changing how teachers perceive themselves and relate to students and the educational community, and challenging them to integrate social-emotional competencies into their practice.",
    },
    objectives: [
      { pt: "Investigar o contributo Ubuntu na ressignificação do papel docente", en: "Investigate Ubuntu's contribution to the resignification of the teaching role" },
      { pt: "Analisar a reconfiguração do locus profissional dos docentes", en: "Analyze the reconfiguration of teachers' professional locus" },
      { pt: "Avaliar o potencial das Escolas Ubuntu para desenvolver competências socioemocionais", en: "Assess the potential of Ubuntu Schools to develop social-emotional competencies" },
    ],
    methodology: { pt: "Estudo qualitativo", en: "Qualitative study" },
    methodologyDetail: {
      pt: "Estudo qualitativo com entrevistas semiestruturadas a docentes que participaram na formação Ubuntu, complementadas por análise de reflexões escritas e análise documental.",
      en: "Qualitative study with semi-structured interviews with teachers who participated in Ubuntu training, complemented by analysis of written reflections and document analysis.",
    },
    sampleType: { pt: "Docentes de Escolas Ubuntu", en: "Ubuntu Schools teachers" },
    sampleDetail: {
      pt: "Docentes de Escolas Ubuntu do norte de Portugal que realizaram formação Ubuntu e implementaram práticas Ubuntu nas suas aulas.",
      en: "Teachers from Ubuntu Schools in northern Portugal who completed Ubuntu training and implemented Ubuntu practices in their classes.",
    },
    instruments: [
      { pt: "Entrevistas semiestruturadas", en: "Semi-structured interviews" },
      { pt: "Análise de reflexões escritas", en: "Analysis of written reflections" },
      { pt: "Análise documental", en: "Document analysis" },
    ],
    pages: "95–120",
    keyFindings: [
      { pt: "A experiência Ubuntu promove uma reconfiguração do locus profissional dos docentes.", en: "The Ubuntu experience promotes a reconfiguration of teachers' professional locus." },
      { pt: "Alteração significativa na forma como os docentes se percecionam e se relacionam com alunos e comunidade educativa.", en: "Significant change in how teachers perceive themselves and relate to students and the educational community." },
      { pt: "As Escolas Ubuntu possuem potencial para desenvolver competências socioemocionais nos alunos.", en: "Ubuntu Schools have potential to develop social-emotional competencies in students." },
      { pt: "Os docentes são desafiados a criar instrumentos de validação de competências socioemocionais e a refleti-las na avaliação.", en: "Teachers are challenged to create validation instruments for social-emotional competencies and reflect them in assessment." },
    ],
    conclusion: {
      pt: "A experiência Ubuntu contribui para uma ressignificação profunda do papel docente, promovendo novas formas de relação pedagógica e desafiando os professores a integrarem competências socioemocionais na sua prática e avaliação.",
      en: "The Ubuntu experience contributes to a profound resignification of the teaching role, promoting new forms of pedagogical relationship and challenging teachers to integrate social-emotional competencies into their practice and assessment.",
    },
    mainResults: {
      pt: "Reconfiguração do locus profissional dos docentes. Alteração significativa na perceção de si e na relação com alunos. Potencial para desenvolver competências socioemocionais nos alunos. Desafio de criar instrumentos de validação e refletir competências na avaliação.",
      en: "Reconfiguration of teachers' professional locus. Significant change in self-perception and relationship with students. Potential to develop social-emotional competencies in students. Challenge of creating validation instruments and reflecting competencies in assessment.",
    },
    limitations: { pt: "Amostra limitada a docentes de Escolas Ubuntu já comprometidos com o programa.", en: "Sample limited to Ubuntu Schools teachers already committed to the program." },
    recommendations: { pt: "Criar instrumentos de validação de competências socioemocionais. Integrar a reflexão Ubuntu na formação inicial de professores.", en: "Create validation instruments for social-emotional competencies. Integrate Ubuntu reflection into initial teacher training." },
    tags: [
      { pt: "Docentes", en: "Teachers" },
      { pt: "Identidade Profissional", en: "Professional Identity" },
      { pt: "Competências Socioemocionais", en: "Social-Emotional Competencies" },
    ],
    impactArea: { pt: "Desenvolvimento Docente", en: "Teacher Development" },
    resultType: "positive",
    references: [
      "Silva, C., Carvalho, E., Vieira, H. & Oliveira, J. (2024). O Contributo Ubuntu. Ubuntu: Revista de Ciências Sociais e Humanas, 2, 95–120.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "Nóvoa, A. (2009). Para uma formação de professores construída dentro da profissão. Revista de Educación, 350, 203–218.",
      "Day, C. (2004). A Passion for Teaching. RoutledgeFalmer.",
    ],
  },
  {
    id: 205,
    issue: 2,
    year: 2024,
    title: {
      pt: "Ubuntu e Exercício Profissional Docente",
      en: "Ubuntu and Professional Teaching Practice",
    },
    subtitle: {
      pt: "O que mudou no Agrupamento de Escolas de Campo?",
      en: "What changed at the Campo School Cluster?",
    },
    authors: ["Sandra Salgado", "Mónica Nogueira Soares", "Daniela Gonçalves"],
    language: "pt",
    affiliations: ["Agrupamento de Escolas de Campo", "Escola Superior de Educação Paula Frassinetti"],
    abstract: {
      pt: "Estudo qualitativo que analisa as mudanças no exercício profissional docente no Agrupamento de Escolas de Campo após a implementação do Ubuntu. Investiga três dimensões de transformação: pessoal, profissional e institucional, revelando como os professores se tornaram 'costureiros de sonhos' e como os alunos passaram a comportar-se como agentes de mudança.",
      en: "Qualitative study analyzing changes in professional teaching practice at the Campo School Cluster after Ubuntu implementation. Investigates three transformation dimensions: personal, professional and institutional, revealing how teachers became 'dream weavers' and how students began behaving as change agents.",
    },
    objectives: [
      { pt: "Identificar mudanças no exercício profissional docente após o Ubuntu", en: "Identify changes in professional teaching practice after Ubuntu" },
      { pt: "Analisar a transformação nas dimensões pessoal, profissional e institucional", en: "Analyze transformation across personal, professional and institutional dimensions" },
      { pt: "Compreender como os alunos se tornam agentes de mudança", en: "Understand how students become change agents" },
    ],
    methodology: { pt: "Estudo qualitativo", en: "Qualitative study" },
    methodologyDetail: {
      pt: "Estudo qualitativo com entrevistas semiestruturadas a docentes do Agrupamento de Escolas de Campo, análise documental do projeto educativo e observação de práticas pedagógicas.",
      en: "Qualitative study with semi-structured interviews with Campo School Cluster teachers, document analysis of the educational project and observation of pedagogical practices.",
    },
    sampleType: { pt: "Docentes do AE de Campo", en: "Campo School Cluster teachers" },
    sampleDetail: {
      pt: "Docentes do Agrupamento de Escolas de Campo que participaram na formação Ubuntu e implementaram práticas Ubuntu nas suas aulas.",
      en: "Campo School Cluster teachers who participated in Ubuntu training and implemented Ubuntu practices in their classes.",
    },
    instruments: [
      { pt: "Entrevistas semiestruturadas", en: "Semi-structured interviews" },
      { pt: "Análise documental", en: "Document analysis" },
      { pt: "Observação de práticas", en: "Practice observation" },
    ],
    pages: "121–146",
    keyFindings: [
      { pt: "A experiência Ubuntu criou maior proximidade e coesão entre docentes.", en: "The Ubuntu experience created greater proximity and cohesion among teachers." },
      { pt: "Os alunos passaram a pensar-se e comportar-se como agentes de mudança na comunidade.", en: "Students began to think of and behave as change agents in the community." },
      { pt: "O Ubuntu é considerado 'um estilo de ser e de estar na profissão e na vida'.", en: "Ubuntu is considered 'a way of being in the profession and in life'." },
      { pt: "A metodologia dá recursos aos professores para desenvolver competências socioemocionais dos alunos.", en: "The methodology gives teachers resources to develop students' social-emotional competencies." },
    ],
    conclusion: {
      pt: "O Ubuntu transforma a prática docente nas três dimensões — pessoal, profissional e institucional — e os 'professores são costureiros de sonhos'. É necessário multiplicar estas experiências e expandir a ética de cuidado que lhes está subjacente.",
      en: "Ubuntu transforms teaching practice across three dimensions — personal, professional and institutional — and 'teachers are dream weavers'. It is necessary to multiply these experiences and expand the underlying ethics of care.",
    },
    mainResults: {
      pt: "Maior proximidade e coesão entre docentes. Os alunos tornaram-se agentes de mudança na comunidade. O Ubuntu é considerado 'um estilo de ser e de estar na profissão e na vida'. A metodologia dá recursos para desenvolver competências socioemocionais.",
      en: "Greater proximity and cohesion among teachers. Students became change agents in the community. Ubuntu is considered 'a way of being in the profession and in life'. The methodology provides resources to develop social-emotional competencies.",
    },
    limitations: { pt: "Estudo limitado a um agrupamento específico, com possível viés de seleção.", en: "Study limited to a specific cluster, with possible selection bias." },
    recommendations: { pt: "Multiplicar estas experiências em mais agrupamentos. Expandir a ética de cuidado a toda a comunidade educativa.", en: "Multiply these experiences in more clusters. Expand the ethics of care to the entire educational community." },
    tags: [
      { pt: "Prática Docente", en: "Teaching Practice" },
      { pt: "Coesão", en: "Cohesion" },
      { pt: "Agentes de Mudança", en: "Change Agents" },
    ],
    impactArea: { pt: "Desenvolvimento Profissional", en: "Professional Development" },
    resultType: "positive",
    references: [
      "Salgado, S., Soares, M. N. & Gonçalves, D. (2024). Ubuntu e Exercício Profissional Docente. Ubuntu: Revista de Ciências Sociais e Humanas, 2, 121–146.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "Fullan, M. (2007). The New Meaning of Educational Change. 4th ed. Teachers College Press.",
      "Hargreaves, A. & Fullan, M. (2012). Professional Capital: Transforming Teaching in Every School. Teachers College Press.",
    ],
  },
  {
    id: 206,
    issue: 2,
    year: 2024,
    title: {
      pt: "A Relação entre os Espaços Físicos",
      en: "The Relationship Between Physical Spaces",
    },
    subtitle: {
      pt: "E as práticas nas Academias de Líderes Ubuntu",
      en: "And practices in the Ubuntu Leaders Academies",
    },
    authors: ["Cassio Carvalho", "Alexandra Alegre", "Teresa Heitor", "Francisco Bastos"],
    language: "pt",
    affiliations: ["Instituto Superior Técnico, Universidade de Lisboa"],
    abstract: {
      pt: "Estudo que analisa a relação entre os espaços físicos e as práticas nas Academias de Líderes Ubuntu. Investiga como o espaço pode tornar-se parte integrante da identidade Ubuntu nas escolas, combinando dimensões espaciais e comunicacionais para criar uma narrativa espacial que sustente a vivência Ubuntu para além das atividades pontuais.",
      en: "Study analyzing the relationship between physical spaces and practices in the Ubuntu Leaders Academies. Investigates how space can become an integral part of Ubuntu identity in schools, combining spatial and communicational dimensions to create a spatial narrative that sustains the Ubuntu experience beyond occasional activities.",
    },
    objectives: [
      { pt: "Analisar a relação entre espaço físico e práticas Ubuntu", en: "Analyze the relationship between physical space and Ubuntu practices" },
      { pt: "Propor o conceito de narrativa espacial Ubuntu", en: "Propose the concept of Ubuntu spatial narrative" },
      { pt: "Identificar como criar uma identidade espacial Ubuntu no espaço escolar", en: "Identify how to create a Ubuntu spatial identity in the school space" },
    ],
    methodology: { pt: "Observação direta + Entrevistas", en: "Direct observation + Interviews" },
    methodologyDetail: {
      pt: "Observação direta de espaços escolares durante atividades Ubuntu, complementada com entrevistas a professores e animadores sobre a utilização e transformação dos espaços.",
      en: "Direct observation of school spaces during Ubuntu activities, complemented with interviews with teachers and facilitators about the use and transformation of spaces.",
    },
    sampleType: { pt: "Professores e Animadores Ubuntu", en: "Ubuntu Teachers and Facilitators" },
    sampleDetail: {
      pt: "Professores e animadores Ubuntu de escolas com experiência na implementação do programa, com foco nos espaços utilizados durante as Semanas Ubuntu.",
      en: "Ubuntu teachers and facilitators from schools with program implementation experience, focusing on spaces used during Ubuntu Weeks.",
    },
    instruments: [
      { pt: "Observação direta dos espaços", en: "Direct observation of spaces" },
      { pt: "Entrevistas semiestruturadas", en: "Semi-structured interviews" },
      { pt: "Análise espacial", en: "Spatial analysis" },
      { pt: "Registo fotográfico", en: "Photographic record" },
    ],
    pages: "147–166",
    keyFindings: [
      { pt: "O espaço físico pode tornar-se parte integrante da identidade Ubuntu nas escolas.", en: "Physical space can become an integral part of Ubuntu identity in schools." },
      { pt: "A combinação das dimensões espacial e comunicacional permite criar uma narrativa espacial Ubuntu.", en: "The combination of spatial and communicational dimensions allows creating a Ubuntu spatial narrative." },
      { pt: "A narrativa espacial é um requisito importante para a expansão da vivência Ubuntu.", en: "The spatial narrative is an important requirement for expanding the Ubuntu experience." },
      { pt: "Proposta de reflexão sobre como criar uma identidade espacial Ubuntu no espaço escolar.", en: "Proposal for reflection on how to create a Ubuntu spatial identity in the school space." },
    ],
    conclusion: {
      pt: "A criação de uma narrativa espacial Ubuntu no espaço escolar, combinando dimensões espaciais e comunicacionais, é fundamental para que o Ubuntu se torne uma vivência integrada e não apenas uma atividade pontual.",
      en: "Creating a Ubuntu spatial narrative in the school space, combining spatial and communicational dimensions, is fundamental for Ubuntu to become an integrated experience and not just an occasional activity.",
    },
    mainResults: {
      pt: "O espaço físico pode integrar a identidade Ubuntu. A combinação de dimensões espacial e comunicacional cria uma narrativa espacial Ubuntu. Esta narrativa é requisito para a expansão da vivência Ubuntu. Proposta de reflexão sobre identidade espacial Ubuntu.",
      en: "Physical space can integrate Ubuntu identity. The combination of spatial and communicational dimensions creates a Ubuntu spatial narrative. This narrative is a requirement for expanding the Ubuntu experience. Proposal for reflection on Ubuntu spatial identity.",
    },
    limitations: { pt: "Estudo exploratório com foco conceptual. Necessidade de desenvolver ferramentas práticas de implementação.", en: "Exploratory study with conceptual focus. Need to develop practical implementation tools." },
    recommendations: { pt: "Criar guias para a construção de narrativas espaciais Ubuntu. Envolver arquitetos e designers na planificação de espaços Ubuntu.", en: "Create guides for building Ubuntu spatial narratives. Involve architects and designers in planning Ubuntu spaces." },
    tags: [
      { pt: "Espaços Físicos", en: "Physical Spaces" },
      { pt: "Narrativa Espacial", en: "Spatial Narrative" },
      { pt: "Identidade", en: "Identity" },
    ],
    impactArea: { pt: "Arquitetura Escolar", en: "School Architecture" },
    resultType: "exploratory",
    references: [
      "Carvalho, C., Alegre, A., Heitor, T. & Bastos, F. (2024). A Relação entre os Espaços Físicos e as Práticas nas ALU. Ubuntu: Revista de Ciências Sociais e Humanas, 2, 147–166.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "Heitor, T. (2011). A Escola como Espaço de Aprendizagem. Parques Escolares.",
      "Lefebvre, H. (1991). The Production of Space. Blackwell.",
    ],
  },
  {
    id: 207,
    issue: 2,
    year: 2024,
    title: {
      pt: "A Construção de Agentes de Mudança através do Clube Ubuntu",
      en: "Building Change Agents through the Ubuntu Club",
    },
    subtitle: {
      pt: "Um estudo de caso no ensino secundário",
      en: "A case study in secondary education",
    },
    authors: ["Ivânia Alexandre"],
    language: "pt",
    affiliations: ["Universidade Católica Portuguesa"],
    abstract: {
      pt: "Estudo de caso no ensino secundário que investiga como o Clube Ubuntu promove a construção de agentes de mudança. Analisa a promoção da ética do cuidado, da liderança servidora e de relações significativas, bem como o alargamento dos efeitos Ubuntu à comunidade envolvente da escola.",
      en: "Case study in secondary education investigating how the Ubuntu Club promotes the building of change agents. Analyzes the promotion of the ethics of care, servant leadership and meaningful relationships, as well as the extension of Ubuntu effects to the surrounding school community.",
    },
    objectives: [
      { pt: "Investigar como o Clube Ubuntu promove agentes de mudança", en: "Investigate how the Ubuntu Club promotes change agents" },
      { pt: "Analisar o desenvolvimento da liderança servidora nos participantes", en: "Analyze the development of servant leadership in participants" },
      { pt: "Avaliar o alargamento dos efeitos à comunidade", en: "Assess the extension of effects to the community" },
    ],
    methodology: { pt: "Estudo de caso", en: "Case study" },
    methodologyDetail: {
      pt: "Estudo de caso com entrevistas semiestruturadas a participantes do Clube Ubuntu, observação participante das atividades do Clube e análise documental dos projetos desenvolvidos.",
      en: "Case study with semi-structured interviews with Ubuntu Club participants, participant observation of Club activities and document analysis of developed projects.",
    },
    sampleType: { pt: "Participantes do Clube Ubuntu", en: "Ubuntu Club participants" },
    sampleDetail: {
      pt: "Participantes do Clube Ubuntu de uma escola secundária, incluindo alunos líderes, professores coordenadores e membros da comunidade envolvidos nos projetos.",
      en: "Ubuntu Club participants from a secondary school, including student leaders, coordinating teachers and community members involved in projects.",
    },
    instruments: [
      { pt: "Entrevistas semiestruturadas", en: "Semi-structured interviews" },
      { pt: "Observação participante", en: "Participant observation" },
      { pt: "Análise documental dos projetos", en: "Document analysis of projects" },
    ],
    pages: "167–202",
    keyFindings: [
      { pt: "O Clube Ubuntu promove a ética do cuidado e a liderança servidora nos participantes.", en: "The Ubuntu Club promotes the ethics of care and servant leadership in participants." },
      { pt: "Os alunos demonstram maior abertura e expansão na forma de pensar.", en: "Students demonstrate greater openness and expansion in their thinking." },
      { pt: "Construção de relações significativas e laços de confiança na comunidade escolar.", en: "Building of meaningful relationships and trust bonds in the school community." },
      { pt: "Alargamento dos efeitos Ubuntu à comunidade envolvente da escola.", en: "Extension of Ubuntu effects to the surrounding school community." },
    ],
    conclusion: {
      pt: "O Clube Ubuntu é um espaço privilegiado para a construção de agentes de mudança, promovendo a liderança servidora, a união escolar em torno de projetos comuns e estendendo os seus efeitos positivos à comunidade.",
      en: "The Ubuntu Club is a privileged space for building change agents, promoting servant leadership, school unity around common projects and extending its positive effects to the community.",
    },
    mainResults: {
      pt: "O Clube promove a ética do cuidado e a liderança servidora. Os alunos demonstram maior abertura e expansão no pensamento. Construção de relações significativas e laços de confiança. Alargamento dos efeitos Ubuntu à comunidade envolvente.",
      en: "The Club promotes the ethics of care and servant leadership. Students demonstrate greater openness and expansion in thinking. Building of meaningful relationships and trust bonds. Extension of Ubuntu effects to the surrounding community.",
    },
    limitations: { pt: "Estudo de caso único. Necessidade de avaliar o impacto a longo prazo nos alunos participantes.", en: "Single case study. Need to assess long-term impact on participating students." },
    recommendations: { pt: "Criar redes entre Clubes Ubuntu de diferentes escolas. Desenvolver métricas para avaliar o impacto comunitário.", en: "Create networks between Ubuntu Clubs from different schools. Develop metrics to assess community impact." },
    tags: [
      { pt: "Clube Ubuntu", en: "Ubuntu Club" },
      { pt: "Liderança Servidora", en: "Servant Leadership" },
      { pt: "Comunidade", en: "Community" },
    ],
    impactArea: { pt: "Ensino Secundário", en: "Secondary Education" },
    resultType: "positive",
    references: [
      "Alexandre, I. (2024). A Construção de Agentes de Mudança através do Clube Ubuntu. Ubuntu: Revista de Ciências Sociais e Humanas, 2, 167–202.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "Greenleaf, R. K. (1977). Servant Leadership: A Journey into the Nature of Legitimate Power and Greatness. Paulist Press.",
      "Noddings, N. (2013). Caring: A Relational Approach to Ethics and Moral Education. 2nd ed. University of California Press.",
    ],
  },
  {
    id: 208,
    issue: 2,
    year: 2024,
    title: {
      pt: "A Experiência do Projeto da Academia de Líderes Ubuntu",
      en: "The Ubuntu Leaders Academy Project Experience",
    },
    subtitle: {
      pt: "Escolas no Agrupamento de Escolas Júlio Dinis (Grijó)",
      en: "Schools at the Júlio Dinis School Cluster (Grijó)",
    },
    authors: ["Alexandra Oliveira", "Gabriela Longo"],
    language: "pt",
    affiliations: ["Agrupamento de Escolas Júlio Dinis, Grijó"],
    abstract: {
      pt: "Estudo reflexivo sobre a experiência do projeto da ALU no Agrupamento de Escolas Júlio Dinis (Grijó), com foco no funcionamento semanal do Clube Ubuntu. Analisa a importância da articulação com o projeto educativo, a natureza colaborativa do Clube e desenvolve exemplos de ferramentas de trabalho para identidade, coesão e empreendedorismo social.",
      en: "Reflective study on the ALU project experience at the Júlio Dinis School Cluster (Grijó), focusing on the weekly Ubuntu Club operation. Analyzes the importance of articulation with the educational project, the Club's collaborative nature and develops examples of work tools for identity, cohesion and social entrepreneurship.",
    },
    objectives: [
      { pt: "Documentar a experiência do Clube Ubuntu no agrupamento", en: "Document the Ubuntu Club experience in the cluster" },
      { pt: "Analisar a articulação com o projeto educativo da escola", en: "Analyze articulation with the school's educational project" },
      { pt: "Desenvolver ferramentas de trabalho para o Clube Ubuntu", en: "Develop work tools for the Ubuntu Club" },
    ],
    methodology: { pt: "Estudo reflexivo", en: "Reflective study" },
    methodologyDetail: {
      pt: "Estudo reflexivo baseado na documentação sistemática das atividades do Clube Ubuntu, incluindo registos de sessões, análise de projetos desenvolvidos e reflexões dos participantes.",
      en: "Reflective study based on systematic documentation of Ubuntu Club activities, including session records, analysis of developed projects and participant reflections.",
    },
    sampleType: { pt: "Clube Ubuntu semanal", en: "Weekly Ubuntu Club" },
    sampleDetail: {
      pt: "Participantes do Clube Ubuntu semanal do Agrupamento de Escolas Júlio Dinis, incluindo alunos, professores coordenadores e parceiros comunitários.",
      en: "Weekly Ubuntu Club participants from the Júlio Dinis School Cluster, including students, coordinating teachers and community partners.",
    },
    instruments: [
      { pt: "Registos de sessões", en: "Session records" },
      { pt: "Análise de projetos", en: "Project analysis" },
      { pt: "Reflexões escritas", en: "Written reflections" },
      { pt: "Ferramentas de trabalho desenvolvidas", en: "Developed work tools" },
    ],
    pages: "203–228",
    keyFindings: [
      { pt: "A articulação com o projeto educativo da escola é requisito importante para o Clube Ubuntu não ser experiência isolada.", en: "Articulation with the school's educational project is an important requirement for the Ubuntu Club not to be an isolated experience." },
      { pt: "A natureza colaborativa é essencial na construção da identidade e atividades do Clube.", en: "The collaborative nature is essential in building the Club's identity and activities." },
      { pt: "Desenvolvidos exemplos de ferramentas de trabalho para identidade, coesão e empreendedorismo social.", en: "Examples of work tools developed for identity, cohesion and social entrepreneurship." },
      { pt: "A aprendizagem em serviço é um pilar central da experiência do Clube Ubuntu.", en: "Service learning is a central pillar of the Ubuntu Club experience." },
    ],
    conclusion: {
      pt: "O Clube Ubuntu necessita de articulação com o projeto educativo da escola e de uma construção colaborativa da sua identidade para não se tornar uma experiência isolada, podendo potenciar a coesão, o empreendedorismo social e a aprendizagem em serviço.",
      en: "The Ubuntu Club needs articulation with the school's educational project and collaborative construction of its identity to avoid becoming an isolated experience, potentially enhancing cohesion, social entrepreneurship and service learning.",
    },
    mainResults: {
      pt: "A articulação com o projeto educativo é requisito para o Clube não ser experiência isolada. A natureza colaborativa é essencial na construção da identidade. Desenvolvidas ferramentas para identidade, coesão e empreendedorismo social. A aprendizagem em serviço é pilar central.",
      en: "Articulation with the educational project is a requirement for the Club not to be an isolated experience. The collaborative nature is essential for identity building. Tools developed for identity, cohesion and social entrepreneurship. Service learning is a central pillar.",
    },
    limitations: { pt: "Estudo reflexivo sem componente empírica rigorosa. Dificuldade em isolar os efeitos do Clube de outras variáveis escolares.", en: "Reflective study without rigorous empirical component. Difficulty in isolating Club effects from other school variables." },
    recommendations: { pt: "Partilhar as ferramentas desenvolvidas com outros Clubes Ubuntu. Criar uma rede de partilha de boas práticas entre clubes.", en: "Share developed tools with other Ubuntu Clubs. Create a network for sharing best practices between clubs." },
    tags: [
      { pt: "Projeto Educativo", en: "Educational Project" },
      { pt: "Colaboração", en: "Collaboration" },
      { pt: "Empreendedorismo Social", en: "Social Entrepreneurship" },
    ],
    impactArea: { pt: "Gestão Escolar", en: "School Management" },
    resultType: "exploratory",
    references: [
      "Oliveira, A. & Longo, G. (2024). A Experiência do Projeto da ALU no AE Júlio Dinis. Ubuntu: Revista de Ciências Sociais e Humanas, 2, 203–228.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "IPAV (2023). Manual dos Clubes Ubuntu.",
      "Dewey, J. (1938). Experience and Education. Kappa Delta Pi.",
    ],
  },
  {
    id: 209,
    issue: 2,
    year: 2024,
    title: {
      pt: "Avaliação da Implementação do Programa das Academias de Líderes Ubuntu",
      en: "Evaluation of the Ubuntu Leaders Academies Program Implementation",
    },
    subtitle: {
      pt: "Em escolas TEIP da área metropolitana de Lisboa",
      en: "In TEIP schools in the Lisbon metropolitan area",
    },
    authors: ["António Castel-Branco"],
    language: "pt",
    affiliations: ["Investigador independente, Conselho Científico da ALU"],
    abstract: {
      pt: "Avaliação do programa das Academias de Líderes Ubuntu em escolas TEIP (Territórios Educativos de Intervenção Prioritária) da área metropolitana de Lisboa. Analisa o impacto na consciência social, participação comunitária e competência relacional dos alunos, verificando se os resultados perduram para além do período formal das Semanas Ubuntu.",
      en: "Evaluation of the Ubuntu Leaders Academies program in TEIP schools (Priority Intervention Educational Territories) in the Lisbon metropolitan area. Analyzes the impact on students' social awareness, community participation and relational competence, verifying whether results endure beyond the formal Ubuntu Weeks period.",
    },
    objectives: [
      { pt: "Avaliar a implementação do programa ALU em escolas TEIP", en: "Evaluate ALU program implementation in TEIP schools" },
      { pt: "Analisar o impacto na consciência social e participação comunitária", en: "Analyze impact on social awareness and community participation" },
      { pt: "Verificar a durabilidade dos efeitos no tempo", en: "Verify the durability of effects over time" },
    ],
    methodology: { pt: "Avaliação de programa", en: "Program evaluation" },
    methodologyDetail: {
      pt: "Avaliação de programa com abordagem mista, combinando dados quantitativos (questionários pré/pós) com dados qualitativos (entrevistas e grupos focais) em escolas TEIP da área metropolitana de Lisboa.",
      en: "Program evaluation with mixed approach, combining quantitative data (pre/post questionnaires) with qualitative data (interviews and focus groups) in TEIP schools in the Lisbon metropolitan area.",
    },
    sampleType: { pt: "Escolas TEIP – AML", en: "TEIP Schools – LMA" },
    sampleDetail: {
      pt: "Alunos, professores e membros da comunidade educativa de escolas TEIP da área metropolitana de Lisboa que participaram no programa ALU.",
      en: "Students, teachers and members of the educational community from TEIP schools in the Lisbon metropolitan area who participated in the ALU program.",
    },
    instruments: [
      { pt: "Questionários pré/pós-teste", en: "Pre/post-test questionnaires" },
      { pt: "Entrevistas semiestruturadas", en: "Semi-structured interviews" },
      { pt: "Grupos focais", en: "Focus groups" },
      { pt: "Análise documental", en: "Document analysis" },
    ],
    pages: "229–258",
    keyFindings: [
      { pt: "O programa contribuiu para uma maior consciência social e atenção ao outro nos alunos.", en: "The program contributed to greater social awareness and attention to others in students." },
      { pt: "Verificou-se maior participação na escola e na comunidade por parte dos alunos.", en: "Greater student participation in school and community was observed." },
      { pt: "Desenvolvimento de maior competência relacional e atitude diferente perante a vida.", en: "Development of greater relational competence and a different attitude towards life." },
      { pt: "Os resultados perduraram no tempo, não se circunscrevendo ao período das Semanas Ubuntu.", en: "Results endured over time, not limited to the Ubuntu Weeks period." },
    ],
    conclusion: {
      pt: "O programa Ubuntu em escolas TEIP gerou resultados positivos e duradouros na consciência social, competência relacional e participação comunitária dos alunos, demonstrando que os efeitos transcendem o período formal das Semanas Ubuntu.",
      en: "The Ubuntu program in TEIP schools generated positive and lasting results in students' social awareness, relational competence and community participation, demonstrating that effects transcend the formal Ubuntu Weeks period.",
    },
    mainResults: {
      pt: "Maior consciência social e atenção ao outro. Maior participação na escola e na comunidade. Desenvolvimento de competência relacional e atitude diferente perante a vida. Os resultados perduraram no tempo, transcendendo o período das Semanas Ubuntu.",
      en: "Greater social awareness and attention to others. Greater participation in school and community. Development of relational competence and a different attitude towards life. Results endured over time, transcending the Ubuntu Weeks period.",
    },
    limitations: { pt: "Contexto específico das escolas TEIP pode limitar a generalização. Necessidade de dados longitudinais mais robustos.", en: "Specific TEIP school context may limit generalization. Need for more robust longitudinal data." },
    recommendations: { pt: "Expandir o programa a mais escolas TEIP. Criar mecanismos de acompanhamento longitudinal dos participantes.", en: "Expand the program to more TEIP schools. Create longitudinal monitoring mechanisms for participants." },
    tags: [
      { pt: "TEIP", en: "TEIP" },
      { pt: "Avaliação", en: "Evaluation" },
      { pt: "Resultados Duradouros", en: "Lasting Results" },
      { pt: "Lisboa", en: "Lisbon" },
    ],
    impactArea: { pt: "Política Educativa", en: "Education Policy" },
    resultType: "positive",
    references: [
      "Castel-Branco, A. (2024). Avaliação da Implementação do Programa ALU em Escolas TEIP. Ubuntu: Revista de Ciências Sociais e Humanas, 2, 229–258.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "DGE (2012). Programa TEIP: Territórios Educativos de Intervenção Prioritária. Ministério da Educação.",
      "Canário, R., Alves, N. & Rolo, C. (2001). Escola e Exclusão Social. Educa.",
    ],
  },

  // ===== ISSUE 3 (2025) =====
  {
    id: 301,
    issue: 3,
    year: 2025,
    title: {
      pt: "Empoderamento do Espírito Ubuntu",
      en: "Empowering the Ubuntu Spirit",
    },
    subtitle: {
      pt: "Através de Instituições de Ensino Superior em África",
      en: "Through Higher Education Institutions in Africa",
    },
    authors: ["Mwakio Mwagandi", "Harry Mwailengo"],
    language: "en",
    affiliations: ["Taita Taveta University, Kenya", "Instituto Padre António Vieira, Kenya project"],
    abstract: {
      pt: "Reflexão sobre a implementação da Academia de Líderes Ubuntu em instituições de ensino superior em África, focando a experiência da Taita Taveta University no Quénia. Descreve o percurso desde a primeira formação até à criação do Ubuntu Leaders Academy Club, analisando a institucionalização, a sustentabilidade através do modelo Train-the-Trainer e apresentando uma análise SWOT para os clubes universitários Ubuntu.",
      en: "Reflection on the implementation of the Ubuntu Leaders Academy in higher education institutions in Africa, focusing on the experience of Taita Taveta University in Kenya. Describes the journey from the first training to the creation of the Ubuntu Leaders Academy Club, analyzing institutionalization, sustainability through the Train-the-Trainer model and presenting a SWOT analysis for university Ubuntu clubs.",
    },
    objectives: [
      { pt: "Descrever a implementação do Ubuntu na Taita Taveta University", en: "Describe Ubuntu implementation at Taita Taveta University" },
      { pt: "Analisar a sustentabilidade do modelo através de clubes estudantis", en: "Analyze model sustainability through student clubs" },
      { pt: "Apresentar uma análise SWOT para clubes universitários Ubuntu em África", en: "Present a SWOT analysis for university Ubuntu clubs in Africa" },
    ],
    methodology: { pt: "Ensaio reflexivo + Análise SWOT", en: "Reflective essay + SWOT Analysis" },
    methodologyDetail: {
      pt: "Ensaio reflexivo combinado com análise SWOT. Os autores, como líderes de equipa na implementação, partilham reflexões, sentimentos e experiências sobre o percurso de enraizamento do espírito Ubuntu no ensino superior africano, articulando com literatura relevante.",
      en: "Reflective essay combined with SWOT analysis. The authors, as team leaders in implementation, share reflections, feelings and experiences about the journey of rooting the Ubuntu spirit in African higher education, articulating with relevant literature.",
    },
    sampleType: { pt: "Taita Taveta University, Quénia", en: "Taita Taveta University, Kenya" },
    sampleDetail: {
      pt: "Mais de 100 estudantes da Taita Taveta University que completaram o programa Ubuntu até final de 2024, incluindo membros do Ubuntu Leaders Academy Club e Alumni.",
      en: "Over 100 students from Taita Taveta University who completed the Ubuntu program by the end of 2024, including Ubuntu Leaders Academy Club members and Alumni.",
    },
    instruments: [
      { pt: "Reflexão sistematizada", en: "Systematic reflection" },
      { pt: "Análise SWOT", en: "SWOT analysis" },
      { pt: "Revisão de literatura", en: "Literature review" },
      { pt: "Análise de dados do programa", en: "Program data analysis" },
    ],
    pages: "10–24",
    keyFindings: [
      { pt: "Mais de 100 estudantes da TTU completaram o programa Ubuntu até final de 2024.", en: "Over 100 TTU students completed the Ubuntu program by the end of 2024." },
      { pt: "A formação foi institucionalizada como cultura universitária com a criação do Ubuntu Leaders Academy Club.", en: "Training was institutionalized as university culture with the creation of the Ubuntu Leaders Academy Club." },
      { pt: "A filosofia Ubuntu transcende a sua origem sul-africana, sendo reconhecida em múltiplas culturas africanas.", en: "Ubuntu philosophy transcends its South African origin, being recognized across multiple African cultures." },
      { pt: "Análise SWOT identifica forças na sustentabilidade via ToT e fraquezas na dependência de financiamento externo.", en: "SWOT analysis identifies strengths in sustainability via ToT and weaknesses in dependence on external funding." },
    ],
    conclusion: {
      pt: "A implementação do Ubuntu em instituições de ensino superior africanas é viável e sustentável quando institucionalizada através de clubes estudantis e modelos de formação de formadores, demonstrando que os princípios Ubuntu são universais no continente africano.",
      en: "Ubuntu implementation in African higher education institutions is feasible and sustainable when institutionalized through student clubs and train-the-trainer models, demonstrating that Ubuntu principles are universal across the African continent.",
    },
    mainResults: {
      pt: "Mais de 100 estudantes formados. A formação foi institucionalizada como cultura universitária através do Ubuntu Leaders Academy Club. O modelo Train-the-Trainer garante sustentabilidade. A filosofia Ubuntu transcende a origem sul-africana, sendo reconhecida em múltiplas culturas africanas. Análise SWOT identifica forças e desafios específicos.",
      en: "Over 100 students trained. Training was institutionalized as university culture through the Ubuntu Leaders Academy Club. The Train-the-Trainer model ensures sustainability. Ubuntu philosophy transcends its South African origin, being recognized across multiple African cultures. SWOT analysis identifies specific strengths and challenges.",
    },
    limitations: { pt: "Reflexão baseada numa única instituição. Dados quantitativos limitados sobre o impacto a longo prazo.", en: "Reflection based on a single institution. Limited quantitative data on long-term impact." },
    recommendations: { pt: "Expandir o modelo a outras universidades africanas. Criar redes inter-universitárias de clubes Ubuntu. Desenvolver métricas de avaliação de impacto específicas para o ensino superior.", en: "Expand the model to other African universities. Create inter-university networks of Ubuntu clubs. Develop impact assessment metrics specific to higher education." },
    tags: [
      { pt: "Ensino Superior", en: "Higher Education" },
      { pt: "África", en: "Africa" },
      { pt: "Quénia", en: "Kenya" },
      { pt: "Sustentabilidade", en: "Sustainability" },
      { pt: "Internacionalização", en: "Internationalization" },
    ],
    impactArea: { pt: "Ensino Superior Internacional", en: "International Higher Education" },
    resultType: "positive",
    references: [
      "Ajitoni, B. D. (2024). Ubuntu and The Philosophy of Community in African Thought. Journal of African Studies and Sustainable Development, 7(3), 1–15.",
      "Ewuoso, C. & Hall, S. (2019). Core aspects of ubuntu: A systematic review. South African Journal of Bioethics and Law, 12(2), 93–103.",
      "Khomba, J. K. (2011). The African Ubuntu philosophy. University of Pretoria.",
      "Mwakio, M. S., Ndemo, B., Awino, Z. B. & Muya, N. (2022). The Influence of Organizational Size on Entrepreneurship Training. DBA Africa Management Review, 12(1), 106–119.",
      "Scheepers, J. (2019). Ubuntu, building bridges for peace. UBUNTU, 177.",
    ],
  },
  {
    id: 302,
    issue: 3,
    year: 2025,
    title: {
      pt: "O Olhar dos Estudantes sobre os Clubes Ubuntu",
      en: "Students' Perspectives on Ubuntu Clubs",
    },
    subtitle: {
      pt: "Um estudo sobre o programa Ubuntu no território educativo de Vila Nova de Gaia",
      en: "A study on the Ubuntu program in the Vila Nova de Gaia educational territory",
    },
    authors: ["Elsa Montenegro Marques", "Paula Vieira"],
    language: "pt",
    affiliations: ["Instituto Superior de Serviço Social do Porto, Centro Lusíada de Investigação em Serviço Social e Intervenção Social"],
    abstract: {
      pt: "Estudo qualitativo que analisa as perceções de 15 estudantes participantes de Clubes Ubuntu em 4 escolas do território educativo de Vila Nova de Gaia. Através de 4 grupos focais, explora três domínios: o impacto da formação Ubuntu nas suas vidas, o funcionamento dos Clubes Ubuntu e sugestões de melhoria. Parte de uma investigação maior sobre os efeitos do programa Ubuntu entre 2020 e 2022.",
      en: "Qualitative study analyzing the perceptions of 15 students participating in Ubuntu Clubs at 4 schools in the Vila Nova de Gaia educational territory. Through 4 focus groups, it explores three domains: the impact of Ubuntu training on their lives, the functioning of Ubuntu Clubs and improvement suggestions. Part of a larger investigation on the effects of the Ubuntu program between 2020 and 2022.",
    },
    objectives: [
      { pt: "Conhecer o impacto da formação Ubuntu na vida dos estudantes", en: "Understand the impact of Ubuntu training on students' lives" },
      { pt: "Analisar o funcionamento dos Clubes Ubuntu e as atividades desenvolvidas", en: "Analyze the functioning of Ubuntu Clubs and activities developed" },
      { pt: "Recolher sugestões para melhoria da formação e dos Clubes", en: "Collect suggestions for improving training and Clubs" },
    ],
    methodology: { pt: "Estudo qualitativo (grupos focais)", en: "Qualitative study (focus groups)" },
    methodologyDetail: {
      pt: "Estudo qualitativo com 4 grupos focais realizados entre abril e maio de 2022, com guião estruturado em três dimensões: impacto, funcionamento e sugestões. Análise de conteúdo dos discursos complementada por recolha documental de relatórios IPAV e planos de sessão.",
      en: "Qualitative study with 4 focus groups conducted between April and May 2022, with a script structured in three dimensions: impact, functioning and suggestions. Content analysis of discourses complemented by document collection of IPAV reports and session plans.",
    },
    sampleType: { pt: "15 estudantes de 4 Clubes Ubuntu (8.º e 11.º ano)", en: "15 students from 4 Ubuntu Clubs (8th and 11th grade)" },
    sampleDetail: {
      pt: "15 estudantes do 8.º e 11.º anos (14-17 anos), 10 do sexo feminino e 5 do sexo masculino, selecionados com base na sua participação ativa em Clubes Ubuntu de 4 escolas/agrupamentos de Vila Nova de Gaia. Todos realizaram formação Ubuntu em 2021.",
      en: "15 students from 8th and 11th grades (14-17 years old), 10 female and 5 male, selected based on their active participation in Ubuntu Clubs from 4 schools/clusters in Vila Nova de Gaia. All completed Ubuntu training in 2021.",
    },
    instruments: [
      { pt: "Grupos focais (4 sessões, 3-6 participantes cada)", en: "Focus groups (4 sessions, 3-6 participants each)" },
      { pt: "Guião de entrevista estruturado em 3 dimensões", en: "Interview script structured in 3 dimensions" },
      { pt: "Análise documental (relatórios IPAV, manual dos Clubes, planos de sessão)", en: "Document analysis (IPAV reports, Club manual, session plans)" },
      { pt: "Análise de conteúdo", en: "Content analysis" },
    ],
    pages: "25–56",
    keyFindings: [
      { pt: "Os Clubes Ubuntu proporcionam experiências enriquecedoras de vida em grupo, promovendo empatia e respeito mútuo.", en: "Ubuntu Clubs provide enriching group life experiences, promoting empathy and mutual respect." },
      { pt: "A Semana Ubuntu é catalisador para o envolvimento dos alunos em causas sociais e atividades de solidariedade.", en: "Ubuntu Week is a catalyst for student involvement in social causes and solidarity activities." },
      { pt: "Alunos relatam ganhos em autoconfiança, resiliência, gestão emocional e melhoria no desempenho escolar.", en: "Students report gains in self-confidence, resilience, emotional management and improved school performance." },
      { pt: "Necessidade de maior visibilidade dos Clubes, espaço físico próprio e maior participação dos alunos na gestão.", en: "Need for greater Club visibility, own physical space and greater student participation in management." },
    ],
    conclusion: {
      pt: "Os Clubes Ubuntu são espaços transformadores que desenvolvem competências socioemocionais e cidadania ativa, mas necessitam de maior institucionalização, visibilidade na comunidade escolar e participação ativa dos alunos na conceção das atividades.",
      en: "Ubuntu Clubs are transformative spaces that develop social-emotional competencies and active citizenship, but need greater institutionalization, visibility in the school community and active student participation in activity design.",
    },
    mainResults: {
      pt: "Os Clubes proporcionam experiências enriquecedoras de vida em grupo. A Semana Ubuntu é catalisador para envolvimento em causas sociais. Alunos relatam ganhos em autoconfiança, resiliência e gestão emocional. Melhoria das relações familiares. Necessidade de maior visibilidade, espaço físico e participação dos alunos na gestão.",
      en: "Clubs provide enriching group life experiences. Ubuntu Week is a catalyst for involvement in social causes. Students report gains in self-confidence, resilience and emotional management. Improved family relationships. Need for greater visibility, physical space and student participation in management.",
    },
    limitations: { pt: "Recorte de uma investigação maior; amostra limitada a 15 estudantes. Possível viés de seleção (participação ativa). Contexto territorial específico de Vila Nova de Gaia.", en: "Excerpt from a larger investigation; sample limited to 15 students. Possible selection bias (active participation). Specific territorial context of Vila Nova de Gaia." },
    recommendations: { pt: "Ampliar visibilidade da metodologia Ubuntu na comunidade escolar. Ter calendário mais frequente de atividades e espaço físico próprio. Favorecer coparticipação dos alunos na gestão dos Clubes. Reforçar parcerias locais.", en: "Increase visibility of the Ubuntu methodology in the school community. Have a more frequent activity calendar and own physical space. Favor student co-participation in Club management. Strengthen local partnerships." },
    tags: [
      { pt: "Clubes Ubuntu", en: "Ubuntu Clubs" },
      { pt: "Vila Nova de Gaia", en: "Vila Nova de Gaia" },
      { pt: "Grupos Focais", en: "Focus Groups" },
      { pt: "Cidadania", en: "Citizenship" },
    ],
    impactArea: { pt: "Ensino Básico e Secundário", en: "Primary and Secondary Education" },
    resultType: "positive",
    references: [
      "Marques, E. M. & Vieira, P. (2025). O Olhar dos Estudantes sobre os Clubes Ubuntu. Ubuntu: Revista de Ciências Sociais e Humanas, 3, 25–56.",
      "Chernyshenko, O., Kankaraš, M. & Drasgow, F. (2018). Social and Emotional Skills for Student Success. OECD Education Working Paper No. 173.",
      "Kankaraš, M. (2017). Personality matters: Relevance and assessment of personality characteristics. OECD Education Working Papers, No. 157.",
      "Kautz, T., Heckman, J., Diris, R., ter Weel, B. & Borghans, L. (2014). Fostering and Measuring Skills. Paris: OECD.",
      "Marques, E. M. et al. (2024). Programa Escolas Ubuntu: capacitação de jovens. CLISSIS.",
    ],
  },
  {
    id: 303,
    issue: 3,
    year: 2025,
    title: {
      pt: "Discursos de Adolescentes",
      en: "Adolescent Discourses",
    },
    subtitle: {
      pt: "O método Ubuntu de educação para valores",
      en: "The Ubuntu method of values education",
    },
    authors: ["Ana Maria Tomás Almeida", "Josélia Fonseca", "Eric Rocha"],
    language: "pt",
    affiliations: ["Universidade do Minho, Centro de Investigação em Estudos da Criança"],
    abstract: {
      pt: "Estudo baseado na análise de discursos de 117 adolescentes participantes das Semanas Ubuntu em 6 escolas portuguesas, com idades entre 12 e 19 anos. Identifica fortes indicadores do potencial pedagógico do método Ubuntu, mobilizando as dimensões cognitiva, moral e emocional dos participantes, com foco no impacto da educação para os valores através do storytelling e das discussões morais.",
      en: "Study based on discourse analysis of 117 adolescents participating in Ubuntu Weeks at 6 Portuguese schools, aged 12 to 19. Identifies strong indicators of the pedagogical potential of the Ubuntu method, mobilizing participants' cognitive, moral and emotional dimensions, focusing on the impact of values education through storytelling and moral discussions.",
    },
    objectives: [
      { pt: "Analisar os discursos dos adolescentes sobre a experiência Ubuntu", en: "Analyze adolescent discourses about the Ubuntu experience" },
      { pt: "Avaliar o potencial pedagógico do método para a educação para valores", en: "Assess the pedagogical potential of the method for values education" },
      { pt: "Identificar o impacto do storytelling e das discussões morais", en: "Identify the impact of storytelling and moral discussions" },
    ],
    methodology: { pt: "Análise de discursos", en: "Discourse analysis" },
    methodologyDetail: {
      pt: "Análise de discursos com metodologia qualitativa. Recolha e análise temática dos discursos de 117 adolescentes, focando as dimensões cognitiva, moral e emocional emergentes das narrativas sobre a experiência Ubuntu.",
      en: "Discourse analysis with qualitative methodology. Collection and thematic analysis of discourses from 117 adolescents, focusing on the cognitive, moral and emotional dimensions emerging from narratives about the Ubuntu experience.",
    },
    sampleType: { pt: "117 adolescentes de 6 escolas (12–19 anos)", en: "117 adolescents from 6 schools (ages 12–19)" },
    sampleDetail: {
      pt: "117 adolescentes de 6 escolas portuguesas, com idades entre 12 e 19 anos, que participaram em Semanas Ubuntu.",
      en: "117 adolescents from 6 Portuguese schools, aged 12 to 19, who participated in Ubuntu Weeks.",
    },
    instruments: [
      { pt: "Recolha de discursos", en: "Discourse collection" },
      { pt: "Análise de conteúdo temática", en: "Thematic content analysis" },
      { pt: "Categorização por dimensões (cognitiva, moral, emocional)", en: "Categorization by dimensions (cognitive, moral, emotional)" },
    ],
    pages: "57–99",
    keyFindings: [
      { pt: "Fortes indicadores do potencial pedagógico do método Ubuntu nas dimensões cognitiva, moral e emocional.", en: "Strong indicators of the Ubuntu method's pedagogical potential in cognitive, moral and emotional dimensions." },
      { pt: "O storytelling e as discussões morais mobilizam os jovens para adotar valores pró-sociais.", en: "Storytelling and moral discussions mobilize young people to adopt pro-social values." },
      { pt: "A identificação com figuras narrativas poderosas promove a corresponsabilidade e a empatia.", en: "Identification with powerful narrative figures promotes co-responsibility and empathy." },
      { pt: "As estratégias do método mostram potencial para desenvolver cidadania ativa e autonomia moral.", en: "The method's strategies show potential for developing active citizenship and moral autonomy." },
    ],
    conclusion: {
      pt: "O método Ubuntu fornece um ambiente estruturado para a educação de valores, onde o storytelling e as discussões morais promovem uma mudança do individualismo para a responsabilidade compartilhada e o envolvimento cívico dos adolescentes.",
      en: "The Ubuntu method provides a structured environment for values education, where storytelling and moral discussions promote a shift from individualism to shared responsibility and adolescent civic engagement.",
    },
    mainResults: {
      pt: "Fortes indicadores do potencial pedagógico nas dimensões cognitiva, moral e emocional. O storytelling e as discussões morais mobilizam jovens para valores pró-sociais. A identificação com figuras narrativas promove corresponsabilidade e empatia. As estratégias mostram potencial para cidadania ativa e autonomia moral.",
      en: "Strong indicators of pedagogical potential in cognitive, moral and emotional dimensions. Storytelling and moral discussions mobilize young people for pro-social values. Identification with narrative figures promotes co-responsibility and empathy. Strategies show potential for active citizenship and moral autonomy.",
    },
    limitations: { pt: "Análise baseada em discursos, sem medição quantitativa da mudança comportamental. Representatividade limitada a 6 escolas.", en: "Analysis based on discourses, without quantitative measurement of behavioral change. Representativeness limited to 6 schools." },
    recommendations: { pt: "Realizar estudos longitudinais para avaliar a tradução dos discursos em comportamentos. Aprofundar a análise por faixa etária e contexto socioeconómico.", en: "Conduct longitudinal studies to assess the translation of discourses into behaviors. Deepen analysis by age group and socioeconomic context." },
    tags: [
      { pt: "Valores", en: "Values" },
      { pt: "Adolescentes", en: "Adolescents" },
      { pt: "Storytelling", en: "Storytelling" },
      { pt: "Moral", en: "Moral" },
      { pt: "Cidadania Ativa", en: "Active Citizenship" },
    ],
    impactArea: { pt: "Educação para Valores", en: "Values Education" },
    resultType: "positive",
    references: [
      "Almeida, A. M. T., Fonseca, J. & Rocha, E. (2025). Discursos de Adolescentes: O método Ubuntu de educação para valores. Ubuntu: Revista de Ciências Sociais e Humanas, 3, 57–99.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "Kohlberg, L. (1984). The Psychology of Moral Development. Harper & Row.",
      "Lickona, T. (1991). Educating for Character: How Our Schools Can Teach Respect and Responsibility. Bantam Books.",
      "Bruner, J. (1990). Acts of Meaning. Harvard University Press.",
    ],
  },
  {
    id: 304,
    issue: 3,
    year: 2025,
    title: {
      pt: "Implementação do Programa Ubuntu no Ensino Superior",
      en: "Ubuntu Program Implementation in Higher Education",
    },
    subtitle: {
      pt: "Desafios e resultados no Instituto Politécnico de Viana do Castelo",
      en: "Challenges and results at the Polytechnic Institute of Viana do Castelo",
    },
    authors: ["Ana Sofia Rodrigues", "Márcia Mariz Carvalho", "Carla Faria", "Ana Teresa Oliveira", "Linda Saraiva"],
    language: "pt",
    affiliations: ["Instituto Politécnico de Viana do Castelo"],
    abstract: {
      pt: "Estudo de métodos mistos que detalha a implementação e avaliação do Programa Ubuntu no Instituto Politécnico de Viana do Castelo (IPVC) entre 2022 e 2025. Analisa o impacto nas competências socioemocionais de 60 estudantes nas 'Ubuntu Weeks' e 179 nas 'ALU Days', utilizando questionários e observação para avaliar os cinco pilares Ubuntu.",
      en: "Mixed-methods study detailing the implementation and evaluation of the Ubuntu Program at the Polytechnic Institute of Viana do Castelo (IPVC) between 2022 and 2025. Analyzes the impact on social-emotional competencies of 60 students in 'Ubuntu Weeks' and 179 in 'ALU Days', using questionnaires and observation to assess the five Ubuntu pillars.",
    },
    objectives: [
      { pt: "Avaliar o impacto do programa Ubuntu em estudantes do ensino superior", en: "Evaluate the impact of the Ubuntu program on higher education students" },
      { pt: "Analisar o crescimento nas cinco competências socioemocionais (pilares Ubuntu)", en: "Analyze growth in the five social-emotional competencies (Ubuntu pillars)" },
      { pt: "Comparar resultados quantitativos e qualitativos", en: "Compare quantitative and qualitative results" },
    ],
    methodology: { pt: "Métodos mistos (questionários + observação)", en: "Mixed methods (questionnaires + observation)" },
    methodologyDetail: {
      pt: "Métodos mistos combinando questionários pré/pós-teste (avaliação quantitativa dos cinco pilares Ubuntu) com observação e dados qualitativos (feedback dos participantes, reflexões escritas). Implementação em dois formatos: Ubuntu Weeks (5 dias intensivos) e ALU Days (formato flexível).",
      en: "Mixed methods combining pre/post-test questionnaires (quantitative assessment of the five Ubuntu pillars) with observation and qualitative data (participant feedback, written reflections). Implementation in two formats: Ubuntu Weeks (5 intensive days) and ALU Days (flexible format).",
    },
    sampleType: { pt: "60 estudantes (Ubuntu Weeks) + 179 (ALU Days)", en: "60 students (Ubuntu Weeks) + 179 (ALU Days)" },
    sampleDetail: {
      pt: "60 estudantes nas Ubuntu Weeks e 179 estudantes nas ALU Days do Instituto Politécnico de Viana do Castelo, entre 2022 e 2025.",
      en: "60 students in Ubuntu Weeks and 179 students in ALU Days at the Polytechnic Institute of Viana do Castelo, between 2022 and 2025.",
    },
    instruments: [
      { pt: "Questionários pré/pós-teste (cinco pilares Ubuntu)", en: "Pre/post-test questionnaires (five Ubuntu pillars)" },
      { pt: "Observação participante", en: "Participant observation" },
      { pt: "Questionários de satisfação", en: "Satisfaction questionnaires" },
      { pt: "Reflexões escritas dos participantes", en: "Written participant reflections" },
    ],
    pages: "100–127",
    keyFindings: [
      { pt: "Crescimento significativo das competências socioemocionais, com destaque para autoconfiança e autoconhecimento.", en: "Significant growth in social-emotional competencies, particularly self-confidence and self-knowledge." },
      { pt: "A empatia registou a menor evolução relativa, sugerindo necessidade de reforço pedagógico.", en: "Empathy showed the smallest relative growth, suggesting need for pedagogical reinforcement." },
      { pt: "Feedback positivo e elevada satisfação dos participantes confirmados por dados qualitativos.", en: "Positive feedback and high participant satisfaction confirmed by qualitative data." },
      { pt: "Discrepância entre medidas quantitativas e qualitativas da empatia sugere internalização gradual.", en: "Discrepancy between quantitative and qualitative empathy measures suggests gradual internalization." },
    ],
    conclusion: {
      pt: "O programa Ubuntu no ensino superior produz ganhos significativos em competências socioemocionais, especialmente autoconfiança e autoconhecimento, mas a empatia requer estratégias pedagógicas reforçadas para uma internalização completa.",
      en: "The Ubuntu program in higher education produces significant gains in social-emotional competencies, especially self-confidence and self-knowledge, but empathy requires reinforced pedagogical strategies for complete internalization.",
    },
    mainResults: {
      pt: "Crescimento significativo em autoconfiança e autoconhecimento. A empatia registou menor evolução relativa. Feedback positivo e elevada satisfação confirmados qualitativamente. Discrepância entre medidas quantitativas e qualitativas da empatia sugere internalização gradual.",
      en: "Significant growth in self-confidence and self-knowledge. Empathy showed smaller relative growth. Positive feedback and high satisfaction confirmed qualitatively. Discrepancy between quantitative and qualitative empathy measures suggests gradual internalization.",
    },
    limitations: { pt: "Discrepância entre dados quantitativos e qualitativos na empatia requer análise mais aprofundada. Ausência de grupo de controlo em alguns ciclos.", en: "Discrepancy between quantitative and qualitative empathy data requires deeper analysis. Absence of control group in some cycles." },
    recommendations: { pt: "Reforçar estratégias pedagógicas para a empatia. Desenvolver instrumentos mais sensíveis para captar a internalização gradual de competências.", en: "Reinforce pedagogical strategies for empathy. Develop more sensitive instruments to capture gradual competency internalization." },
    tags: [
      { pt: "Ensino Superior", en: "Higher Education" },
      { pt: "IPVC", en: "IPVC" },
      { pt: "Métodos Mistos", en: "Mixed Methods" },
      { pt: "Empatia", en: "Empathy" },
      { pt: "Autoconfiança", en: "Self-Confidence" },
    ],
    impactArea: { pt: "Ensino Superior", en: "Higher Education" },
    resultType: "positive",
    references: [
      "Rodrigues, A. S., Carvalho, M. M., Faria, C., Oliveira, A. T. & Saraiva, L. (2025). Implementação do Programa Ubuntu no Ensino Superior. Ubuntu: Revista de Ciências Sociais e Humanas, 3, 100–127.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "Creswell, J. W. & Plano Clark, V. L. (2018). Designing and Conducting Mixed Methods Research. 3rd ed. Sage Publications.",
      "OECD (2021). Beyond Academic Learning: First Results from the Survey of Social and Emotional Skills. OECD Publishing.",
    ],
  },
  {
    id: 305,
    issue: 3,
    year: 2025,
    title: {
      pt: "Promoção de Competências Pessoais e Sociais",
      en: "Promoting Personal and Social Competencies",
    },
    subtitle: {
      pt: "Em alunos com Perturbação do Espetro do Autismo e Perturbação do Desenvolvimento Intelectual",
      en: "In students with Autism Spectrum Disorder and Intellectual Development Disorder",
    },
    authors: ["Sílvia Ferreira"],
    language: "pt",
    affiliations: ["Investigadora, Educação Especial, Lisboa"],
    abstract: {
      pt: "Projeto de investigação-ação que analisa a adaptação do método Ubuntu para alunos com Perturbação do Espetro do Autismo (PEA) e Perturbação do Desenvolvimento Intelectual (PDI). Desenvolvido numa unidade de apoio especializado em Lisboa com 6 alunos, recolhe dados através de múltiplos métodos incluindo observação, entrevistas e testes sociométricos, avaliando o progresso em competências pessoais e sociais.",
      en: "Action research project analyzing the adaptation of the Ubuntu method for students with Autism Spectrum Disorder (ASD) and Intellectual Development Disorder (IDD). Developed in a specialized support unit in Lisbon with 6 students, it collects data through multiple methods including observation, interviews and sociometric tests, evaluating progress in personal and social competencies.",
    },
    objectives: [
      { pt: "Adaptar o método Ubuntu para alunos com PEA e PDI", en: "Adapt the Ubuntu method for students with ASD and IDD" },
      { pt: "Avaliar o progresso em competências pessoais e sociais", en: "Evaluate progress in personal and social competencies" },
      { pt: "Identificar atividades mais eficazes para esta população", en: "Identify the most effective activities for this population" },
    ],
    methodology: { pt: "Investigação-ação", en: "Action research" },
    methodologyDetail: {
      pt: "Investigação-ação com ciclos iterativos de planificação, ação, observação e reflexão. Recolha de dados multi-método: observação participante, entrevistas a educadores e famílias, testes sociométricos e análise das produções dos alunos.",
      en: "Action research with iterative cycles of planning, action, observation and reflection. Multi-method data collection: participant observation, interviews with educators and families, sociometric tests and analysis of student productions.",
    },
    sampleType: { pt: "6 alunos com PEA/PDI numa unidade de apoio especializado", en: "6 students with ASD/IDD in a specialized support unit" },
    sampleDetail: {
      pt: "6 alunos com Perturbação do Espetro do Autismo (PEA) e Perturbação do Desenvolvimento Intelectual (PDI) numa unidade de apoio especializado em Lisboa.",
      en: "6 students with Autism Spectrum Disorder (ASD) and Intellectual Development Disorder (IDD) in a specialized support unit in Lisbon.",
    },
    instruments: [
      { pt: "Observação participante", en: "Participant observation" },
      { pt: "Entrevistas a educadores e famílias", en: "Interviews with educators and families" },
      { pt: "Testes sociométricos", en: "Sociometric tests" },
      { pt: "Análise de produções dos alunos", en: "Analysis of student productions" },
      { pt: "Grelhas de avaliação de competências", en: "Competency assessment grids" },
    ],
    pages: "128–180",
    keyFindings: [
      { pt: "Progresso geral positivo em competências pessoais (autoconhecimento, confiança, resiliência) e sociais (comunicação, empatia).", en: "Overall positive progress in personal competencies (self-knowledge, confidence, resilience) and social competencies (communication, empathy)." },
      { pt: "Resultados ficaram aquém do esperado, mas atividades adaptadas foram consideradas pertinentes e benéficas.", en: "Results fell short of expectations, but adapted activities were considered relevant and beneficial." },
      { pt: "Promoção de competências transversais: trabalho em equipa, flexibilidade, criatividade e motivação.", en: "Promotion of transversal competencies: teamwork, flexibility, creativity and motivation." },
      { pt: "Algumas áreas de competência associadas aos diagnósticos de PEA/PDI permaneceram desafiadoras.", en: "Some competency areas associated with ASD/IDD diagnoses remained challenging." },
    ],
    conclusion: {
      pt: "O método Ubuntu pode ser adaptado para alunos com PEA e PDI, promovendo competências pessoais e sociais relevantes, embora os resultados sejam mais modestos e certas áreas permaneçam desafiadoras dadas as características dos diagnósticos.",
      en: "The Ubuntu method can be adapted for students with ASD and IDD, promoting relevant personal and social competencies, although results are more modest and certain areas remain challenging given the diagnostic characteristics.",
    },
    mainResults: {
      pt: "Progresso geral positivo em competências pessoais (autoconhecimento, confiança, resiliência) e sociais (comunicação, empatia), embora aquém do esperado. Atividades adaptadas consideradas pertinentes e benéficas. Promoção de trabalho em equipa, flexibilidade, criatividade e motivação. Algumas áreas permanecem desafiadoras dadas as características dos diagnósticos.",
      en: "Overall positive progress in personal competencies (self-knowledge, confidence, resilience) and social competencies (communication, empathy), although below expectations. Adapted activities considered relevant and beneficial. Promotion of teamwork, flexibility, creativity and motivation. Some areas remain challenging given diagnostic characteristics.",
    },
    limitations: { pt: "Amostra muito reduzida (6 alunos). Resultados aquém do esperado em algumas áreas. Dificuldade em isolar os efeitos da intervenção de outros fatores do contexto educativo.", en: "Very small sample (6 students). Results below expectations in some areas. Difficulty isolating intervention effects from other educational context factors." },
    recommendations: { pt: "Continuar a adaptar materiais para necessidades específicas de PEA/PDI. Envolver mais ativamente terapeutas e famílias. Realizar ciclos de intervenção mais prolongados.", en: "Continue adapting materials for specific ASD/IDD needs. More actively involve therapists and families. Conduct longer intervention cycles." },
    tags: [
      { pt: "Educação Especial", en: "Special Education" },
      { pt: "PEA", en: "ASD" },
      { pt: "PDI", en: "IDD" },
      { pt: "Inclusão", en: "Inclusion" },
      { pt: "Adaptação", en: "Adaptation" },
    ],
    impactArea: { pt: "Educação Especial", en: "Special Education" },
    resultType: "exploratory",
    references: [
      "Ferreira, S. (2025). Promoção de Competências Pessoais e Sociais em alunos com PEA e PDI. Ubuntu: Revista de Ciências Sociais e Humanas, 3, 128–180.",
      "Gonçalves, J. L. & Alarcão, M. (2020). Pilares do Método Ubuntu. IPAV.",
      "American Psychiatric Association (2013). Diagnostic and Statistical Manual of Mental Disorders. 5th ed. APA.",
      "Coutinho, C. P. (2014). Metodologia de Investigação em Ciências Sociais e Humanas: Teoria e Prática. 2.ª ed. Almedina.",
      "Kemmis, S. & McTaggart, R. (2005). Participatory Action Research. In N. K. Denzin & Y. S. Lincoln (Eds.), The Sage Handbook of Qualitative Research. 3rd ed. Sage.",
    ],
  },
];

export const issuesMeta = [
  { issue: 1, year: 2023, totalArticles: 9, pages: 318, issn: "978-989-35104-0-7" },
  { issue: 2, year: 2024, totalArticles: 9, pages: 258, issn: "2975-9072" },
  { issue: 3, year: 2025, totalArticles: 5, pages: 204, issn: "2975-9072" },
];
