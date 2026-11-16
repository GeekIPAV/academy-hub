import * as React from 'react'

import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'

/** Nome mostrado nos emails de autenticação. */
export const NOME_PLATAFORMA = 'Academia de Líderes Ubuntu'

const main = { backgroundColor: '#f2f2f2', fontFamily: "'Public Sans', Arial, sans-serif", padding: '24px 0' }
const container = { backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px 28px', maxWidth: '560px' }
const marca = { fontSize: '13px', fontWeight: 'bold' as const, color: '#193b69', margin: '0 0 20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#193b69', margin: '0 0 16px' }
export const texto = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const botao = {
  backgroundColor: '#ff8226',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 22px',
  textDecoration: 'none',
}
const nota = { fontSize: '13px', color: '#666666', lineHeight: '1.5', margin: '24px 0 0' }
export const codigo = {
  fontFamily: 'Courier, monospace',
  fontSize: '26px',
  fontWeight: 'bold' as const,
  letterSpacing: '4px',
  color: '#193b69',
  margin: '0 0 16px',
}

interface Props {
  previsao: string
  titulo: string
  children: React.ReactNode
  botaoTexto?: string
  botaoUrl?: string
  notaFinal?: string
}

/** Moldura comum dos emails de autenticação, em português de Portugal. */
export const AuthLayout = ({ previsao, titulo, children, botaoTexto, botaoUrl, notaFinal }: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>{previsao}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={marca}>{NOME_PLATAFORMA}</Text>
        <Heading style={h1}>{titulo}</Heading>
        {children}
        {botaoTexto && botaoUrl ? (
          <Section style={{ margin: '8px 0 0' }}>
            <Button style={botao} href={botaoUrl}>
              {botaoTexto}
            </Button>
          </Section>
        ) : null}
        {notaFinal ? <Text style={nota}>{notaFinal}</Text> : null}
        <Text style={nota}>Equipa IPAV · {NOME_PLATAFORMA}</Text>
      </Container>
    </Body>
  </Html>
)
