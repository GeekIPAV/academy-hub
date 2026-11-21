-- Etapas com condição (Fase 2 do plano de desbloqueio por etapas).
--
-- * Inscrição na FTP só na 2.ª semana e só com o badge da FTC.
-- * Alertas diários a quem não concluiu a FTC; a equipa IPAV regista a
--   desistência (inscritos_programa.status = 'desistiu') ou dá mais tempo.
-- * A presença na FTP (inscritos_acoes.status = 'presente') atribui o badge
--   «Apto para a Semana Ubuntu» do programa, que abre o bloco Semana Ubuntu
--   no Centro de recursos.
--
-- As duas regras em aberto ficam configuráveis por programa:
-- * ftc_atraso_permitido: quem não concluiu a FTC na 1.ª semana ainda pode
--   concluir na 2.ª e ir a essa FTP (true) ou tem de passar para outra (false).
-- * ftp_dias_decisao: com quantos dias de antecedência a equipa decide sobre
--   uma FTP abaixo do mínimo.

ALTER TABLE public.programas
  ADD COLUMN IF NOT EXISTS ftc_atraso_permitido boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ftp_dias_decisao integer NOT NULL DEFAULT 21 CHECK (ftp_dias_decisao BETWEEN 0 AND 120),
  ADD COLUMN IF NOT EXISTS su_badge_id uuid REFERENCES public.badges(id) ON DELETE SET NULL;

ALTER TABLE public.inscritos_programa
  ADD COLUMN IF NOT EXISTS ftc_prazo_extra_ate date;

-- Registo dos alertas automáticos já enviados (um por pessoa, FTP e tipo).
CREATE TABLE IF NOT EXISTS public.ftp_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ftp_acao_id uuid NOT NULL REFERENCES public.acoes(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ftp_acao_id, tipo)
);
ALTER TABLE public.ftp_alertas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Equipa le alertas FTP" ON public.ftp_alertas;
CREATE POLICY "Equipa le alertas FTP" ON public.ftp_alertas
  FOR SELECT TO authenticated USING (public.is_equipa(auth.uid()));

