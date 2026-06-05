// Catálogo dos templates de email editáveis na página /admin/emails.
// Fonte da verdade para o assunto/corpo por defeito e variáveis disponíveis.

export type EmailTemplateKind = "auth" | "app";

export interface EmailTemplateVariable {
  key: string;
  label: string;
  example: string;
}

export interface EmailTemplateCatalogEntry {
  key: string;
  kind: EmailTemplateKind;
  displayName: string;
  description: string;
  defaultSubject: string;
  defaultBodyHtml: string;
  variables: EmailTemplateVariable[];
}

const baseAuthVars: EmailTemplateVariable[] = [
  { key: "siteName", label: "Nome do site", example: "Academia de Líderes Ubuntu" },
  { key: "siteUrl", label: "URL do site", example: "https://app.ipav.pt" },
  { key: "confirmationUrl", label: "Link de confirmação", example: "https://app.ipav.pt/..." },
  { key: "recipient", label: "Email do destinatário", example: "joana@exemplo.pt" },
];

export const EMAIL_TEMPLATE_CATALOG: EmailTemplateCatalogEntry[] = [
  // ---------- AUTH ----------
  {
    key: "auth.signup",
    kind: "auth",
    displayName: "Confirmação de registo",
    description: "Enviado quando um utilizador se regista e precisa de confirmar o email.",
    defaultSubject: "Confirma o teu email — {{siteName}}",
    defaultBodyHtml:
      "<h2>Confirma o teu email</h2><p>Obrigado por te registares em <strong>{{siteName}}</strong>!</p><p>Confirma o teu email ({{recipient}}) clicando no botão abaixo:</p><p><a href=\"{{confirmationUrl}}\">Confirmar email</a></p><p>Se não criaste a conta, podes ignorar este email.</p>",
    variables: baseAuthVars,
  },
  {
    key: "auth.magiclink",
    kind: "auth",
    displayName: "Magic link de entrada",
    description: "Link único para entrar na plataforma sem password.",
    defaultSubject: "O teu link de entrada — {{siteName}}",
    defaultBodyHtml:
      "<h2>O teu link de entrada</h2><p>Clica no botão abaixo para entrar em {{siteName}}. Este link expira em breve.</p><p><a href=\"{{confirmationUrl}}\">Entrar</a></p>",
    variables: baseAuthVars,
  },
  {
    key: "auth.recovery",
    kind: "auth",
    displayName: "Recuperação de password",
    description: "Email enviado quando o utilizador pede para repor a password.",
    defaultSubject: "Repor a tua password — {{siteName}}",
    defaultBodyHtml:
      "<h2>Repor a tua password</h2><p>Recebemos um pedido para repor a tua password em {{siteName}}.</p><p><a href=\"{{confirmationUrl}}\">Definir nova password</a></p><p>Se não fizeste este pedido, podes ignorar este email.</p>",
    variables: baseAuthVars,
  },
  {
    key: "auth.invite",
    kind: "auth",
    displayName: "Convite para a plataforma",
    description: "Convite para um utilizador se juntar à plataforma.",
    defaultSubject: "Foste convidado para {{siteName}}",
    defaultBodyHtml:
      "<h2>Foste convidado</h2><p>Foste convidado para te juntares a <strong>{{siteName}}</strong>.</p><p><a href=\"{{confirmationUrl}}\">Aceitar convite</a></p>",
    variables: baseAuthVars,
  },
  {
    key: "auth.email_change",
    kind: "auth",
    displayName: "Mudança de email",
    description: "Confirmação enviada quando o utilizador altera o endereço de email.",
    defaultSubject: "Confirma o teu novo email — {{siteName}}",
    defaultBodyHtml:
      "<h2>Confirma a mudança de email</h2><p>Pediste para mudar o teu email em {{siteName}} de <strong>{{oldEmail}}</strong> para <strong>{{newEmail}}</strong>.</p><p><a href=\"{{confirmationUrl}}\">Confirmar mudança</a></p>",
    variables: [
      ...baseAuthVars,
      { key: "oldEmail", label: "Email anterior", example: "antigo@exemplo.pt" },
      { key: "newEmail", label: "Email novo", example: "novo@exemplo.pt" },
    ],
  },
  {
    key: "auth.reauthentication",
    kind: "auth",
    displayName: "Código de reautenticação",
    description: "Código curto usado para confirmar uma ação sensível.",
    defaultSubject: "O teu código de verificação",
    defaultBodyHtml:
      "<h2>Confirma a tua identidade</h2><p>Usa o código abaixo para confirmar a tua identidade:</p><p style=\"font-size:22px;font-weight:bold;\">{{token}}</p><p>Este código expira em breve.</p>",
    variables: [
      { key: "token", label: "Código", example: "123456" },
    ],
  },

  // ---------- APP ----------
  {
    key: "app.inscricao-confirmada",
    kind: "app",
    displayName: "Inscrição confirmada",
    description: "Enviado quando um participante é confirmado numa ação.",
    defaultSubject: "Inscrição confirmada — {{acaoTitulo}}",
    defaultBodyHtml:
      "<h2>Olá {{nome}},</h2><p>A tua inscrição na ação <strong>{{acaoTitulo}}</strong> foi confirmada.</p><p><strong>Data:</strong> {{acaoData}}</p><p>Podes consultar os detalhes no teu dashboard.</p>",
    variables: [
      { key: "nome", label: "Nome do participante", example: "Joana" },
      { key: "acaoTitulo", label: "Título da ação", example: "Encontro Nacional Ubuntu" },
      { key: "acaoData", label: "Data da ação", example: "12 de junho de 2026" },
    ],
  },
  {
    key: "app.inscricao-suplente",
    kind: "app",
    displayName: "Inscrição como suplente",
    description: "Enviado quando a vaga principal está cheia e o participante fica em lista de espera.",
    defaultSubject: "Estás em lista de espera — {{acaoTitulo}}",
    defaultBodyHtml:
      "<h2>Olá {{nome}},</h2><p>A ação <strong>{{acaoTitulo}}</strong> já está com lotação cheia.</p><p>Ficaste em lista de espera (posição {{posicao}}). Iremos avisar-te se uma vaga ficar disponível.</p>",
    variables: [
      { key: "nome", label: "Nome do participante", example: "Joana" },
      { key: "acaoTitulo", label: "Título da ação", example: "Encontro Nacional Ubuntu" },
      { key: "posicao", label: "Posição em lista de espera", example: "3" },
    ],
  },
  {
    key: "app.certificado-emitido",
    kind: "app",
    displayName: "Certificado emitido",
    description: "Enviado quando um certificado fica disponível para o participante.",
    defaultSubject: "O teu certificado está pronto",
    defaultBodyHtml:
      "<h2>Parabéns {{nome}}!</h2><p>O teu certificado para a ação <strong>{{acaoTitulo}}</strong> já está disponível.</p><p><a href=\"{{certificadoUrl}}\">Descarregar certificado</a></p>",
    variables: [
      { key: "nome", label: "Nome do participante", example: "Joana" },
      { key: "acaoTitulo", label: "Título da ação", example: "Encontro Nacional Ubuntu" },
      { key: "certificadoUrl", label: "URL do certificado", example: "https://app.ipav.pt/certificado/..." },
    ],
  },
  {
    key: "app.convite-entidade",
    kind: "app",
    displayName: "Convite para entidade",
    description: "Convite para um utilizador se juntar a uma entidade parceira.",
    defaultSubject: "Foste convidado para {{entidadeNome}}",
    defaultBodyHtml:
      "<h2>Olá {{nome}},</h2><p>Foste convidado para fazer parte da entidade <strong>{{entidadeNome}}</strong> em {{siteName}}.</p><p><a href=\"{{conviteUrl}}\">Aceitar convite</a></p>",
    variables: [
      { key: "nome", label: "Nome do convidado", example: "Joana" },
      { key: "entidadeNome", label: "Nome da entidade", example: "Escola Secundária X" },
      { key: "conviteUrl", label: "Link do convite", example: "https://app.ipav.pt/convite/abc" },
      { key: "siteName", label: "Nome do site", example: "Academia de Líderes Ubuntu" },
    ],
  },
];

export function getCatalogEntry(key: string): EmailTemplateCatalogEntry | undefined {
  return EMAIL_TEMPLATE_CATALOG.find((e) => e.key === key);
}
