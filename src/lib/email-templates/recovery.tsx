import * as React from 'react'

import { Text } from '@react-email/components'
import { AuthLayout, texto } from './auth-layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <AuthLayout
    previsao="Repor a palavra-passe da tua conta"
    titulo="Repor a palavra-passe"
    botaoTexto="Escolher nova palavra-passe"
    botaoUrl={confirmationUrl}
    notaFinal="Se não pediste para repor a palavra-passe, podes ignorar este email. A tua palavra-passe não muda."
  >
    <Text style={texto}>Recebemos um pedido para repor a palavra-passe da tua conta na plataforma da Academia de Líderes Ubuntu.</Text>
    <Text style={texto}>Carrega no botão abaixo para escolheres uma nova palavra-passe.</Text>
  </AuthLayout>
)

export default RecoveryEmail
