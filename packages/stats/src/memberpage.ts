import { type Queryable } from "@crewstats/shared";
import type { CrewMemberPage, DuoSynergy } from "@crewstats/shared";
import { getIdentity, getPlayerModes, getRanks } from "./modes.js";
import { getCrewMemberPuuids, getCrewSummary } from "./crew.js";
import { getDuoSynergies } from "./synergy.js";

/** Overall winrate / kda / vision for a player, used for crew percentiles. */
function aggregateStats(modes: Awaited<ReturnType<typeof getPlayerModes>>) {
  let games = 0;
  let wins = 0;
  let k = 0;
  let d = 0;
  let a = 0;
  for (const m of modes) {
    games += m.games;
    wins += m.wins;
    k += m.avgKills * m.games;
    d += m.avgDeaths * m.games;
    a += m.avgAssists * m.games;
  }
  return {
    games,
    winrate: games ? wins / games : 0,
    kda: d === 0 ? k + a : (k + a) / d,
  };
}

function percentileOf(value: number, all: number[]): number {
  if (all.length <= 1) return 100;
  const below = all.filter((v) => v < value).length;
  return Math.round((below / (all.length - 1)) * 100);
}

/** Crew member page: stats contextualized against the crew (PLAN §5.5). */
export async function getCrewMemberPage(
  client: Queryable,
  crewId: string,
  puuid: string,
): Promise<CrewMemberPage | null> {
  const crew = await getCrewSummary(client, crewId);
  if (!crew) return null;
  const identity = await getIdentity(client, puuid);
  if (!identity) return null;

  const [modes, ranks] = await Promise.all([getPlayerModes(client, puuid), getRanks(client, puuid)]);

  // Compute the same aggregate for every crew member for percentile ranking.
  const memberPuuids = await getCrewMemberPuuids(client, crewId);
  const crewAgg: { puuid: string; winrate: number; kda: number }[] = [];
  for (const p of memberPuuids) {
    const m = await getPlayerModes(client, p);
    const agg = aggregateStats(m);
    if (agg.games > 0) crewAgg.push({ puuid: p, winrate: agg.winrate, kda: agg.kda });
  }
  const mine = crewAgg.find((c) => c.puuid === puuid);

  const percentiles: CrewMemberPage["percentiles"] = [];
  if (mine) {
    percentiles.push({
      stat: "Win rate",
      value: mine.winrate,
      percentile: percentileOf(mine.winrate, crewAgg.map((c) => c.winrate)),
    });
    percentiles.push({
      stat: "KDA",
      value: mine.kda,
      percentile: percentileOf(mine.kda, crewAgg.map((c) => c.kda)),
    });
  }

  // Partner compatibility: this member's synergies, best -> worst.
  const allSynergies = await getDuoSynergies(client, memberPuuids, "all", 1);
  const partnerCompatibility: DuoSynergy[] = allSynergies
    .filter((s) => s.a.puuid === puuid || s.b.puuid === puuid)
    .sort((x, y) => (y.winrate ?? 0) - (x.winrate ?? 0));

  return {
    crew,
    identity,
    rankSolo: ranks.solo,
    rankFlex: ranks.flex,
    modes,
    percentiles,
    partnerCompatibility,
  };
}
