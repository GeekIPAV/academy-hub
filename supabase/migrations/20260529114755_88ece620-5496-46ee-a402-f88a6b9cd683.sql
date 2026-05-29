ALTER TABLE public.tema_recursos
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Backfill: por tema, atribuir ordem segundo created_at (ordem de adição)
WITH ordered AS (
  SELECT tema_id, recurso_id,
    (row_number() OVER (PARTITION BY tema_id ORDER BY created_at ASC, recurso_id ASC) - 1) * 10 AS new_order
  FROM public.tema_recursos
)
UPDATE public.tema_recursos tr
SET sort_order = o.new_order
FROM ordered o
WHERE tr.tema_id = o.tema_id AND tr.recurso_id = o.recurso_id;

CREATE INDEX IF NOT EXISTS tema_recursos_tema_sort_idx
  ON public.tema_recursos (tema_id, sort_order);