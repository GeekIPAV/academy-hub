ALTER TYPE public.projeto_status ADD VALUE IF NOT EXISTS 'possibilidade';
ALTER TYPE public.projeto_status ADD VALUE IF NOT EXISTS 'em_arranque';
ALTER TYPE public.projeto_status ADD VALUE IF NOT EXISTS 'em_contratualizacao';
ALTER TYPE public.projeto_status ADD VALUE IF NOT EXISTS 'em_progresso';
ALTER TYPE public.projeto_status ADD VALUE IF NOT EXISTS 'institucional';
ALTER TYPE public.projeto_status ADD VALUE IF NOT EXISTS 'em_fecho';
ALTER TYPE public.projeto_status ADD VALUE IF NOT EXISTS 'terminado';