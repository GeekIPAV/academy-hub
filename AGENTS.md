# Architecture rules

- Enhance sanitized learning HTML links through a shared media renderer with allowlisted video providers; keep saved lesson content and completion rules unchanged.

- Keep route roots and grid items shrinkable in the shared app shell (full-bleed negative-margin wrappers excepted) and contain horizontal scrolling inside tables and tab lists, giving wide tables a phone minimum width, so dense views cannot widen or squash the mobile page.
- Constrain shared dialogs and sheets to the dynamic viewport and allow vertical scrolling, so forms and their actions remain reachable on mobile.

- Calculate sequential learning locks in a shared pure module and enforce them on server reads and writes, so navigation cannot bypass progression.
- Read the notebook through an authenticated, current-user-scoped function using RLS; never accept a target user identifier for private notebook reads.
- Reuse existing reflection progress for notebook entries and export through a print stylesheet, so no parallel answer store or PDF service is required.
- Keep course guidance and catalogue module lists in reusable learning components; catalogue cards fetch existing course detail to reuse server-calculated locks without duplicating progression logic.
- Define the course shell width and horizontal gutters only in the shared course layout; child views fill it and only prose has a reading-width limit, preventing tab navigation from shifting the shell.
- Adapt course module grids and header rows to available container width rather than viewport width, so the platform sidebar cannot squeeze their controls or cards.- Resolve a user's project membership live as direct assignments plus active entity links (user_projetos_efetivos), never by copying entity memberships to users, so removing an entity from a project revokes inherited access immediately.
- Store Equipa IPAV reflection comments on the reflection's progress row and authorise writes server-side for Admin/Equipa IPAV only, so the notebook and its PDF read them without a parallel store.
- Grant full Centro de recursos access by user type through has_centro_recursos_access (DB) mirrored by src/lib/centro-recursos-access.ts (UI), so screens and RLS agree on who sees every cluster.
- Hide content-less Centro de recursos temas only from users whose sole type is Utilizador, computed live in src/lib/recursos-temas-visiveis.ts, so temas reappear automatically once content is added.
- Derive an invite link's type (Utilizadores / Entidades / Personalizado) from its roles via `invite-types.ts`; typed links set the role automatically and the permanent per-type link is reused through `getOrCreateTypedInviteToken`, so no separate type column is needed.
- Store a resource-centre tema's format (Sessão / Conteúdo / Pasta de documentos) as a `formato:` marker in `temas_momentos.hidden_sections` via `tema-formatos.ts`; absence means Sessão, so existing temas are unchanged.
- Link resources to a tema only through `syncTemaRecursos`, which keeps existing `sort_order` values and appends new resources at the end.
- Rename a cluster only through `renameCluster`, which updates every text copy of the name and migrates `/recursos#cluster:<slug>` permissions.
- Keep session-plan helpers (time parsing, room equipment, aggregated materials, pauses) in `src/lib/plano-sessao.ts` and reuse them for both the Plano de sessão tab and the A4 print (`PlanoSessaoImpressao`), which is printed through a scoped `@media print` stylesheet instead of a PDF service.
- Render Centro de recursos resources only through `RecursosViews` (Lista / Tabela / Galeria + Agrupar por); resource reordering stays in the ungrouped, unfiltered Lista so the saved order is unambiguous.
- Show any participant's journey only through `getRoadmap` with a `userId`, guarded by route access to `/admin/jornada`, so the Gestão page and the personal widget share one calculation.
