-- Migration 007: Utöka banners position-constraint till att inkludera left-2 och right-2
ALTER TABLE public.banners
  DROP CONSTRAINT IF EXISTS banners_position_check;

ALTER TABLE public.banners
  ADD CONSTRAINT banners_position_check
  CHECK (position IN ('left', 'left-2', 'right', 'right-2'));
