import * as React from 'react'

import { Text } from '@react-email/components'
import { AuthLayout, texto } from './auth-layout'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ oldEmail, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <AuthLayout
    previsao="Confirma a mudança do teu email"
    titulo="Confirma o novo email"
    botaoTexto="Confirmar a mudança"
    botaoUrl={confirmationUrl}
    notaFinal="Se não pediste esta mudança, protege a tua conta: muda a palavra-passe e contacta a equipa IPAV."
  >
    <Text style={texto}>
      Pediste para mudar o email da tua conta de <strong>{oldEmail || email}</strong> para <strong>{newEmail}</strong>.
    </Text>
    <Text style={texto}>Carrega no botão abaixo para confirmar.</Text>
  </AuthLayout>
)

export default EmailChangeEmail
