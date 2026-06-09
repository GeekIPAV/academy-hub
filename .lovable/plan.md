## Adicionar login com Microsoft

Adicionar um botão "Continuar com Microsoft" no ecrã `/auth`, a par dos existentes Email/Password e Google, usando o fluxo OAuth gerido da Lovable Cloud.

### Passos

1. **Ativar o provider Microsoft na Lovable Cloud**
   - Chamar `supabase--configure_social_auth` com `providers: ["google", "microsoft"]` (mantém Google já configurado, adiciona Microsoft).
   - Isto regista o provider no backend para que `lovable.auth.signInWithOAuth("microsoft", ...)` funcione.

2. **`src/routes/auth.tsx` — adicionar handler e botão**
   - Novo `handleMicrosoft` análogo a `handleGoogle`, a chamar `lovable.auth.signInWithOAuth("microsoft", { redirect_uri: window.location.origin + target })`.
   - Adicionar um segundo `<Button variant="outline">` por baixo do botão Google, com o logótipo Microsoft (4 quadrados coloridos em SVG inline) e o texto "Continuar com Microsoft".
   - Ambos os botões partilham o mesmo separador "ou" e ficam empilhados (`space-y-2`).

### Notas

- Não toca em `src/integrations/lovable/index.ts` (já suporta `"microsoft"` no tipo).
- Não altera lógica de email/password, recuperação, nem o fluxo de `verifyAuthEmail`.
- Sem alterações de backend para além do `configure_social_auth`. As callbacks OAuth da Lovable tratam do resto.
- Caso `configure_social_auth` não aceite `microsoft` no workspace, paro e reporto antes de mudar o frontend.
