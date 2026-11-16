import * as React from 'react'

import { Text } from '@react-email/components'
import { AuthLayout, texto } from './auth-layout'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <AuthLayout
    previsao="Foste convidado/a para a plataforma da Academia de Líderes Ubuntu"
    titulo="Foste convidado/a"
    botaoTexto="Aceitar o convite"
    botaoUrl={confirmationUrl}
    notaFinal="Se não esperavas este convite, podes ignorar este email."
  >
    <Text style={texto}>Recebeste um convite para entrar na plataforma da Academia de Líderes Ubuntu.</Text>
    <Text style={texto}>Carrega no botão abaixo para aceitar o convite e criar a tua conta.</Text>
  </AuthLayout>
)

export default InviteEmail
