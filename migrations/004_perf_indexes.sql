-- Performance indexes (perf audit).

-- Riot ID search / account resolution did a full seq scan of riot_accounts on every
-- search and every snapshot/crew page load (accounts.ts findAccountByRiotId).
CREATE INDEX IF NOT EXISTS riot_accounts_riotid_lower_idx
  ON riot_accounts (lower(riot_id), lower(tag));

-- The frequent-teammates path scans matches.raw; a partial index keeps it from
-- touching rows where raw was never stored.
CREATE INDEX IF NOT EXISTS matches_raw_present_idx
  ON matches (match_id) WHERE raw IS NOT NULL;
