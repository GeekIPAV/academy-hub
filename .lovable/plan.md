# Autenticação + Inscrição completa

## Objetivo
Permitir que uma pessoa se registe, faça login, e se inscreva numa Ação — com o formulário pré-preenchido a partir do perfil.

## 1. Base de dados (migração)

- **Trigger `on_auth_user_created`**: ao criar um utilizador em `auth.users`, insere automaticamente uma linha em `public.profiles` com `id = NEW.id` (e `full_name` a partir de `raw_user_meta_data` se existir). Função `SECURITY DEFINER` com `search_path = public`.
- **Política INSERT em `profiles`**: permitir o próprio utilizador criar o seu perfil (defesa em profundidade caso o trigger falhe).
- **Backfill**: criar perfis em falta para utilizadores `auth.users` já existentes.

## 2. Autenticação (frontend)

- **`src/routes/auth.tsx`** (rota pública): tabs "Entrar" / "Criar conta"
  - Email + password (signup com `emailRedirectTo: window.location.origin`)
  - Botão "Continuar com Google" via `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
  - Redirect para `?redirect=` após login
- **`src/routes/_authenticated.tsx`** (pathless layout): `beforeLoad` verifica sessão Supabase; se não autenticado, `redirect` para `/auth?redirect=...`. Renderiza `<Outlet />`.
- **Hook de sessão** (`src/hooks/use-auth.ts`): `onAuthStateChange` + `getSession` (listener antes do get). Expõe `user`, `loading`, `signOut`.
- **Botão Login/Sair na sidebar** (`AppSidebar.tsx`): mostra email + "Sair" se autenticado, ou link "Entrar" se não.

## 3. Proteger inscrição

- Mover `src/routes/actions.$id.tsx` → `src/routes/_authenticated/actions.$id.tsx` (utilizador tem de estar autenticado para se inscrever).
- Lista pública `/actions` mantém-se acessível sem login (apenas visualização).
- Atualizar `<Link to="/actions/$id">` se necessário.

## 4. Pré-preenchimento do formulário

- Criar `src/lib/profile.functions.ts` com `getMyProfile` (`createServerFn` + `requireSupabaseAuth`) que devolve o perfil do utilizador atual.
- Em `actions.$id.tsx`:
  - Carregar perfil em paralelo com a ação.
  - **Mapeamento nome do campo → coluna do perfil** (case-insensitive, com aliases PT/EN):
    - `nome`, `nome completo`, `full name` → `full_name`
    - `email` → `auth.user.email`
    - `nif` → `nif`
    - `telefone` (se existir no perfil futuramente)
    - `data nascimento`, `birth date` → `birth_date`
    - `morada`, `address` → `address`
    - `concelho` → `residence_concelho`
    - …etc para os campos existentes em `profiles`
  - Inicializar `values` com estes defaults; o utilizador pode editar.

## 5. Configuração de auth no Lovable Cloud

- `auto_confirm` continua **desativado** (utilizador verifica email antes de entrar) — exceto se pedires o contrário.
- Google sign-in usa as credenciais geridas pelo Lovable Cloud (sem setup adicional).

## Resumo do fluxo final
1. Utilizador navega para `/actions` → vê lista pública.
2. Clica numa ação → `/actions/{id}` → se não autenticado, é redirecionado para `/auth?redirect=/actions/{id}`.
3. Cria conta (email/password ou Google) → confirma email → faz login → volta para a ação.
4. Formulário aparece pré-preenchido com dados do perfil; ajusta o que precisar e submete.
5. `enrollInAction` cria a inscrição com `status = aceite` (ou `suplente` se cheia) e gera notificação.

## Notas técnicas
- Não tocar em `src/integrations/supabase/client.ts` nem em `types.ts`.
- Usar `lovable.auth.signInWithOAuth` (NÃO `supabase.auth.signInWithOAuth`).
- `_authenticated` layout usa `beforeLoad` (evita flash de conteúdo protegido).
- Trigger não usa foreign key para `auth.users` na criação de profiles (já tens `id uuid` como PK e o trigger preenche).
