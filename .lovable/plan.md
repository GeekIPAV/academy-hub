## Problema

Na sidebar, o grupo "Admin" tem `adminOnly: true` e é escondido por completo a quem não tem o role `Admin` (`AppSidebar.tsx:55`), independentemente do que esteja marcado na Central de Comando. Por isso o utilizador `equipa ipav`, mesmo com tudo selecionado na matriz, não vê as entradas /admin/*.

## Solução

Tratar o grupo Admin como qualquer outro grupo: cada item é mostrado se a matriz da Central de Comando autorizar a rota para algum dos roles ativos do utilizador (já existe `canAccess(path)` para isso). O grupo só desaparece se nenhum dos itens for visível.

## Alterações

1. `src/lib/nav-config.ts`
   - Remover `adminOnly: true` do grupo Admin.
   - Marcar cada item Admin com `gated: true` para passar pelo `canAccess()`.

2. `src/components/AppSidebar.tsx`
   - Remover a linha `if (group.adminOnly && !isAdmin) return null;` (deixa de ser necessária; já não há grupos adminOnly).
   - A lógica existente `items.filter(it => it.gated ? canAccess(it.path) : true)` mais o `if (items.length === 0) return null;` trata tudo: se o role não tiver nenhuma rota /admin/* permitida, o grupo desaparece naturalmente. Admin continua a ver tudo porque `canAccess` devolve `true` para admin.

## Notas

- O `RouteGate` nas páginas /admin/* já valida acesso pela matriz, portanto a segurança não muda — só estamos a tornar a sidebar coerente com o que a matriz já permite.
- Server-side as funções admin continuam protegidas pelo `assertAdmin` (ex: `permissions.functions.ts`, `roles.functions.ts`). Ou seja, embora o utilizador `equipa ipav` passe a ver e abrir as páginas /admin/* que a matriz autorizar, ações privilegiadas (criar/eliminar roles, alterar permissões, etc.) vão continuar a falhar com "Acesso restrito" se ele não for Admin. Avisa-me se quiseres que reveja também essa camada — por agora mantenho-a igual, já que só pediste para resolver a visibilidade.
