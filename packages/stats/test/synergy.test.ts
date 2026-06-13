import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closePool } from "@crewstats/shared";
import { getDuoSynergies, getFlexRoles } from "../src/synergy.js";
import { getLeaderboard } from "../src/crew.js";
import { resetDb, insertAccount, insertMatch } from "./helpers.js";

const A = "p-a";
const B = "p-b";
const C = "p-c";
const crew = [A, B, C];

/**
 * Controlled flex dataset (hand-computed expectations):
 *  M1: A,B team100 WIN   | C team200 LOSS
 *  M2: A,B team100 LOSS  | C team200 WIN
 *  M3: A,B team100 WIN   | C team200 LOSS
 *  M4: A   team100 WIN   | C team200 LOSS   (no B)
 *  M5 (arena): A,B subteam3 place1 | C subteam5 place4
 */
beforeAll(async () => {
  await resetDb();
  await insertAccount(A, "Alpha");
  await insertAccount(B, "Bravo");
  await insertAccount(C, "Charlie");

  const flex = 440;
  await insertMatch("M1", flex, [
    { puuid: A, teamId: 100, win: true, role: "JUNGLE" },
    { puuid: B, teamId: 100, win: true, role: "MIDDLE" },
    { puuid: C, teamId: 200, win: false, role: "TOP" },
  ]);
  await insertMatch("M2", flex, [
    { puuid: A, teamId: 100, win: false, role: "JUNGLE" },
    { puuid: B, teamId: 100, win: false, role: "MIDDLE" },
    { puuid: C, teamId: 200, win: true, role: "TOP" },
  ]);
  await insertMatch("M3", flex, [
    { puuid: A, teamId: 100, win: true, role: "JUNGLE" },
    { puuid: B, teamId: 100, win: true, role: "MIDDLE" },
    { puuid: C, teamId: 200, win: false, role: "TOP" },
  ]);
  await insertMatch("M4", flex, [
    { puuid: A, teamId: 100, win: true, role: "JUNGLE" },
    { puuid: C, teamId: 200, win: false, role: "TOP" },
  ]);
  await insertMatch("M5", 1700, [
    { puuid: A, teamId: 100, win: true, subteamId: 3, placement: 1 },
    { puuid: B, teamId: 100, win: true, subteamId: 3, placement: 1 },
    { puuid: C, teamId: 200, win: false, subteamId: 5, placement: 4 },
  ]);
});
afterAll(async () => {
  await closePool();
});

describe("duo synergy", () => {
  it("A+B: 3 flex games together, 2 wins, winrate 2/3; A apart 1.0, B apart null", async () => {
    const duos = await getDuoSynergies(pool(crew), crew, "flex", 3);
    const ab = duos.find((d) => d.a.puuid === A && d.b.puuid === B)!;
    expect(ab).toBeDefined();
    expect(ab.games).toBe(3);
    expect(ab.wins).toBe(2);
    expect(ab.winrate).toBeCloseTo(2 / 3, 4);
    expect(ab.aWinrateApart).toBeCloseTo(1.0, 4); // A's M4 win without B
    expect(ab.bWinrateApart).toBeNull(); // B never played flex without A
  });

  it("hides pairs below the min sample size", async () => {
    const duos = await getDuoSynergies(pool(crew), crew, "flex", 5);
    expect(duos.length).toBe(0);
  });

  it("arena duo counts same-subteam games", async () => {
    const duos = await getDuoSynergies(pool(crew), crew, "arena", 1);
    const ab = duos.find((d) => d.a.puuid === A && d.b.puuid === B)!;
    expect(ab.games).toBe(1);
    expect(ab.wins).toBe(1);
  });
});

describe("flex roles", () => {
  it("A jungled 4 flex games, 3 wins", async () => {
    const roles = await getFlexRoles(pool(crew), crew);
    const aj = roles.find((r) => r.identity.puuid === A && r.role === "JUNGLE")!;
    expect(aj.games).toBe(4);
    expect(aj.wins).toBe(3);
    expect(aj.winrate).toBeCloseTo(0.75, 4);
  });
});

describe("leaderboard (flex)", () => {
  it("ranks A > B > C by winrate, with vs-crew-average", async () => {
    const lb = await getLeaderboard(pool(crew), crew, "flex");
    expect(lb.map((e) => e.identity.puuid)).toEqual([A, B, C]);
    const a = lb[0]!;
    expect(a.games).toBe(4);
    expect(a.wins).toBe(3);
    expect(a.winrate).toBeCloseTo(0.75, 4);
    // pooled crew wr = 6/11 = 0.5454...; A diff ~ +0.2045
    expect(a.vsCrewAvgWinrate).toBeCloseTo(0.75 - 6 / 11, 3);
    expect(a.form.length).toBe(4);
  });
});

// All stats functions accept a Queryable; pass the shared pool.
import { getPool } from "@crewstats/shared";
function pool(_crew: string[]) {
  return getPool();
}
