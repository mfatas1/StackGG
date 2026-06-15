-- The Riot API key was changed to a non-expiring personal key. PUUIDs are scoped to
-- the key that minted them, so every account stored under the old key now resolves to
-- a NEW PUUID and the old one no longer decrypts (match-v5 → 400). Mark every account
-- stale so it re-resolves once under the new key; scripts/remap-puuids.ts (run on boot)
-- then migrates each account's history + crew links onto the new PUUID.
UPDATE riot_accounts SET is_stale = true;
