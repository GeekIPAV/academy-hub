import * as React from 'react'

import { Text } from '@react-email/components'
import { AuthLayout, texto } from './auth-layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <AuthLayout
    previsao="O teu link para entrar na plataforma"
    titulo="Entrar na plataforma"
    botaoTexto="Entrar"
    botaoUrl={confirmationUrl}
    notaFinal="O link é válido por pouco tempo. Se não pediste para entrar, podes ignorar este email."
  >
    <Text style={texto}>Carrega no botão abaixo para entrares na plataforma da Academia de Líderes Ubuntu.</Text>
  </AuthLayout>
)

export default MagicLinkEmail
