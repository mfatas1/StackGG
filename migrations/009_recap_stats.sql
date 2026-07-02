-- "Year in Review" recap fuel: pings, comedy challenges, and surrender flags. Every column
-- comes from the match-v5 participant payload we already fetch (NO timeline, no extra Riot
-- requests — PLAN hard rule #4). Nullable to match the additive convention (migration 002):
-- historical rows read as "unknown" until re-ingested. mapParticipant always writes a real
-- value (default 0/false), so a reset + profile reload backfills the whole season.
ALTER TABLE match_participants
  -- ---- Ping wheel (participant-level counts) ----
  ADD COLUMN IF NOT EXISTS all_in_pings          integer,  -- allInPings ("all in!")
  ADD COLUMN IF NOT EXISTS assist_me_pings       integer,  -- assistMePings ("help!")
  ADD COLUMN IF NOT EXISTS bait_pings            integer,  -- baitPings
  ADD COLUMN IF NOT EXISTS basic_pings           integer,  -- basicPings (the green generic ping)
  ADD COLUMN IF NOT EXISTS command_pings         integer,  -- commandPings ("go here" — backseating)
  ADD COLUMN IF NOT EXISTS danger_pings          integer,  -- dangerPings ("careful!")
  ADD COLUMN IF NOT EXISTS enemy_missing_pings   integer,  -- enemyMissingPings ("?" / MIA)
  ADD COLUMN IF NOT EXISTS enemy_vision_pings    integer,  -- enemyVisionPings ("they have vision")
  ADD COLUMN IF NOT EXISTS get_back_pings        integer,  -- getBackPings ("fall back")
  ADD COLUMN IF NOT EXISTS hold_pings            integer,  -- holdPings ("hold")
  ADD COLUMN IF NOT EXISTS need_vision_pings     integer,  -- needVisionPings ("place a ward here")
  ADD COLUMN IF NOT EXISTS on_my_way_pings       integer,  -- onMyWayPings ("on my way" — usually lying)
  ADD COLUMN IF NOT EXISTS push_pings            integer,  -- pushPings ("push")
  ADD COLUMN IF NOT EXISTS vision_cleared_pings  integer,  -- visionClearedPings
  -- ---- Comedy challenges (participant.challenges.*) ----
  ADD COLUMN IF NOT EXISTS kills_under_own_turret integer, -- challenges.killsUnderOwnTurret (bait master)
  ADD COLUMN IF NOT EXISTS outnumbered_kills      integer, -- challenges.outnumberedKills (1vX)
  ADD COLUMN IF NOT EXISTS perfect_game           integer, -- challenges.perfectGame (flawless win, 0/1)
  ADD COLUMN IF NOT EXISTS ability_uses           integer, -- challenges.abilityUses (fake APM)
  ADD COLUMN IF NOT EXISTS danced_with_herald     integer, -- challenges.dancedWithRiftHerald
  ADD COLUMN IF NOT EXISTS survived_single_digit_hp integer, -- challenges.survivedSingleDigitHpCount
  ADD COLUMN IF NOT EXISTS knock_into_team_kills  integer, -- challenges.knockEnemyIntoTeamAndKill (yeet)
  ADD COLUMN IF NOT EXISTS fist_bump_participation integer, -- challenges.fistBumpParticipation (BFFs)
  -- ---- Surrender flags (participant-level booleans) ----
  ADD COLUMN IF NOT EXISTS ended_in_surrender     boolean, -- gameEndedInSurrender (/ff)
  ADD COLUMN IF NOT EXISTS team_early_surrendered  boolean; -- gameEndedInEarlySurrender (/ff15 early)
