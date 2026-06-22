-- StackGG schema (PLAN.md §8). Single migration for v1.
-- Postgres 13+ (gen_random_uuid built in).

CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- One row per tracked Riot account. PUUID is the stable identity across renames.
CREATE TABLE IF NOT EXISTS riot_accounts (
  puuid               text PRIMARY KEY,
  riot_id             text NOT NULL,          -- game name (without tag)
  tag                 text NOT NULL,          -- tagline
  region              text NOT NULL,          -- platform host, e.g. euw1
  summoner_id         text,                   -- league-v4 encrypted summoner id
  profile_icon        integer,
  claimed_by_user_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  last_polled_at      timestamptz,
  last_backfilled_at  timestamptz,
  rank_solo           jsonb,                  -- {tier,rank,lp,wins,losses}
  rank_flex           jsonb,
  is_stale            boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  name          text NOT NULL,
  invite_code   text UNIQUE NOT NULL,
  owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crew_members (
  crew_id   uuid NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  puuid     text NOT NULL REFERENCES riot_accounts(puuid) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  role      text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  PRIMARY KEY (crew_id, puuid)
);

-- One row per unique match, fetched once regardless of how many crew members played.
CREATE TABLE IF NOT EXISTS matches (
  match_id      text PRIMARY KEY,
  queue_id      integer NOT NULL,
  game_start    timestamptz NOT NULL,
  game_duration integer NOT NULL,            -- seconds
  patch         text,
  region        text NOT NULL,               -- regional route used (europe/americas/asia/sea)
  raw           jsonb,                        -- optional cold storage of full payload
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS matches_queue_start_idx ON matches (queue_id, game_start DESC);

-- Only rows for tracked puuids. PK (match_id, puuid).
CREATE TABLE IF NOT EXISTS match_participants (
  match_id      text NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
  puuid         text NOT NULL,
  team_id       integer NOT NULL,            -- 100 / 200
  subteam_id    integer,                     -- Arena playerSubteamId (1..8)
  placement     integer,                     -- Arena subteamPlacement (1..8)
  champion_id   integer NOT NULL,
  champion_name text NOT NULL,
  role          text,                        -- teamPosition: TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY/''
  win           boolean NOT NULL,
  kills         integer NOT NULL,
  deaths        integer NOT NULL,
  assists       integer NOT NULL,
  gold          integer NOT NULL,
  damage        integer NOT NULL,            -- totalDamageDealtToChampions
  cs            integer NOT NULL,            -- totalMinionsKilled + neutralMinionsKilled
  vision_score  integer NOT NULL,
  PRIMARY KEY (match_id, puuid)
);
CREATE INDEX IF NOT EXISTS mp_puuid_idx ON match_participants (puuid);
CREATE INDEX IF NOT EXISTS mp_match_idx ON match_participants (match_id);

-- Precomputed weekly recap payloads (also the v2 Discord digest shape).
CREATE TABLE IF NOT EXISTS stat_snapshots (
  crew_id    uuid NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  period     text NOT NULL,                  -- ISO week, e.g. 2026-W24
  payload    jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (crew_id, period)
);

-- Short-TTL cache for computed crew stats (leaderboard/synergy/etc).
CREATE TABLE IF NOT EXISTS crew_stat_cache (
  crew_id    uuid NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  cache_key  text NOT NULL,
  payload    jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (crew_id, cache_key)
);

-- ---- Auth (custom magic-link) ----
CREATE TABLE IF NOT EXISTS magic_links (
  token       text PRIMARY KEY,              -- random opaque token
  email       text NOT NULL,
  redirect_to text,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id         text PRIMARY KEY,               -- random session id (stored in signed cookie)
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- ---- Global Riot rate-limit coordination ----
-- A request log shared across all processes so the single-limiter guarantee
-- (PLAN hard rule #2) holds even with web + worker running separately.
CREATE TABLE IF NOT EXISTS riot_request_log (
  id      bigserial PRIMARY KEY,
  called_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS riot_request_log_time_idx ON riot_request_log (called_at);
