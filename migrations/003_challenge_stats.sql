-- A few stats from the match-v5 `challenges` object, for extra leaderboard tags.
-- All participant-level (NO timeline, no extra Riot requests) — backfilled from matches.raw.
ALTER TABLE match_participants
  ADD COLUMN IF NOT EXISTS team_damage_pct        real,     -- teamDamagePercentage (0..1)
  ADD COLUMN IF NOT EXISTS skillshots_dodged      integer,  -- skillshotsDodged
  ADD COLUMN IF NOT EXISTS kills_near_enemy_turret integer, -- killsNearEnemyTurret
  ADD COLUMN IF NOT EXISTS fountain_takedowns     integer,  -- takedownsInEnemyFountain
  ADD COLUMN IF NOT EXISTS smiteless_steals       integer,  -- epicMonsterStolenWithoutSmite
  ADD COLUMN IF NOT EXISTS ally_saves             integer;  -- saveAllyFromDeath
