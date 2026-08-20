# Gestão de inscrições de organizações (Equipa IPAV)

Sistema em 4 partes: modelo de dados unificado, link público por programa, aprovação pela equipa, e nova área "Equipa" na sidebar.

Estado atual verificado na base de dados: `entidades_programas` tem 2 registos, `inscricoes_entidade_programa` tem 2, `inscritos_programa` tem 1 (status `pendente`). A role **Equipa IPAV** já existe.

## Etapa 1 — Base de dados (migração)

- `entidades_programas`: nova coluna `status` (`pendente` | `aprovada`), default `aprovada` para as linhas existentes (já ativas), e `created_by`/`updated_at` conforme necessário.
- `programas`: nova coluna `public_enroll_token` (única) — o token do link público de inscrição de organizações, gerado por programa.
- `inscritos_programa.status`: passa a aceitar também `desistiu` (além de `aprovada`, `lista_espera`, `concluido`).
- Migrar as 2 linhas de `inscricoes_entidade_programa` para `entidades_programas` (uma linha por entidade+programa, preservando o `status`), sem duplicar as que já existem. A tabela antiga fica sem uso e é removida no fim da etapa 4, depois de o código deixar de a referenciar.
- Políticas de acesso: leitura/escrita de `entidades_programas` e `entidades` pendentes para Admin e Equipa IPAV; o fluxo público não escreve diretamente — passa por funções de servidor com privilégios controlados e validação do token.

Confirmação pedida antes de aplicar esta migração.

## Etapa 2 — Link público `/inscricao-entidade/$token`

Rota pública (sem sessão). Fluxo:

1. Pesquisa do nome da organização com fuzzy match (mesma função `fuzzyMatch` do `EntityOnboardingFlow`), contra as entidades existentes.
2. Se escolhe uma existente:
   - Se essa entidade teve inscrição ativa num programa do **ano letivo anterior** (mesma lógica de `currentAcademicYear()`, ano −1) → bloqueia com a mensagem "A vossa organização já está registada — façam a inscrição a partir do vosso dashboard." e link para `/auth`.
   - Caso contrário (existente mas adormecida) → segue para o passo 4, reutilizando a entidade.
3. Se não encontra → formulário de nova organização (nome, morada, código postal, localidade + contacto: nome, email, telefone), reaproveitando os campos do `EntityOnboardingFlow`.
4. Submissão: cria/reutiliza a entidade com `status = 'pendente'` e cria `entidades_programas` com `status = 'pendente'`. **Nenhuma conta de utilizador é criada.** Ecrã final: "Pedido enviado. A equipa da Academia Ubuntu vai rever e entrar em contacto."

## Etapa 3 — Aprovação

Ação "Aprovar" (e "Rejeitar") na lista de organizações pendentes:

- `entidades.status → aprovada`
- `entidades_programas.status → aprovada` e garante `invite_token` gerado (link de participantes)
- Cria convite (`convites`) com role `Entidade` + `entity_id` desta organização e envia email ao contacto, através do mecanismo de convites/emails já existente. Só aqui a organização ganha acesso.
- Rejeitar: marca a inscrição como rejeitada e não cria convite.

## Etapa 4 — Secção "Equipa" na sidebar

Nova rota `/equipa/programas` (grupo "Equipa" no `nav-config`), acessível a Equipa IPAV e Admin:

- Dropdown de programas (ativos por defeito, com opção de ver todos), reaproveitando o que já existe em `/admin/programas`.
- Topo: link público de inscrição de organizações do programa selecionado, com botão de copiar.
- **Organizações**: lista das inscritas no programa (badge Pendente/Aprovada) com ação Aprovar/Rejeitar nas pendentes. Clicar abre a vista da organização: participantes dela nesse programa (estado inscrito/aprovada, lista de espera, desistiu, concluído) e o link de inscrição de participantes (`invite_token`) com copiar.
- **Participantes**: todos os participantes do programa, com a organização como link para a vista da organização, e ação para alterar o estado (incluindo `desistiu`).
- Permissões: adicionar as novas rotas à matriz de rotas da Central de Comando e atribuir a Equipa IPAV.
- `/admin/programas` mantém-se para Admin; a lógica partilhada de organizações/participantes é extraída para componentes reutilizados por ambos.

## Notas técnicas

- Novo ficheiro `src/lib/equipa-programas.functions.ts` com as funções de servidor (públicas para o fluxo do token, autenticadas + verificação de role para as de gestão).
- `ClusterEnrollDialog` e `inscricao-entidade.functions.ts` passam a escrever/ler `entidades_programas` (com `status = 'pendente'`); a tabela antiga deixa de ser usada.
- `entidade.dashboard.tsx` lê os programas da entidade a partir de `entidades_programas` — ajustar para filtrar por `status = 'aprovada'` onde faz sentido.
- Rota pública nova não pode ficar sob `_authenticated` nem chamar funções com `requireSupabaseAuth`.
