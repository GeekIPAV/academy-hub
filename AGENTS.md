# Architecture rules

- Keep route roots and grid items shrinkable in the shared app shell (full-bleed negative-margin wrappers excepted) and contain horizontal scrolling inside tables and tab lists, giving wide tables a phone minimum width, so dense views cannot widen or squash the mobile page.
- Constrain shared dialogs and sheets to the dynamic viewport and allow vertical scrolling, so forms and their actions remain reachable on mobile.

- Calculate sequential learning locks in a shared pure module and enforce them on server reads and writes, so navigation cannot bypass progression.
- Read the notebook through an authenticated, current-user-scoped function using RLS; never accept a target user identifier for private notebook reads.
- Reuse existing reflection progress for notebook entries and export through a print stylesheet, so no parallel answer store or PDF service is required.
- Keep course guidance and catalogue module lists in reusable learning components; catalogue cards fetch existing course detail to reuse server-calculated locks without duplicating progression logic.
- Define the course shell width and horizontal gutters only in the shared course layout; child views fill it and only prose has a reading-width limit, preventing tab navigation from shifting the shell.
- Adapt course module grids and header rows to available container width rather than viewport width, so the platform sidebar cannot squeeze their controls or cards.