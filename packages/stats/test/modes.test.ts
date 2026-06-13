import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closePool, persistMatch, getPool } from "@crewstats/shared";
import { loadFixtureMatch, loadCrewManifest } from "@crewstats/shared/fixtures";
import { getModeStats, getRecentForm } from "../src/modes.js";
import { resetDb } from "./helpers.js";

const mateo = loadCrewManifest().find((m) => m.riotId === "StackMember1")!;

describe("getModeStats (real fixture, hand-computed)", () => {
  beforeAll(async () => {
    await resetDb();
    // Seed each fixture as a full lobby.
    for (const name of ["ranked_solo", "ranked_flex", "arena", "aram"]) {
      await persistMatch(getPool(), loadFixtureMatch(name), null);
    }
  });
  afterAll(async () => {
    await closePool();
  });

  it("ranked solo: Mateo went Galio 2/9/3 in a loss", async () => {
    const s = await getModeStats(getPool(), mateo.puuid, 420);
    expect(s.games).toBe(1);
    expect(s.wins).toBe(0);
    expect(s.losses).toBe(1);
    expect(s.winrate).toBe(0);
    expect(s.avgKills).toBe(2);
    expect(s.avgDeaths).toBe(9);
    expect(s.avgAssists).toBe(3);
    // KDA = (2+3)/9 = 0.5556 -> rounded 0.56
    expect(s.kda).toBeCloseTo(0.56, 2);
    expect(s.topChampions[0]).toMatchObject({ championName: "Galio", games: 1, wins: 0 });
    expect(s.avgPlacement).toBeNull();
  });

  it("flex: Mateo went Draven 13/9/6 in a loss", async () => {
    const s = await getModeStats(getPool(), mateo.puuid, 440);
    expect(s.games).toBe(1);
    expect(s.wins).toBe(0);
    expect(s.avgKills).toBe(13);
    expect(s.kda).toBeCloseTo((13 + 6) / 9, 2);
  });

  it("arena: Mateo placed 4th on Yasuo (avgPlacement present, no winrate emphasis)", async () => {
    const s = await getModeStats(getPool(), mateo.puuid, 1700);
    expect(s.games).toBe(1);
    expect(s.avgPlacement).toBe(4);
    expect(s.topChampions[0]?.championName).toBe("Yasuo");
  });

  it("recent form returns most-recent-first W/L", async () => {
    const form = await getRecentForm(getPool(), mateo.puuid, 10);
    expect(form.length).toBeGreaterThanOrEqual(1);
    expect(form.every((f) => f === "W" || f === "L")).toBe(true);
  });
});
