import { NextResponse } from "next/server";
import { getPool, getRiotClient, RiotApiError, query } from "@crewstats/shared";

export const dynamic = "force-dynamic";

// The full lobby (all 10 players) isn't kept in match_participants — we only store
// tracked crew members (CLAUDE.md dedup rule). But matches.raw is a cold-stored copy
// of the whole match payload, so when present we build the lobby straight from the DB
// (no Riot request, no API key needed). Only if raw is missing do we fetch from Riot;
// that path needs a valid dev key and falls back gracefully on the client.
const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 1000 * 60 * 30;

interface RawParticipant {
  puuid: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  championName: string;
  teamPosition?: string;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  goldEarned: number;
  totalMinionsKilled: number;
  neutralMinionsKilled?: number;
  win: boolean;
  teamId: number;
  playerSubteamId?: number;
  placement?: number;
  subteamPlacement?: number;
  // rich stats for the carry/MVP score
  totalDamageTaken?: number;
  damageSelfMitigated?: number;
  totalHealsOnTeammates?: number;
  totalDamageShieldedOnTeammates?: number;
  timeCCingOthers?: number;
  visionScore?: number;
  largestKillingSpree?: number;
  largestMultiKill?: number;
  objectivesStolen?: number;
  challenges?: { teamDamagePercentage?: number; soloKills?: number; saveAllyFromDeath?: number };
}
interface RawInfo {
  queueId: number;
  gameDuration: number;
  participants: RawParticipant[];
}

function mapPlayers(participants: RawParticipant[]) {
  return participants.map((p) => ({
    puuid: p.puuid,
    riotId: p.riotIdGameName && p.riotIdGameName.length ? p.riotIdGameName : "Player",
    tag: p.riotIdTagline ?? "",
    championName: p.championName,
    role: p.teamPosition || null,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    damage: p.totalDamageDealtToChampions,
    gold: p.goldEarned,
    cs: p.totalMinionsKilled + (p.neutralMinionsKilled ?? 0),
    win: p.win,
    teamId: p.teamId,
    subteamId: p.playerSubteamId ?? null,
    placement: p.placement ?? p.subteamPlacement ?? null,
    // rich carry-score inputs
    teamDamagePct: p.challenges?.teamDamagePercentage ?? null,
    damageTaken: p.totalDamageTaken ?? 0,
    selfMitigated: p.damageSelfMitigated ?? 0,
    healTeammates: p.totalHealsOnTeammates ?? 0,
    shieldTeammates: p.totalDamageShieldedOnTeammates ?? 0,
    ccTime: p.timeCCingOthers ?? 0,
    visionScore: p.visionScore ?? 0,
    killingSpree: p.largestKillingSpree ?? 0,
    multikill: p.largestMultiKill ?? 0,
    soloKills: p.challenges?.soloKills ?? 0,
    objectivesStolen: p.objectivesStolen ?? 0,
    allySaves: p.challenges?.saveAllyFromDeath ?? 0,
  }));
}

function platformFromMatchId(id: string): string | null {
  const idx = id.indexOf("_");
  if (idx <= 0) return null;
  return id.slice(0, idx).toLowerCase(); // "EUW1_123" -> "euw1"
}

export async function GET(_req: Request, ctx: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await ctx.params;
  const platform = platformFromMatchId(matchId);
  if (!platform) return NextResponse.json({ error: "Bad match id." }, { status: 400 });

  const hit = cache.get(matchId);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.data);

  // 1) Prefer the stored raw payload — full lobby, no Riot request.
  try {
    const rows = await query<{ raw: { info?: RawInfo } | null }>(
      `SELECT raw FROM matches WHERE match_id = $1`,
      [matchId],
      getPool(),
    );
    const info = rows[0]?.raw?.info;
    if (info?.participants?.length) {
      const data = { matchId, region: platform, queueId: info.queueId, gameDuration: info.gameDuration, players: mapPlayers(info.participants) };
      cache.set(matchId, { at: Date.now(), data });
      return NextResponse.json(data);
    }
  } catch {
    // fall through to a live fetch
  }

  // 2) Fall back to a live Riot fetch (needs a valid dev key).
  try {
    const match = await getRiotClient().getMatch(matchId, platform);
    const info = match.info as unknown as RawInfo;
    const data = { matchId, region: platform, queueId: info.queueId, gameDuration: info.gameDuration, players: mapPlayers(info.participants) };
    cache.set(matchId, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch (err) {
    const status = err instanceof RiotApiError ? (err.status === 404 ? 404 : 502) : 500;
    return NextResponse.json({ error: "Full game data unavailable." }, { status });
  }
}
