import { describe, it, expect } from "vitest";
import { rankBy, deriveStackIdentity, type RecapMemberAgg } from "../src/recap.js";

function member(p: string, over: Partial<RecapMemberAgg> = {}): RecapMemberAgg {
  return {
    puuid: p,
    games: 10,
    wins: 5,
    secondsPlayed: 18000,
    timeDead: 600,
    kills: 50,
    deaths: 50,
    assists: 80,
    avgDeaths: 5,
    pentas: 0,
    outnumbered: 0,
    perfectGames: 0,
    abilityUses: 3000,
    baitKills: 0,
    saves: 0,
    fistBumps: 0,
    heraldDances: 0,
    clutchSurvivals: 0,
    yeets: 0,
    ffGames: 0,
    ff15Games: 0,
    carry: 0.5,
    mvpGames: 0,
    nightGames: 0,
    pings: {
      total: 0, mia: 0, onMyWay: 0, command: 0, danger: 0, needVision: 0, assistMe: 0,
      allIn: 0, basic: 0, getBack: 0, hold: 0, push: 0, visionCleared: 0, enemyVision: 0, bait: 0,
    },
    ...over,
  };
}

describe("rankBy", () => {
  const members = [
    member("a", { deaths: 30 }),
    member("b", { deaths: 90 }),
    member("c", { deaths: 60 }),
  ];

  it("ranks descending (most first)", () => {
    const r = rankBy(members, (m) => m.deaths, "desc");
    expect(r.map((x) => x.puuid)).toEqual(["b", "c", "a"]);
  });

  it("ranks ascending (fewest first)", () => {
    const r = rankBy(members, (m) => m.deaths, "asc");
    expect(r.map((x) => x.puuid)).toEqual(["a", "c", "b"]);
  });

  it("drops null samples (metric not applicable)", () => {
    const r = rankBy(members, (m) => (m.deaths > 50 ? m.deaths : null), "desc");
    expect(r.map((x) => x.puuid)).toEqual(["b", "c"]);
  });
});

describe("deriveStackIdentity", () => {
  const base = {
    games: 100, hours: 100, winrate: 0.5, avgDeaths: 5,
    nightShare: 0, surrenderRate: 0, championVariety: 0.2, pentas: 0,
  };

  it("flags the night crew on a high night share", () => {
    expect(deriveStackIdentity({ ...base, nightShare: 0.5 }).key).toBe("night-crew");
  });

  it("flags tryhards on a high win rate", () => {
    expect(deriveStackIdentity({ ...base, winrate: 0.6 }).key).toBe("tryhards");
  });

  it("flags inting enjoyers when deaths and surrenders are both high", () => {
    expect(deriveStackIdentity({ ...base, avgDeaths: 8, surrenderRate: 0.2 }).key).toBe("inting-enjoyers");
  });

  it("falls back to weekend warriors on an unremarkable group", () => {
    expect(deriveStackIdentity({ ...base, winrate: 0.44 }).key).toBe("weekend-warriors");
  });

  it("calls a dead-even group the coinflip collective", () => {
    expect(deriveStackIdentity({ ...base, winrate: 0.47 }).key).toBe("coinflip");
  });

  it("always returns a name and blurb", () => {
    const id = deriveStackIdentity(base);
    expect(id.name.length).toBeGreaterThan(0);
    expect(id.blurb.length).toBeGreaterThan(0);
  });
});
