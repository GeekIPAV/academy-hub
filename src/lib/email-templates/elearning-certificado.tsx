import React from "react";
import { Body, Container, Head, Heading, Html, Link, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  recipientName?: string | null;
  cursoTitulo?: string;
  certUrl?: string;
  verifyUrl?: string;
}

const Email = ({ recipientName, cursoTitulo, certUrl, verifyUrl }: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>O teu certificado está disponível</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Parabéns — concluíste o curso!</Heading>
        <Text style={p}>Olá{recipientName ? ` ${recipientName}` : ""},</Text>
        <Text style={p}>
          Concluíste com aproveitamento o curso <strong>{cursoTitulo || "—"}</strong> na Escola Ubuntu Online.
          O teu certificado já está disponível:
        </Text>
        <Text style={p}>
          <Link href={certUrl} style={link}>Descarregar certificado (PDF)</Link>
        </Text>
        <Text style={pMuted}>
          Qualquer pessoa pode confirmar a validade em{" "}
          <Link href={verifyUrl} style={link}>{verifyUrl}</Link>
        </Text>
        <Text style={pMuted}>Equipa IPAV · Academia Ubuntu</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Certificado — ${d.cursoTitulo ?? "Escola Ubuntu Online"}`,
  displayName: "E-learning: certificado emitido",
  previewData: {
    recipientName: "Maria",
    cursoTitulo: "Formação de Formadores",
    certUrl: "https://app.ipav.pt/cert.pdf",
    verifyUrl: "https://app.ipav.pt/certificados/verificar/ALU-ABCDE-FGHIJ",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "560px" };
const h1 = { fontSize: "22px", color: "#193B69", margin: "0 0 16px" };
const p = { fontSize: "15px", color: "#222", lineHeight: "1.6", margin: "0 0 14px" };
const pMuted = { ...p, color: "#666", fontSize: "13px" };
const link = { color: "#FF8226", textDecoration: "underline" };
