import * as React from 'react'

import { Text } from '@react-email/components'
import { AuthLayout, codigo, texto } from './auth-layout'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <AuthLayout
    previsao="O teu código de verificação"
    titulo="Código de verificação"
    notaFinal="O código é válido por pouco tempo. Se não o pediste, podes ignorar este email."
  >
    <Text style={texto}>Usa este código para confirmares a tua identidade:</Text>
    <Text style={codigo}>{token}</Text>
  </AuthLayout>
)

export default ReauthenticationEmail
