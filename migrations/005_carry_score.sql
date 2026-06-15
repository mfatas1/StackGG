-- Carry/MVP score computed once at ingest from the full match (all 10 players are in
-- matches.raw then), so every view — match list, activity feed, expanded scoreboard —
-- reads the same value and the crowns can never disagree.
ALTER TABLE match_participants
  ADD COLUMN IF NOT EXISTS carry_score  real,     -- 0..1-ish, normalized within the player's team
  ADD COLUMN IF NOT EXISTS is_team_mvp  boolean;  -- was this player their team's highest carry score
