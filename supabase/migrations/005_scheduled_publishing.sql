-- Migration 005: Schemalagd publicering för veckans fråga
-- Lägger till publish_at (när frågan publiceras) och unpublish_at (när den avpubliceras)

ALTER TABLE weekly_questions
  ADD COLUMN IF NOT EXISTS publish_at  timestamptz,
  ADD COLUMN IF NOT EXISTS unpublish_at timestamptz;

-- Fyll i befintliga frågor: publish_at = published_at, unpublish_at = published_at + 5 dagar
UPDATE weekly_questions
SET
  publish_at   = published_at,
  unpublish_at = published_at + INTERVAL '5 days'
WHERE publish_at IS NULL;

-- Sätt default för framtida inserts
ALTER TABLE weekly_questions
  ALTER COLUMN publish_at SET DEFAULT NOW();
