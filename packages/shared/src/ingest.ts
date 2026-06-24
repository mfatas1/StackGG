import { getPool } from "./db.js";
import { query } from "./db.js";
import { persistMatch } from "./persist.js";
import { refreshAccountRanks } from "./accounts.js";
import { TRACKED_QUEUE_IDS } from "./riot/regions.js";
import { getRiotClient, type RiotClient } from "./riot/client.js";
import type { Queryable } from "./db.js";

const DAY_MS = 86_400_000;

/**
 * Start of the current League ranked year (2026 Season 1 began 2026-01-08). Full
 * backfills go back to here so a profile shows the whole season, not a rolling
 * window. Override with SEASON_START (ISO date) when the new year rolls over.
 */
const SEASON_START = process.env.SEASON_START ?? "2026-01-08";

/** Days from the season start until `now` (min 1), used as the full-backfill depth. */
export function seasonStartDays(now: number = Date.now()): number {
  const start = Date.parse(SEASON_START);
  if (Number.isNaN(start)) return 90;
  return Math.max(1, Math.ceil((now - start) / DAY_MS));
}

export interface BackfillOptions {
  puuid: string;
  platform: string;
  days?: number;
  /** puuids whose participant rows to persist from each fetched match (the crew). */
  trackedPuuids?: Set<string>;
  /** store full match JSON (needed by the in-depth match page for builds/scoreboard). */
  storeRaw?: boolean;
  /** quick mode: only the most recent N matches per queue (single page, no pagination). */
  recentOnlyPerQueue?: number;
  /**
   * incremental mode: page newest-first and stop each queue as soon as a page is
   * entirely already stored — i.e. fetch every new game since the last sync, however
   * many, then stop. `days` is just a safety floor on how far back to look.
   */
  incremental?: boolean;
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
// Overlap per-match HTTP latency. The RiotClient limiter still enforces the global
// rate cap (20/s, 100/2min) — concurrency just stops us waiting on one socket at a time.
const FETCH_CONCURRENCY = 6;

/** Run async work over items with at most `limit` in flight at once. */
async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]!);
    }
  });
  await Promise.all(workers);
}

export async function backfillMember(opts: BackfillOptions): Promise<BackfillResult> {
  const client = opts.client ?? getRiotClient();
  const db = opts.db ?? getPool();
  const days = opts.days ?? 90;
  const now = opts.now ?? Date.now();
  const startTime = now - days * DAY_MS;
  const tracked = opts.trackedPuuids ?? new Set([opts.puuid]);
  const quick = opts.recentOnlyPerQueue;

  // Collect match IDs across the 4 tracked queues in parallel (independent calls).
  const perQueue = await Promise.all(
    TRACKED_QUEUE_IDS.map(async (queue) => {
      const out: string[] = [];
      if (quick) {
        const page = await client.getMatchIds(opts.puuid, opts.platform, { queue, startTime, start: 0, count: quick });
        out.push(...page);
        return out;
      }
      let start = 0;
      for (;;) {
        const page = await client.getMatchIds(opts.puuid, opts.platform, { queue, startTime, start, count: 100 });
        if (!page.length) break;
        if (opts.incremental) {
          // Match IDs come back newest-first. Keep only the ones we don't have; once a
          // whole page is already stored, everything older is too — stop this queue.
          const existing = await query<{ match_id: string }>(
            `SELECT match_id FROM match_participants WHERE puuid = $1 AND match_id = ANY($2)`,
            [opts.puuid, page],
            db,
          );
          const have = new Set(existing.map((r) => r.match_id));
          const fresh = page.filter((id) => !have.has(id));
          out.push(...fresh);
          if (fresh.length === 0) break; // caught up to already-stored history
        } else {
          out.push(...page);
        }
        if (page.length < 100) break;
        start += 100;
      }
      return out;
    }),
  );
  const allIds = [...new Set(perQueue.flat())];

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
  await mapWithConcurrency(toFetch, FETCH_CONCURRENCY, async (id) => {
    const match = await client.getMatch(id, opts.platform);
    const res = await persistMatch(db, match, tracked, { storeRaw: opts.storeRaw });
    fetched++;
    participantsWritten += res.participantsWritten;
  });

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
