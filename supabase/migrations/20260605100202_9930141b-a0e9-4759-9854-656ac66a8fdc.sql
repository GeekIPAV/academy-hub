
ALTER TABLE public.roles DISABLE TRIGGER USER;
UPDATE public.roles SET is_system = true WHERE name = 'Entidade';
ALTER TABLE public.roles ENABLE TRIGGER USER;
