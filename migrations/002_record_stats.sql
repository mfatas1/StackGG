-- Extra per-game participant stats for the "funny records" board. All come from the
-- match-v5 participant payload we already fetch (NO timeline, no extra Riot requests).
-- Nullable so historical rows that predate this migration read as "unknown" (excluded
-- from records) until backfilled from matches.raw or re-ingested.
ALTER TABLE match_participants
  ADD COLUMN IF NOT EXISTS time_dead         integer,  -- totalTimeSpentDead (seconds)
  ADD COLUMN IF NOT EXISTS longest_life      integer,  -- longestTimeSpentLiving (seconds)
  ADD COLUMN IF NOT EXISTS killing_spree     integer,  -- largestKillingSpree
  ADD COLUMN IF NOT EXISTS multikill         integer,  -- largestMultiKill (2..5)
  ADD COLUMN IF NOT EXISTS pentakills        integer,  -- pentaKills
  ADD COLUMN IF NOT EXISTS damage_taken      integer,  -- totalDamageTaken
  ADD COLUMN IF NOT EXISTS self_mitigated    integer,  -- damageSelfMitigated
  ADD COLUMN IF NOT EXISTS heal_teammates    integer,  -- totalHealsOnTeammates
  ADD COLUMN IF NOT EXISTS shield_teammates  integer,  -- totalDamageShieldedOnTeammates
  ADD COLUMN IF NOT EXISTS cc_time           integer,  -- timeCCingOthers (seconds)
  ADD COLUMN IF NOT EXISTS largest_crit      integer,  -- largestCriticalStrike
  ADD COLUMN IF NOT EXISTS objectives_stolen integer,  -- objectivesStolen (baron/dragon steals)
  ADD COLUMN IF NOT EXISTS solo_kills        integer;  -- challenges.soloKills
