# Distinção determinística Programa vs. Ação no `notion-webhook`

## Objetivo
Substituir a heurística atual ("tem relação a programa = ação") por uma decisão determinística que suporte **ações sem programa** e que não confunda com a propriedade `Entity` (escola/entidade promotora).

## Ordem de resolução do tipo
A função decide o tipo da página recebida nesta ordem (primeira que resolve, ganha):

1. **Header `x-notion-tipo`** — `programa` ou `acao`. Override manual para testes/curl.
2. **`parent.database_id` do payload** — comparado contra dois secrets:
   - `NOTION_DB_PROGRAMS` → Programa
   - `NOTION_DB_ACTIONS` → Ação
3. **Propriedade `Tipo`** (select) na página — valores aceites: `Programa` / `Ação` (case-insensitive, sem acento também aceite).
4. Se nada resolver → erro **400** com mensagem clara e log em `sync_logs`.

A propriedade `Entity` deixa de ser usada para esta decisão (fica reservada ao seu significado real: escola/entidade promotora).

## Mudanças no código

**`supabase/functions/notion-webhook/index.ts`**
- Remover a heurística baseada em relação `Program/Programa/Parent Program`.
- Ler `Deno.env.get("NOTION_DB_PROGRAMS")` e `Deno.env.get("NOTION_DB_ACTIONS")`.
- Extrair `page.parent?.database_id` (normalizar removendo hífenes para comparação robusta).
- Adicionar leitura da propriedade `Tipo` (select) com normalização (`programa`/`acao`).
- Adicionar leitura do header `x-notion-tipo`.
- Manter a relação `Programa` apenas para resolver `program_id` quando a página é Ação — agora opcional: se não houver relação, `program_id = NULL` (ação standalone, sem erro).
- Atualizar `Access-Control-Allow-Headers` para incluir `x-notion-tipo`.

## Secrets a criar
- `NOTION_DB_PROGRAMS` — ID da database Notion de Programas
- `NOTION_DB_ACTIONS` — ID da database Notion de Ações

## Comportamento resultante
| Cenário | Resultado |
|---|---|
| Página da DB de Programas | Upsert em `programs` |
| Página da DB de Ações com relação a programa existente | Upsert em `training_actions` com `program_id` resolvido |
| Página da DB de Ações **sem** programa | Upsert em `training_actions` com `program_id = NULL` |
| Página da DB de Ações com relação a programa **inexistente** no Supabase | 400 com mensagem clara (sincronizar Programas primeiro) |
| Tipo indeterminável | 400 + log em `sync_logs` |

## Validação
1. Curl com `x-notion-tipo: programa` → cria/atualiza programa.
2. Curl com `x-notion-tipo: acao` sem relação → cria ação standalone.
3. Webhook real do Notion da DB de Programas → resolve por `database_id`.
4. Webhook real do Notion da DB de Ações → resolve por `database_id`, liga ao programa pai se a relação existir.

