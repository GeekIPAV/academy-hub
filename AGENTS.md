# Architecture rules

- Calculate sequential learning locks in a shared pure module and enforce them on server reads and writes, so navigation cannot bypass progression.
- Read the notebook through an authenticated, current-user-scoped function using RLS; never accept a target user identifier for private notebook reads.
- Reuse existing reflection progress for notebook entries and export through a print stylesheet, so no parallel answer store or PDF service is required.
- Keep course guidance and personal journey grids in reusable learning components, so catalogue and course layouts share presentation rules.