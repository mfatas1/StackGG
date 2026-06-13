import { getPool } from "./db.js";
import { query } from "./db.js";
import { persistMatch } from "./persist.js";
import { refreshAccountRanks } from "./accounts.js";
import { TRACKED_QUEUE_IDS } from "./riot/regions.js";
import { getRiotClient, type RiotClient } from "./riot/client.js";
import type { Queryable } from "./db.js";

const DAY_MS = 86_400_000;

export interface BackfillOptions {
  puuid: string;
  platform: string;
  days?: number;
  /** puuids whose participant rows to persist from each fetched match (the crew). */
  trackedPuuids?: Set<string>;
  /** store full match JSON (needed for snapshot frequent-teammate detection). */
  storeRaw?: boolean;
  /** quick mode: only the most recent N matches per queue (single page, no pagination). */
  recentOnlyPerQueue?: number;
  client?: RiotClient;
  db?: Queryable;
  now?: number;
}

export interface BackfillResult {
  candidateMatchIds: number;
  fetched: number;
  participantsWritten: number;
}

/**
 * Backfill a member's matches across all tracked queues over the last `days`.
 * Deduplicates: a match already having this puuid's participant row is skipped,
 * so shared games are fetched once (PLAN hard rule #5).
 */
export async function backfillMember(opts: BackfillOptions): Promise<BackfillResult> {
  const client = opts.client ?? getRiotClient();
  const db = opts.db ?? getPool();
  const days = opts.days ?? 90;
  const now = opts.now ?? Date.now();
  const startTime = now - days * DAY_MS;
  const tracked = opts.trackedPuuids ?? new Set([opts.puuid]);
  const quick = opts.recentOnlyPerQueue;

  const ids = new Set<string>();
  for (const queue of TRACKED_QUEUE_IDS) {
    if (quick) {
      const page = await client.getMatchIds(opts.puuid, opts.platform, { queue, startTime, start: 0, count: quick });
      for (const id of page) ids.add(id);
      continue;
    }
    let start = 0;
    for (;;) {
      const page = await client.getMatchIds(opts.puuid, opts.platform, { queue, startTime, start, count: 100 });
      for (const id of page) ids.add(id);
      if (page.length < 100) break;
      start += 100;
    }
  }
  const allIds = [...ids];

  let toFetch = allIds;
  if (allIds.length) {
    const existing = await query<{ match_id: string }>(
      `SELECT match_id FROM match_participants WHERE puuid = $1 AND match_id = ANY($2)`,
      [opts.puuid, allIds],
      db,
    );
    const have = new Set(existing.map((r) => r.match_id));
    toFetch = allIds.filter((id) => !have.has(id));
  }

  let fetched = 0;
  let participantsWritten = 0;
  for (const id of toFetch) {
    const match = await client.getMatch(id, opts.platform);
    const res = await persistMatch(db, match, tracked, { storeRaw: opts.storeRaw });
    fetched++;
    participantsWritten += res.participantsWritten;
  }

  await db.query(`UPDATE riot_accounts SET last_backfilled_at = now(), last_polled_at = now() WHERE puuid = $1`, [
    opts.puuid,
  ]);

  return { candidateMatchIds: allIds.length, fetched, participantsWritten };
}

/** Lightweight incremental poll: only the most recent matches (PLAN: ~30 min). */
export async function pollMember(opts: {
  puuid: string;
  platform: string;
  trackedPuuids?: Set<string>;
  client?: RiotClient;
  db?: Queryable;
}): Promise<BackfillResult> {
  return backfillMember({
    puuid: opts.puuid,
    platform: opts.platform,
    days: 2,
    trackedPuuids: opts.trackedPuuids,
    storeRaw: false,
    client: opts.client,
    db: opts.db,
  });
}

export { refreshAccountRanks };
