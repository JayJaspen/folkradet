-- ============================================================
-- Migration 003: Fixa get_party_results, get_question_results
-- (SECURITY DEFINER för att kringgå RLS på profiles)
-- + Tabell för lösenordsåterställningsförfrågningar
-- ============================================================

-- ============================================================
-- PARTIRESULTAT med filtrering
-- ============================================================
CREATE OR REPLACE FUNCTION get_party_results(
  p_gender    text DEFAULT NULL,
  p_lan       text DEFAULT NULL,
  p_age_group text DEFAULT NULL
)
RETURNS TABLE(party text, vote_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    latest.party,
    COUNT(*)::bigint AS vote_count
  FROM (
    -- Senaste rösten per användare
    SELECT DISTINCT ON (pv.user_id)
      pv.user_id,
      pv.party
    FROM party_votes pv
    ORDER BY pv.user_id, pv.voted_at DESC
  ) latest
  JOIN profiles p ON p.id = latest.user_id
  WHERE
    (p_gender    IS NULL OR p.gender = p_gender)
    AND (p_lan   IS NULL OR p.lan    = p_lan)
    AND (p_age_group IS NULL OR
      CASE
        WHEN EXTRACT(YEAR FROM NOW())::int - p.birth_year <= 25 THEN '18–25'
        WHEN EXTRACT(YEAR FROM NOW())::int - p.birth_year <= 35 THEN '26–35'
        WHEN EXTRACT(YEAR FROM NOW())::int - p.birth_year <= 45 THEN '36–45'
        WHEN EXTRACT(YEAR FROM NOW())::int - p.birth_year <= 55 THEN '46–55'
        WHEN EXTRACT(YEAR FROM NOW())::int - p.birth_year <= 65 THEN '56–65'
        ELSE '65+'
      END = p_age_group
    )
  GROUP BY latest.party
  ORDER BY vote_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_party_results(text, text, text) TO authenticated;

-- ============================================================
-- FRÅGRESULTAT med filtrering
-- ============================================================
CREATE OR REPLACE FUNCTION get_question_results(
  p_question_id uuid,
  p_gender      text DEFAULT NULL,
  p_lan         text DEFAULT NULL,
  p_age_group   text DEFAULT NULL
)
RETURNS TABLE(option_id uuid, option_text text, vote_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    qv.option_id,
    qo.option_text,
    COUNT(qv.id)::bigint AS vote_count
  FROM question_votes qv
  JOIN question_options qo ON qo.id = qv.option_id
  JOIN profiles p ON p.id = qv.user_id
  WHERE
    qv.question_id = p_question_id
    AND (p_gender    IS NULL OR p.gender = p_gender)
    AND (p_lan       IS NULL OR p.lan    = p_lan)
    AND (p_age_group IS NULL OR
      CASE
        WHEN EXTRACT(YEAR FROM NOW())::int - p.birth_year <= 25 THEN '18–25'
        WHEN EXTRACT(YEAR FROM NOW())::int - p.birth_year <= 35 THEN '26–35'
        WHEN EXTRACT(YEAR FROM NOW())::int - p.birth_year <= 45 THEN '36–45'
        WHEN EXTRACT(YEAR FROM NOW())::int - p.birth_year <= 55 THEN '46–55'
        WHEN EXTRACT(YEAR FROM NOW())::int - p.birth_year <= 65 THEN '56–65'
        ELSE '65+'
      END = p_age_group
    )
  GROUP BY qv.option_id, qo.option_text
  ORDER BY vote_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_question_results(uuid, text, text, text) TO authenticated;

-- ============================================================
-- LÖSENORDSÅTERSTÄLLNING
-- Tabell för förfrågningar som admin hanterar manuellt
-- ============================================================
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  resolved_at  timestamptz,
  resolved_by  uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Alla kan skapa förfrågningar (även utan inloggning)
CREATE POLICY "Anyone can create reset request" ON public.password_reset_requests
  FOR INSERT WITH CHECK (TRUE);

-- Bara admins kan läsa och uppdatera
CREATE POLICY "Admins read reset requests" ON public.password_reset_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Admins update reset requests" ON public.password_reset_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );
