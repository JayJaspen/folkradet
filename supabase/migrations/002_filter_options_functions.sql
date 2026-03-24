-- ============================================================
-- Filter options functions med SECURITY DEFINER
-- Behövs för att kringgå RLS på profiles-tabellen så att
-- alla inloggade användare kan se vilka demografiska urval
-- som finns bland röstarna (ej känsliga data, bara distinkt kön/län/ålder)
-- ============================================================

-- Returnerar distinkta demografivärden från partiröstare
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
      WHERE p.gender IS NOT NULL AND p.gender != ''
    ),
    'lans', (
      SELECT COALESCE(jsonb_agg(DISTINCT p.lan ORDER BY p.lan), '[]'::jsonb)
      FROM party_votes pv
      JOIN profiles p ON p.id = pv.user_id
      WHERE p.lan IS NOT NULL AND p.lan != ''
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
        WHERE p.birth_year IS NOT NULL
      ) sub
    )
  );
END;
$$;

-- Returnerar distinkta demografivärden från röstare på en specifik fråga
CREATE OR REPLACE FUNCTION get_question_filter_options(p_question_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'genders', (
      SELECT COALESCE(jsonb_agg(DISTINCT p.gender ORDER BY p.gender), '[]'::jsonb)
      FROM question_votes qv
      JOIN profiles p ON p.id = qv.user_id
      WHERE qv.question_id = p_question_id
        AND p.gender IS NOT NULL AND p.gender != ''
    ),
    'lans', (
      SELECT COALESCE(jsonb_agg(DISTINCT p.lan ORDER BY p.lan), '[]'::jsonb)
      FROM question_votes qv
      JOIN profiles p ON p.id = qv.user_id
      WHERE qv.question_id = p_question_id
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
        FROM question_votes qv
        JOIN profiles p ON p.id = qv.user_id
        WHERE qv.question_id = p_question_id
          AND p.birth_year IS NOT NULL
      ) sub
    )
  );
END;
$$;

-- Ge authenticated users rätt att anropa funktionerna
GRANT EXECUTE ON FUNCTION get_party_filter_options() TO authenticated;
GRANT EXECUTE ON FUNCTION get_question_filter_options(uuid) TO authenticated;
