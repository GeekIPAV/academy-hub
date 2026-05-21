## Diagnóstico

O erro `Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY` vem de `src/integrations/supabase/client.ts`, que lê:

- `import.meta.env.VITE_SUPABASE_URL`
- `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`

Estas são substituídas pelo Vite **em build time** a partir do `.env`. O `.env` local existe e já contém:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
```

A backend (Lovable Cloud) está saudável. O que falta é apenas **forçar um novo build/publish** para que a versão publicada seja regenerada com as variáveis atualizadas (após a rotação das chaves feita recentemente, o build publicado ficou com o snapshot antigo).

## Passos

1. Atualizar o marcador `src/republish-trigger.ts` para a data atual, de modo a forçar o botão **Publish** a detectar uma alteração e gerar novo build.
2. Pedir-te para clicar em **Publish → Update** no canto superior direito (ou no menu `...` em mobile) para republicar.
3. Após o deploy, abrir a versão publicada e confirmar que o erro desapareceu. Se ainda persistir, recolher logs com `stack_modern--server-function-logs` no deployment `published` para confirmar que as VITE_ vars foram realmente substituídas no bundle.

## Ficheiros tocados

- `.gitignore` — removido o ignore explícito de `.env` para permitir que o snapshot gerido do Lovable Cloud entre no build.
- `src/republish-trigger.ts` — bump da data para forçar novo build/publish.

Nenhuma alteração ao `client.ts` nem aos valores do `.env`.
