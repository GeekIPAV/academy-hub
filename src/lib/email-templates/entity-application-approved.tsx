import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  recipientName?: string | null;
  entityName?: string;
  programTitle?: string;
  inviteUrl?: string;
}

const Email = ({ recipientName, entityName, programTitle, inviteUrl }: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Inscrição aprovada — cria o acesso da tua organização</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Inscrição aprovada</Heading>
        <Text style={p}>Olá{recipientName ? ` ${recipientName}` : ""},</Text>
        <Text style={p}>
          A inscrição da organização <strong>{entityName || "—"}</strong> no programa{" "}
          <strong>{programTitle || "—"}</strong> foi aprovada pela nossa equipa.
        </Text>
        <Text style={p}>
          Para acederes à plataforma e gerires a participação da tua organização, cria
          a tua conta através deste link:
        </Text>
        <Text style={p}>
          <Link href={inviteUrl} style={link}>
            {inviteUrl}
          </Link>
        </Text>
        <Text style={pMuted}>Equipa IPAV · Academia Ubuntu</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Inscrição aprovada — Academia Ubuntu",
  displayName: "Inscrição de organização (aprovada)",
  previewData: {
    recipientName: "Maria",
    entityName: "Escola Exemplo",
    programTitle: "Formação de Formadores 25/26",
    inviteUrl: "https://app.ipav.pt/convite/abcd1234",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px", maxWidth: "560px" };
const h1 = { fontSize: "22px", margin: "0 0 12px" };
const p = { fontSize: "15px", lineHeight: "1.55", margin: "0 0 12px", color: "#111" };
const pMuted = { fontSize: "13px", color: "#666", marginTop: "24px" };
const link = { color: "#1d4ed8", wordBreak: "break-all" as const };
