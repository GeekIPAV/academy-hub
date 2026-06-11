import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  recipientName?: string | null;
  entityName?: string;
  programTitles?: string[];
}

const Email = ({ recipientName, entityName, programTitles = [] }: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Inscrição em programa recebida — aguarda validação</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Inscrição recebida</Heading>
        <Text style={p}>
          Olá{recipientName ? ` ${recipientName}` : ""},
        </Text>
        <Text style={p}>
          Recebemos o pedido de inscrição da organização{" "}
          <strong>{entityName || "—"}</strong> nos seguintes programas:
        </Text>
        <Section style={box}>
          {programTitles.map((t, i) => (
            <Text key={i} style={item}>• {t}</Text>
          ))}
        </Section>
        <Text style={p}>
          A inscrição encontra-se <strong>pendente de validação</strong> pela
          nossa equipa. Receberás uma confirmação assim que for aprovada.
        </Text>
        <Text style={pMuted}>Equipa IPAV · Academia Ubuntu</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Inscrição em programa recebida — pendente de validação",
  displayName: "Inscrição em programa (pendente)",
  previewData: {
    recipientName: "Maria",
    entityName: "Escola Exemplo",
    programTitles: ["Programa Ubuntu", "Líderes Comunitários"],
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px", maxWidth: "560px" };
const h1 = { fontSize: "22px", margin: "0 0 12px" };
const p = { fontSize: "15px", lineHeight: "1.55", margin: "0 0 12px", color: "#111" };
const pMuted = { fontSize: "13px", color: "#666", marginTop: "24px" };
const box = {
  background: "#f6f7f9",
  borderRadius: "8px",
  padding: "12px 16px",
  margin: "12px 0",
};
const item = { fontSize: "14px", margin: "4px 0", color: "#111" };
