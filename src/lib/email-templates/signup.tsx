import * as React from 'react'

import { Text } from '@react-email/components'
import { AuthLayout, texto } from './auth-layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ recipient, confirmationUrl }: SignupEmailProps) => (
  <AuthLayout
    previsao="Confirma o teu email para entrares na plataforma"
    titulo="Confirma o teu email"
    botaoTexto="Confirmar email"
    botaoUrl={confirmationUrl}
    notaFinal="Se não criaste uma conta, podes ignorar este email."
  >
    <Text style={texto}>Obrigado por te registares na plataforma da Academia de Líderes Ubuntu.</Text>
    <Text style={texto}>
      Para ativares a tua conta, confirma que o endereço <strong>{recipient}</strong> é teu, carregando no botão abaixo.
    </Text>
  </AuthLayout>
)

export default SignupEmail
