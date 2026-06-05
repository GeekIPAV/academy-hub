## Problema

1. Na sidebar, só 3 itens têm `gated: true` em `src/lib/nav-config.ts` — o resto (`/elearning`, `/recursos`, `/publicacoes/*`, `/faqs`, `/comunicacao/*`) ignora a matriz e mostra-se sempre.
2. As próprias páginas não bloqueiam acesso direto por URL com base na matriz de rotas.

## Alteração 1 — Sidebar

Em `src/lib/nav-config.ts`, marcar `gated: true` em todos os itens não-admin:

- `/elearning`, `/recursos`
- `/publicacoes/revistas`, `/publicacoes/ipav`, `/publicacoes/biblioteca`
- `/faqs`
- `/comunicacao/press-media-kit`, `/comunicacao/propriedade-intelectual`

O grupo "Admin" mantém `adminOnly: true`.

## Alteração 2 — Bloqueio de rota

Criar `src/components/RouteGate.tsx`:

- Recebe `path: string` e `children`.
- Usa `useApp()` para ler `canAccess` e `isAdmin`.
- Se `canAccess(path)` for falso, renderiza o cartão "Acesso restrito" (mesmo padrão visual usado em `entidade.dashboard.tsx`: `Card` + `ShieldAlert` + texto).
- Caso contrário, renderiza `children`.
- Admin vê sempre (já coberto pelo `canAccess`).

Aplicar `<RouteGate path="/...">` como wrapper do conteúdo nos route files das páginas gated:

- `src/routes/elearning.tsx`
- `src/routes/recursos.tsx`
- `src/routes/publicacoes.revistas.tsx`
- `src/routes/publicacoes.ipav.tsx`
- `src/routes/publicacoes.biblioteca.tsx`
- `src/routes/faqs.tsx`
- `src/routes/comunicacao.press-media-kit.tsx`
- `src/routes/comunicacao.propriedade-intelectual.tsx`
- `src/routes/dashboard.tsx` e `src/routes/actions.tsx` (já gated na sidebar mas sem guard de rota — bom alinhar)

(Confirmo nomes exatos dos ficheiros no momento de editar.)

## Resultado

- Itens desligados na Central de Comando deixam de aparecer na sidebar para os roles afetados.
- Acesso por URL direto a essas rotas devolve "Acesso restrito" em vez do conteúdo.
- Admin continua a ver tudo.
- Sem alteração de business logic nem da matriz de permissões.
