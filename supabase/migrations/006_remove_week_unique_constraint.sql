-- Migration 006: Ta bort unik constraint på week_number+year
-- Behövs för att kunna schemalägga flera frågor (t.ex. en aktiv + en kommande)
ALTER TABLE weekly_questions
  DROP CONSTRAINT IF EXISTS weekly_questions_week_number_year_key;
