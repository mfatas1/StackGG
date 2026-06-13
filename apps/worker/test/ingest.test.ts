import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RiotClient, getPool, closePool } from "@crewstats/shared";
import { loadFixtureMatch, loadCrewManifest } from "@crewstats/shared/fixtures";
import { backfillMember } from "../src/ingest.js";

const manifest = loadCrewManifest();
const mateo = manifest.find((m) => m.riotId === "StackMember1")!;
const allPuuids = new Set(manifest.map((m) => m.puuid));

// Map queue -> fixture, and matchId -> fixture, served by the mock.
const FIXTURES = {
  420: loadFixtureMatch("ranked_solo"),
  440: loadFixtureMatch("ranked_flex"),
  450: loadFixtureMatch("aram"),
  1700: loadFixtureMatch("arena"),
} as const;
const byId = new Map(Object.values(FIXTURES).map((m) => [m.metadata.matchId, m]));
// queue -> set of puuids who actually played in that fixture (realistic match lists)
const fixturePuuids = new Map<number, Set<string>>(
  Object.entries(FIXTURES).map(([q, m]) => [Number(q), new Set(m.info.participants.map((p) => p.puuid))]),
);

function mockFetch(): typeof fetch {
  return (async (url: string) => {
    const u = String(url);
    const ok = (data: unknown) =>
      ({ ok: true, status: 200, headers: { get: () => null }, json: async () => data }) as unknown as Response;

    const idsMatch = u.match(/\/matches\/by-puuid\/([^/]+)\/ids\?(.*)$/);
    if (idsMatch) {
      const puuid = decodeURIComponent(idsMatch[1]!);
      const params = new URLSearchParams(idsMatch[2]);
      const queue = Number(params.get("queue"));
      const start = Number(params.get("start") ?? "0");
      const fixture = FIXTURES[queue as keyof typeof FIXTURES];
      if (start > 0) return ok([]); // single page, no pagination
      if (fixture && fixturePuuids.get(queue)?.has(puuid)) return ok([fixture.metadata.matchId]);
      return ok([]);
    }
    const matchMatch = u.match(/\/matches\/([^/?]+)$/);
    if (matchMatch) {
      const fixture = byId.get(decodeURIComponent(matchMatch[1]!));
      if (fixture) return ok(fixture);
    }
    return { ok: false, status: 404, headers: { get: () => null }, json: async () => ({}) } as unknown as Response;
  }) as unknown as typeof fetch;
}

describe("backfillMember (mocked Riot HTTP -> DB rows)", () => {
  beforeAll(async () => {
    await getPool().query(`TRUNCATE match_participants, matches, riot_accounts RESTART IDENTITY CASCADE`);
    // accounts needed only for the last_backfilled UPDATE no-op; insert mateo + purple.
    for (const m of manifest) {
      await getPool().query(
        `INSERT INTO riot_accounts (puuid, riot_id, tag, region) VALUES ($1,$2,$3,'euw1')
         ON CONFLICT (puuid) DO NOTHING`,
        [m.puuid, m.riotId, m.tag],
      );
    }
  });
  afterAll(async () => {
    await closePool();
  });

  it("fetches one match per queue, dedups shared games, writes tracked rows", async () => {
    const client = new RiotClient({ fetchImpl: mockFetch(), disableRateLimit: true });
    const res = await backfillMember({
      puuid: mateo.puuid,
      platform: "euw1",
      days: 3650,
      trackedPuuids: allPuuids,
      client,
    });

    // Mateo played solo(420), flex(440), arena(1700) in the fixtures — not ARAM.
    expect(res.candidateMatchIds).toBe(3);
    expect(res.fetched).toBe(3);

    const matches = await getPool().query(`SELECT count(*)::int AS c FROM matches`);
    expect(matches.rows[0].c).toBe(3);

    const mine = await getPool().query(`SELECT count(*)::int AS c FROM match_participants WHERE puuid = $1`, [mateo.puuid]);
    expect(mine.rows[0].c).toBe(3);

    // Arena fixture has StackMember2 on mateo's subteam — also tracked -> stored
    // from the single arena fetch (dedup benefit).
    const purple = manifest.find((m) => m.riotId === "StackMember2")!;
    const purpleArena = await getPool().query(
      `SELECT subteam_id FROM match_participants WHERE puuid = $1 AND subteam_id IS NOT NULL`,
      [purple.puuid],
    );
    expect(purpleArena.rows.length).toBeGreaterThanOrEqual(1);

    // Arena rows carry subteam + placement.
    const arena = await getPool().query(
      `SELECT count(*)::int AS c FROM match_participants WHERE subteam_id IS NOT NULL`,
    );
    expect(arena.rows[0].c).toBeGreaterThanOrEqual(2);
  });

  it("is idempotent: a second backfill fetches nothing new", async () => {
    const client = new RiotClient({ fetchImpl: mockFetch(), disableRateLimit: true });
    const res = await backfillMember({
      puuid: mateo.puuid,
      platform: "euw1",
      days: 3650,
      trackedPuuids: allPuuids,
      client,
    });
    expect(res.fetched).toBe(0);
  });
});