-- ---------------------------------------------------------------------------
-- Alertas diários: FTC aberta, prazo da FTC terminado, inscrição na FTP aberta.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ftp_alertas_diarios()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total integer;
BEGIN
  WITH ftps AS (
    SELECT a.id AS ftp_id, a.start_date AS ftp, p.ftc_curso_id, p.ftc_atraso_permitido, ep.id AS cohort_id
    FROM public.acoes a
    JOIN public.entidades_programas ep ON ep.ftp_acao_id = a.id
    JOIN public.programas p ON p.id = ep.program_id
    WHERE a.action_type = 'FTP'
      AND coalesce(a.status, '') NOT IN ('Cancelada', 'Fechada')
      AND a.start_date IS NOT NULL
      AND p.ftc_curso_id IS NOT NULL
      AND current_date BETWEEN a.start_date - 14 AND a.start_date - 1
  ),
  edu AS (
    SELECT f.*, ip.user_id,
      EXISTS (
        SELECT 1 FROM public.cursos_inscricoes ci
        WHERE ci.user_id = ip.user_id AND ci.curso_id = f.ftc_curso_id AND ci.estado = 'concluido'
      ) AS concluiu,
      EXISTS (
        SELECT 1 FROM public.inscritos_acoes ia
        WHERE ia.user_id = ip.user_id AND ia.action_id = f.ftp_id AND ia.status IN ('aceite', 'presente')
      ) AS inscrito
    FROM ftps f
    JOIN public.inscritos_programa ip ON ip.cohort_id = f.cohort_id AND ip.status = 'aprovada'
    WHERE ip.user_id IS NOT NULL
  ),
  candidatos AS (
    SELECT user_id, ftp_id, ftp, ftc_curso_id, ftc_atraso_permitido, 'ftc_abre'::text AS tipo
    FROM edu WHERE NOT concluiu
    UNION ALL
    SELECT user_id, ftp_id, ftp, ftc_curso_id, ftc_atraso_permitido, 'ftc_prazo'
    FROM edu WHERE NOT concluiu AND current_date >= ftp - 7
    UNION ALL
    SELECT user_id, ftp_id, ftp, ftc_curso_id, ftc_atraso_permitido, 'ftp_inscricao'
    FROM edu WHERE concluiu AND NOT inscrito AND current_date >= ftp - 7
  ),
  novos AS (
    INSERT INTO public.ftp_alertas (user_id, ftp_acao_id, tipo)
    SELECT user_id, ftp_id, tipo FROM candidatos
    ON CONFLICT (user_id, ftp_acao_id, tipo) DO NOTHING
    RETURNING user_id, ftp_acao_id, tipo
  ),
  enviados AS (
    INSERT INTO public.notificacoes (user_id, title, message, link)
    SELECT n.user_id,
      CASE n.tipo
        WHEN 'ftc_abre' THEN 'A tua FTC já abriu'
        WHEN 'ftc_prazo' THEN 'Ainda não concluíste a FTC'
        ELSE 'Já te podes inscrever na FTP'
      END,
      CASE n.tipo
        WHEN 'ftc_abre' THEN 'Tens até ' || to_char(c.ftp - 8, 'DD/MM') || ' para concluir a Formação Teórico-Conceptual. Depois inscreves-te na FTP de ' || to_char(c.ftp, 'DD/MM') || '.'
        WHEN 'ftc_prazo' THEN CASE WHEN c.ftc_atraso_permitido
          THEN 'O prazo da 1.ª semana terminou. Conclui a FTC até ' || to_char(c.ftp - 1, 'DD/MM') || ' para te inscreveres na FTP de ' || to_char(c.ftp, 'DD/MM') || '.'
          ELSE 'O prazo da 1.ª semana terminou. Fala com a equipa IPAV para saberes se ainda podes ir à FTP de ' || to_char(c.ftp, 'DD/MM') || '.'
        END
        ELSE 'A inscrição na FTP de ' || to_char(c.ftp, 'DD/MM') || ' está aberta até ' || to_char(c.ftp - 1, 'DD/MM') || '.'
      END,
      CASE WHEN n.tipo = 'ftp_inscricao' THEN '/dashboard' ELSE '/elearning/' || c.ftc_curso_id END
    FROM novos n
    JOIN (SELECT DISTINCT ON (user_id, ftp_id, tipo) * FROM candidatos) c
      ON c.user_id = n.user_id AND c.ftp_id = n.ftp_acao_id AND c.tipo = n.tipo
    RETURNING 1
  )
  SELECT count(*) INTO total FROM enviados;
  RETURN total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ftp_alertas_diarios() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ftp_alertas_diarios() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'ftp-alertas-diarios';
    PERFORM cron.schedule('ftp-alertas-diarios', '17 7 * * *', 'SELECT public.ftp_alertas_diarios()');
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Bloco Semana Ubuntu no Centro de recursos: para quem só tem o tipo
-- Utilizador, os recursos usados apenas em temas do bloco Semana Ubuntu de um
-- cluster cujo programa tem badge «Apto para a Semana Ubuntu» exigem esse
-- badge válido. Espelhado em src/lib/ftp-calendario.ts (eBlocoSemanaUbuntu).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.e_bloco_semana_ubuntu(_bloco text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT _bloco IS NOT NULL AND (
    lower(trim(_bloco)) = 'su'
    OR lower(translate(_bloco, 'ÀÁÂÃàáâã', 'AAAAaaaa')) LIKE '%semana ubuntu%'
  );
$$;

CREATE OR REPLACE FUNCTION public.recurso_bloqueado_semana_ubuntu(_user_id uuid, _recurso_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL
    -- Só para quem tem apenas o tipo Utilizador.
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id AND ur.role_name <> 'Utilizador'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.utilizadores u
      WHERE u.id = _user_id AND u.role IS NOT NULL AND u.role <> 'Utilizador'
    )
    -- Usado em pelo menos um tema bloqueado…
    AND EXISTS (
      SELECT 1
      FROM public.tema_recursos tr
      JOIN public.temas_momentos tm ON tm.id = tr.tema_id
      JOIN public.programas p ON p.cluster_id = tm.cluster_id AND p.su_badge_id IS NOT NULL
      WHERE tr.recurso_id = _recurso_id AND public.e_bloco_semana_ubuntu(tm.bloco)
    )
    -- …e em nenhum tema aberto.
    AND NOT EXISTS (
      SELECT 1
      FROM public.tema_recursos tr
      JOIN public.temas_momentos tm ON tm.id = tr.tema_id
      WHERE tr.recurso_id = _recurso_id
        AND NOT (
          public.e_bloco_semana_ubuntu(tm.bloco)
          AND EXISTS (SELECT 1 FROM public.programas p WHERE p.cluster_id = tm.cluster_id AND p.su_badge_id IS NOT NULL)
        )
    )
    -- Sem o badge «Apto para a Semana Ubuntu» válido de nenhum desses programas.
    AND NOT EXISTS (
      SELECT 1
      FROM public.tema_recursos tr
      JOIN public.temas_momentos tm ON tm.id = tr.tema_id
      JOIN public.programas p ON p.cluster_id = tm.cluster_id AND p.su_badge_id IS NOT NULL
      JOIN public.user_badges ub ON ub.badge_id = p.su_badge_id AND ub.user_id = _user_id
      WHERE tr.recurso_id = _recurso_id
        AND (ub.expires_at IS NULL OR ub.expires_at > now())
    );
$$;

REVOKE EXECUTE ON FUNCTION public.recurso_bloqueado_semana_ubuntu(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recurso_bloqueado_semana_ubuntu(uuid, uuid) TO authenticated, service_role;

-- Mesmo corpo de 0008, agora com o bloqueio do bloco Semana Ubuntu.
CREATE OR REPLACE FUNCTION public.user_can_access_recurso(_user_id uuid, _recurso_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    _user_id IS NOT NULL
    AND (
      public.is_admin(_user_id)
      OR public.has_centro_recursos_access(_user_id)
      OR public.has_role(_user_id, 'Formador')
      OR EXISTS (
        SELECT 1 FROM public.recursos r
        WHERE r.id = _recurso_id AND r.cluster_id IS NOT NULL
          AND public.user_can_access_cluster(_user_id, r.cluster_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.tema_recursos tr
        JOIN public.temas_momentos tm ON tm.id = tr.tema_id
        WHERE tr.recurso_id = _recurso_id
          AND tm.cluster_id IS NOT NULL
          AND public.user_can_access_cluster(_user_id, tm.cluster_id)
      )
      OR (
        EXISTS (SELECT 1 FROM public.recursos r WHERE r.id = _recurso_id AND r.cluster_id IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM public.tema_recursos tr
          JOIN public.temas_momentos tm ON tm.id = tr.tema_id
          WHERE tr.recurso_id = _recurso_id AND tm.cluster_id IS NOT NULL
        )
      )
    )
    AND NOT public.recurso_bloqueado_semana_ubuntu(_user_id, _recurso_id);
$function$;
