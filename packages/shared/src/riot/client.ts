import { getPool, type Queryable } from "../db.js";
import { riotKey } from "../env.js";
import { regionalRouteFor } from "./regions.js";
import {
  AccountDtoSchema,
  SummonerDtoSchema,
  LeagueEntriesSchema,
  MatchIdsSchema,
  MatchDtoSchema,
  type AccountDto,
  type SummonerDto,
  type LeagueEntryDto,
  type MatchDto,
} from "./types.js";

/**
 * The single shared Riot API client (PLAN hard rule #2). Every Riot call in the
 * entire system goes through here. Rate limiting is enforced through a Postgres
 * coordination table so the limit is GLOBAL across the web and worker processes,
 * not per-process — two in-memory token buckets would silently double the rate
 * and risk a key blacklist.
 *
 * Personal key limits: 20 req/s and 100 req/2min. We stay one under each.
 */

const PER_SECOND = 20;
const PER_TWO_MIN = 100;
const ADVISORY_LOCK_KEY = 778899; // arbitrary, dedicated to the rate limiter

export class RiotApiError extends Error {
  constructor(
    public status: number,
    public endpoint: string,
    message?: string,
  ) {
    // Never include the key or full headers in the message.
    super(message ?? `Riot API ${status} on ${endpoint}`);
    this.name = "RiotApiError";
  }
}

export interface RiotClientOptions {
  /** Override the fetch implementation (used by tests to mock HTTP). */
  fetchImpl?: typeof fetch;
  /** Queryable used for the rate-limit coordination table. Defaults to the pool. */
  db?: Queryable;
  /** Disable DB-backed limiter (tests with empty/in-memory limiter). */
  disableRateLimit?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

export class RiotClient {
  private readonly fetchImpl: typeof fetch;
  private readonly db: Queryable;
  private readonly disableRateLimit: boolean;

  constructor(opts: RiotClientOptions = {}) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.db = opts.db ?? getPool();
    this.disableRateLimit = opts.disableRateLimit ?? false;
  }

  /**
   * Block until a request slot is available under both windows, then record the
   * call. Uses a transaction-scoped advisory lock so concurrent processes
   * serialize the check-and-insert; sleeping happens outside the lock.
   */
  private async acquireSlot(): Promise<void> {
    if (this.disableRateLimit) return;
    // We need a dedicated client to hold the advisory xact lock; use the pool.
    const pool = getPool();
    for (let attempt = 0; attempt < 10000; attempt++) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1)", [ADVISORY_LOCK_KEY]);
        const { rows } = await client.query<{ c1: string; c2: string; wait_ms: string }>(
          `WITH w AS (
             SELECT
               count(*) FILTER (WHERE called_at > now() - interval '1 second')   AS c1,
               count(*) FILTER (WHERE called_at > now() - interval '120 seconds') AS c2,
               min(called_at) FILTER (WHERE called_at > now() - interval '1 second')   AS oldest_1s,
               min(called_at) FILTER (WHERE called_at > now() - interval '120 seconds') AS oldest_2m
             FROM riot_request_log
           )
           SELECT c1, c2,
             GREATEST(
               CASE WHEN c1 >= $1 THEN EXTRACT(EPOCH FROM (oldest_1s + interval '1 second'  - now())) * 1000 ELSE 0 END,
               CASE WHEN c2 >= $2 THEN EXTRACT(EPOCH FROM (oldest_2m + interval '120 seconds' - now())) * 1000 ELSE 0 END
             )::bigint AS wait_ms
           FROM w`,
          [PER_SECOND, PER_TWO_MIN],
        );
        const c1 = Number(rows[0]?.c1 ?? 0);
        const c2 = Number(rows[0]?.c2 ?? 0);
        const waitMs = Number(rows[0]?.wait_ms ?? 0);

