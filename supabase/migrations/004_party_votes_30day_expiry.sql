-- ============================================================
-- Migration 004: Partiröster gäller i 30 dagar
-- Uppdaterar get_party_results så att röster äldre än 30 dagar
-- exkluderas från statistiken
-- ============================================================

DROP FUNCTION IF EXISTS get_party_results(text, text, text);

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
    -- Senaste rösten per användare (de senaste 30 dagarna)
    SELECT DISTINCT ON (pv.user_id)
      pv.user_id,
      pv.party
    FROM party_votes pv
    WHERE pv.voted_at >= NOW() - INTERVAL '30 days'
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

-- Uppdatera även get_party_filter_options att bara visa demografier
-- för röstare med aktiva röster (inom 30 dagar)
DROP FUNCTION IF EXISTS get_party_filter_options();

CREATE OR REPLACE FUNCTION get_party_filter_options()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'genders', (
      SELECT COALESCE(jsonb_agg(DISTINCT p.gender ORDER BY p.gender), '[]'::jsonb)
      FROM party_votes pv
      JOIN profiles p ON p.id = pv.user_id
      WHERE pv.voted_at >= NOW() - INTERVAL '30 days'
        AND p.gender IS NOT NULL AND p.gender != ''
    ),
    'lans', (
      SELECT COALESCE(jsonb_agg(DISTINCT p.lan ORDER BY p.lan), '[]'::jsonb)
      FROM party_votes pv
      JOIN profiles p ON p.id = pv.user_id
      WHERE pv.voted_at >= NOW() - INTERVAL '30 days'
        AND p.lan IS NOT NULL AND p.lan != ''
    ),
    'age_groups', (
      SELECT COALESCE(jsonb_agg(DISTINCT age_group), '[]'::jsonb)
      FROM (
        SELECT CASE
          WHEN EXTRACT(YEAR FROM NOW())::int - p.birth_year <= 25 THEN '18–25'
          WHEN EXTRACT(YEAR FROM NOW())::int - p.birth_year <= 35 THEN '26–35'
          WHEN EXTRACT(YEAR FROM NOW())::int - p.birth_year <= 45 THEN '36–45'
          WHEN EXTRACT(YEAR FROM NOW())::int - p.birth_year <= 55 THEN '46–55'
          WHEN EXTRACT(YEAR FROM NOW())::int - p.birth_year <= 65 THEN '56–65'
          ELSE '65+'
        END AS age_group
        FROM party_votes pv
        JOIN profiles p ON p.id = pv.user_id
        WHERE pv.voted_at >= NOW() - INTERVAL '30 days'
          AND p.birth_year IS NOT NULL
      ) sub
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_party_filter_options() TO authenticated;
