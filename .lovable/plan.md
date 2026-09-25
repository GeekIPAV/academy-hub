# E-learning "Escola Ubuntu Online" — Fase 1

## Objetivo
Catálogo de cursos (Curso → Módulos → Passos) em `/elearning`, gestão em `/admin/elearning`, com badges e certificados automáticos, reaproveitando clusters, temas, recursos, badges e o gerador de certificados.

## Modelo de dados (uma migração, RLS + GRANT em todas)

| Tabela | Campos principais |
|---|---|
| `cursos` | title, description, cover_url/position/scale, cluster_id?, program_id?, modalidade (autonomo/turma), estado (rascunho/publicado/arquivado), horas, tem_certificado, acreditacao_ref, badge_entrada_id?, badge_final_id?, badge_renovado_id?, nota_minima_quiz (%), pct_minima_video (%), tipo (formacao_formadores/microcurso/semana_ubuntu/renovacao), created_by |
| `cursos_modulos` | curso_id, title, description, sort_order, tema_id?, abertura_dias? |
| `cursos_passos` | modulo_id, title, sort_order, tipo (video/texto/recurso/quiz/reflexao), obrigatorio, duracao_min, conteudo jsonb (vimeo_id, html, recurso_id, reflexao_partilhavel…) |
| `cursos_quiz_perguntas` | passo_id, sort_order, enunciado, tipo (unica/multipla), opcoes jsonb [{id,texto,correta,feedback}] |
| `cursos_turmas` | curso_id, nome, data_inicio, data_fim, vagas, formador_id, inscricoes_abertas |
| `cursos_inscricoes` | user_id, curso_id, turma_id?, estado (inscrito/em_curso/concluido/cancelado), inscrito_em, iniciado_em, concluido_em; único (user, curso, turma) |
| `cursos_progresso` | inscricao_id, passo_id, estado (nao_iniciado/em_curso/concluido), video_pct, video_posicao_s, nota, tentativas, resposta jsonb, partilhada, iniciado_em, concluido_em; único (inscricao, passo) |
| `cursos_atividade` | user_id, inscricao_id, passo_id?, evento (inicio_passo, fim_passo, submissao_quiz, submissao_reflexao, conclusao_curso…), payload jsonb, created_at (default `now()` do servidor) — só insert |
| `certificados_elearning` | inscricao_id (único), user_id, curso_id, codigo (único, aleatório), horas, modalidade, data_inicio/fim, storage_path, emitido_em, revogado |

As respostas corretas do quiz nunca são enviadas ao formando: a leitura e a correção passam pelo servidor.

**Acesso**
- Leitura de cursos/módulos/passos: utilizadores autenticados, apenas cursos publicados. Admin e Equipa IPAV leem tudo.
- Inscrições, progresso e atividade: cada formando só lê os seus. Toda a escrita é feita por funções do servidor (com permissões de administrador), depois de validar a sessão.
- Certificados: o dono lê o seu. A verificação pública usa uma função do servidor que devolve só nome, curso, data, horas e se é válido.
- Preparado para depois (sem implementar): `turma_id` e `partilhada` servem para fórum/reflexões partilhadas; `cursos_atividade` serve para assiduidade; o `tipo` do passo pode ganhar `tarefa`/`sessao`.

## Rotas
- `/elearning`: catálogo (Os meus cursos + disponíveis, filtros por cluster e modalidade, turmas abertas).
- `/elearning/$cursoId`: página do curso (inscrição, badge e certificado que se obtêm, módulos com estado).
- `/elearning/$cursoId/passo/$passoId`: leitor com índice lateral (gaveta em mobile), anterior/seguinte, marcar como concluído.
- `/admin/elearning`: lista e criação de cursos.
- `/admin/elearning/$cursoId`: separadores Dados · Conteúdo · Turmas · Inscritos.
- `/certificados/verificar/$codigo`: página pública (com SSR e meta tags).
- Todas as páginas do formando e do admin ficam dentro de `RouteGate`. Entrada nova "Gestão de E-learning" em `nav-config` (grupo Admin). O `/elearning` atual mantém-se na mesma entrada do menu.

## Funções do servidor
- `src/lib/elearning.functions.ts` (formando): `listCatalogo`, `getCurso`, `inscreverCurso`, `getPasso` (sem as respostas corretas), `registarVideo` (pct, posição), `concluirPasso`, `submeterQuiz` (correção no servidor), `submeterReflexao`, `getMeusCursos`, `getMeusCertificados`.
- `src/lib/admin-elearning.functions.ts`: CRUD de cursos, módulos, passos e perguntas; `reordenar`; `importarTemasCluster`; CRUD de turmas; `listInscritos`; `regenerarCertificado`; `exportCsv`. Acesso verificado com `assertRouteAccess(userId, "/admin/elearning")`.
- `src/lib/elearning.server.ts`: motor comum:
  - `verificarAbertura` (drip: `turma.data_inicio + abertura_dias`);
  - `avaliarConclusao` (todos os passos obrigatórios concluídos e quizzes ≥ mínimo);
  - `atribuirBadge` (upsert em `user_badges` com `unique_user_badge`; a validade é calculada pelo trigger já existente `compute_user_badge_expiry`; na renovação atualiza `granted_at`/`expires_at`);
  - `emitirCertificado`;
  - `logAtividade`.
- `src/lib/certificate-elearning.server.ts`: variante nova com pdf-lib (nome, curso, horas, Online/B-learning, datas, código, QR). Guarda em `certificados/elearning/{inscricao}.pdf`. O fluxo das ações não é alterado.
- Email transacional novo `elearning-certificado` no registo de templates, com link para o certificado.

## Componentes
- `VimeoPlayer`: carrega `@vimeo/player` só no navegador; envia o progresso a cada ~10 s ou 5 % e retoma na posição guardada.
- `QuizRunner`, `ReflexaoEditor` (reutiliza `rich-text-editor`), `RecursoCard`, `PassoIndice`, `CursoCard` com `Progress`.
- Admin: `CursoForm` (badges herdados do cluster, mas editáveis), `ConteudoBuilder` com @dnd-kit (já instalado), `PassoEditor` por tipo, `QuizEditor`, `TurmasTab`, `InscritosTab`.
- `WidgetContinuarAprender` no dashboard, seguindo o padrão de `WidgetMeusProgramas` e com registo no component-registry.
- No perfil: secção "Certificados e badges".

## Ordem de implementação
1. Migração (tabelas, RLS, GRANTs, triggers de `updated_at`).
2. `elearning.server.ts` + funções de admin + `/admin/elearning` (dados, conteúdo, turmas).
3. Funções do formando + catálogo, página do curso e leitor (texto, recurso, quiz, reflexão).
4. Vimeo Player e regras de vídeo.
5. Conclusão, badges, certificado PDF com QR, página de verificação e email.
6. Inscritos/CSV, widget, perfil, nav e permissões.
7. Piloto: curso "Formação de Formadores - 3º Ciclo e Secundário", modalidade turma, em rascunho, com os 5 temas importados como módulos vazios e os badges do cluster herdados.
8. Teste de ponta a ponta com Playwright: inscrição → passos → conclusão → badge → certificado → verificação.

## Riscos e conflitos
- **Badge de entrada e validade:** existe `unique_user_badge (user_id, badge_id)`, por isso a renovação atualiza o registo existente em vez de criar outro. Confirmar que o trigger `compute_user_badge_expiry` também recalcula no UPDATE; se não recalcular, o cálculo passa a ser feito no servidor.
- **Triggers automáticos existentes** (`auto_grant_program_badge`, `auto_grant_role_badges`) podem já atribuir o mesmo badge ao formando. É inofensivo graças ao upsert, mas o badge pode aparecer antes do curso.
- **Recursos desbloqueados cedo:** ao inscrever-se, o formando recebe o badge `em_formacao`. Se `use-badge-access` aceitar qualquer badge do cluster, os recursos ficam desbloqueados logo na inscrição, e não só na conclusão. É preciso decidir se o acesso deve depender de `kind = formado`.
- **Rota `/elearning`** está hoje fora de `_authenticated`. As novas páginas do formando vão para `_authenticated/elearning*`, e o ficheiro atual é removido para evitar dois `/elearning`.
- **Template do certificado:** é A5 com layout de ações. Para o e-learning pode ser preciso um template próprio; por agora, uso o mesmo com o texto reposicionado e o QR no canto.
- **QR code:** requer uma biblioteca nova (`qrcode`, JS puro, compatível com o servidor).
- **Vimeo:** o % visto depende de eventos do cliente e pode ser manipulado. Aceitável na Fase 1, mas fica registado na atividade.
- **Emails:** o envio depende do domínio de email já configurado para os transacionais atuais.
- **Formador da turma:** vou usar `utilizadores.id`, filtrado por utilizadores com o papel Formador (ou `is_formador`), se existir.

## Suposições (corrigir se necessário)
- Equipa IPAV acede à gestão através da matriz de permissões (não tem acesso fixo no código).
- Cursos autónomos não têm turma; nos cursos em turma, a inscrição exige escolher uma turma aberta com vagas.
- Apenas o % de vídeo é configurável por curso, não por passo.