        if (c1 < PER_SECOND && c2 < PER_TWO_MIN) {
          await client.query("INSERT INTO riot_request_log DEFAULT VALUES");
          // Opportunistic cleanup of rows outside both windows.
          await client.query("DELETE FROM riot_request_log WHERE called_at < now() - interval '3 minutes'");
          await client.query("COMMIT");
          return;
        }
        await client.query("COMMIT");
        await sleep(Math.min(Math.max(waitMs + 5, 15), 2000));
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        throw err;
      } finally {
        client.release();
      }
    }
    throw new Error("RiotClient.acquireSlot: exceeded retry budget");
  }

  /** Core request with rate limiting + 429/5xx retry honoring Retry-After. */
  private async request(host: string, path: string): Promise<unknown> {
    const url = `https://${host}.api.riotgames.com${path}`;
    const maxRetries = 5;
    for (let attempt = 0; ; attempt++) {
      await this.acquireSlot();
      const res = await this.fetchImpl(url, { headers: { "X-Riot-Token": riotKey() } });

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after") ?? "1");
        if (attempt >= maxRetries) throw new RiotApiError(429, path, "rate limited (exhausted retries)");
        await sleep((Number.isFinite(retryAfter) ? retryAfter : 1) * 1000 + 250);
        continue;
      }
      if (res.status >= 500 && res.status < 600) {
        if (attempt >= maxRetries) throw new RiotApiError(res.status, path, "Riot 5xx (exhausted retries)");
        await sleep(Math.min(2 ** attempt * 500, 8000));
        continue;
      }
      if (res.status === 404) {
        throw new RiotApiError(404, path, "not found");
      }
      if (!res.ok) {
        throw new RiotApiError(res.status, path);
      }
      return res.json();
    }
  }

  // ---- Endpoints (PLAN §7) ----

  async getAccountByRiotId(name: string, tag: string, platform: string): Promise<AccountDto> {
    const route = regionalRouteFor(platform);
    const json = await this.request(
      route,
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
    );
    return AccountDtoSchema.parse(json);
  }

  async getAccountByPuuid(puuid: string, platform: string): Promise<AccountDto> {
    const route = regionalRouteFor(platform);
    const json = await this.request(route, `/riot/account/v1/accounts/by-puuid/${encodeURIComponent(puuid)}`);
    return AccountDtoSchema.parse(json);
  }

  async getSummonerByPuuid(puuid: string, platform: string): Promise<SummonerDto> {
    const json = await this.request(platform, `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`);
    return SummonerDtoSchema.parse(json);
  }

  /** League entries (ranked solo + flex tier/LP). Uses the by-puuid route. */
  async getLeagueEntriesByPuuid(puuid: string, platform: string): Promise<LeagueEntryDto[]> {
    const json = await this.request(platform, `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`);
    return LeagueEntriesSchema.parse(json);
  }

  async getLeagueEntriesBySummoner(summonerId: string, platform: string): Promise<LeagueEntryDto[]> {
    const json = await this.request(platform, `/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerId)}`);
    return LeagueEntriesSchema.parse(json);
  }

  /** Match ID page for a puuid. Optionally filter by queue and start time (ms epoch). */
  async getMatchIds(
    puuid: string,
    platform: string,
    opts: { queue?: number; startTime?: number; endTime?: number; start?: number; count?: number } = {},
  ): Promise<string[]> {
    const route = regionalRouteFor(platform);
    const params = new URLSearchParams();
    if (opts.queue != null) params.set("queue", String(opts.queue));
    if (opts.startTime != null) params.set("startTime", String(Math.floor(opts.startTime / 1000)));
    if (opts.endTime != null) params.set("endTime", String(Math.floor(opts.endTime / 1000)));
    params.set("start", String(opts.start ?? 0));
    params.set("count", String(opts.count ?? 100));
    const json = await this.request(
      route,
      `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?${params.toString()}`,
    );
    return MatchIdsSchema.parse(json);
  }

  async getMatch(matchId: string, platform: string): Promise<MatchDto> {
    const route = regionalRouteFor(platform);
    const json = await this.request(route, `/lol/match/v5/matches/${encodeURIComponent(matchId)}`);
    return MatchDtoSchema.parse(json);
  }
}

let shared: RiotClient | null = null;
/** The process-wide client. All callers should use this. */
export function getRiotClient(): RiotClient {
  if (!shared) shared = new RiotClient();
  return shared;
}
