import { getPool, getRiotClient, query } from "@crewstats/shared";
import type { CarryStats } from "@/lib/carry";

/**
 * Loads the full lobby for a single game, used by both the /api/match route (for the
 * inline scoreboard) and the standalone /match/[matchId] page (the in-depth view).
 *
 * The full 10-player lobby isn't kept in match_participants — we only persist tracked
 * crew members (CLAUDE.md dedup rule). But matches.raw is a cold-stored copy of the whole
 * Riot payload, so when present we build the lobby from the DB (no Riot request, no key).
 * Only if raw is missing do we fetch live; that path needs a valid dev key.
 */

interface RawParticipant {
  puuid: string;
  participantId: number;
  riotIdGameName?: string;
  riotIdTagline?: string;
  championName: string;
  champLevel?: number;
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
  totalDamageTaken?: number;
  damageSelfMitigated?: number;
  totalHealsOnTeammates?: number;
  totalDamageShieldedOnTeammates?: number;
  timeCCingOthers?: number;
  visionScore?: number;
  wardsPlaced?: number;
  largestKillingSpree?: number;
  largestMultiKill?: number;
  objectivesStolen?: number;
  challenges?: { teamDamagePercentage?: number; soloKills?: number; saveAllyFromDeath?: number; kda?: number };
}
interface RawTeam {
  teamId: number;
  win: boolean;
  objectives?: Record<string, { kills?: number } | undefined>;
}
interface RawInfo {
  queueId: number;
  gameDuration: number;
  gameStartTimestamp?: number;
  gameCreation?: number;
  gameVersion?: string;
  participants: RawParticipant[];
  teams?: RawTeam[];
}

// A lobby player. Extends CarryStats so mvpOf() can score it directly; the UI-required
// fields (damage/gold/cs/visionScore) are narrowed to definite numbers.
export interface MatchPlayer extends CarryStats {
  puuid: string;
  participantId: number; // 1-10 slot — the key-stable join to timeline data (puuids are key-scoped)
  riotId: string;
  tag: string;
  championName: string;
  champLevel: number | null;
  role: string | null;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  gold: number;
  cs: number;
  visionScore: number;
  wardsPlaced: number;
  win: boolean;
  teamId: number;
  subteamId: number | null;
  placement: number | null;
}
export interface TeamSummary {
  teamId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  gold: number;
  champions: number; // kills, from objectives if present
  towers: number;
  dragons: number;
  barons: number;
  heralds: number;
  inhibitors: number;
}
export interface MatchDetailData {
  matchId: string;
  region: string;
  queueId: number;
  gameDuration: number;
  gameStart: string | null;
  patch: string | null;
  players: MatchPlayer[];
  teams: TeamSummary[];
}

function mapPlayers(participants: RawParticipant[]): MatchPlayer[] {
  return participants.map((p) => ({
    puuid: p.puuid,
    participantId: p.participantId,
    riotId: p.riotIdGameName && p.riotIdGameName.length ? p.riotIdGameName : "Player",
    tag: p.riotIdTagline ?? "",
    championName: p.championName,
    champLevel: p.champLevel ?? null,
    role: p.teamPosition || null,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    damage: p.totalDamageDealtToChampions,
    gold: p.goldEarned,
    cs: p.totalMinionsKilled + (p.neutralMinionsKilled ?? 0),
    visionScore: p.visionScore ?? 0,
    wardsPlaced: p.wardsPlaced ?? 0,
    win: p.win,
    teamId: p.teamId,
    subteamId: p.playerSubteamId ?? null,
    placement: p.placement ?? p.subteamPlacement ?? null,
    // CarryStats inputs for the MVP score (undefined, not null, so the type stays CarryStats)
    teamDamagePct: p.challenges?.teamDamagePercentage ?? undefined,
    damageTaken: p.totalDamageTaken ?? 0,
    selfMitigated: p.damageSelfMitigated ?? 0,
    healTeammates: p.totalHealsOnTeammates ?? 0,
    shieldTeammates: p.totalDamageShieldedOnTeammates ?? 0,
    ccTime: p.timeCCingOthers ?? 0,
    killingSpree: p.largestKillingSpree ?? 0,
    multikill: p.largestMultiKill ?? 0,
    soloKills: p.challenges?.soloKills ?? 0,
    objectivesStolen: p.objectivesStolen ?? 0,
    allySaves: p.challenges?.saveAllyFromDeath ?? 0,
  }));
}

// Per-team totals: kills/gold summed from the lobby; objectives from raw.teams when present.
function summarizeTeams(players: MatchPlayer[], rawTeams: RawTeam[] | undefined): TeamSummary[] {
  const ids = [...new Set(players.map((p) => p.teamId))].sort((a, b) => a - b);
  return ids.map((teamId) => {
    const roster = players.filter((p) => p.teamId === teamId);
    const obj = rawTeams?.find((t) => t.teamId === teamId)?.objectives;
    const o = (k: string) => obj?.[k]?.kills ?? 0;
    return {
      teamId,
      win: roster[0]?.win ?? false,
      kills: roster.reduce((s, p) => s + p.kills, 0),
      deaths: roster.reduce((s, p) => s + p.deaths, 0),
      assists: roster.reduce((s, p) => s + p.assists, 0),
      gold: roster.reduce((s, p) => s + p.gold, 0),
      champions: obj ? o("champion") : roster.reduce((s, p) => s + p.kills, 0),
      towers: o("tower"),
      dragons: o("dragon"),
      barons: o("baron"),
      heralds: o("riftHerald"),
      inhibitors: o("inhibitor"),
    };
  });
}

function platformFromMatchId(id: string): string | null {
  const idx = id.indexOf("_");
  if (idx <= 0) return null;
  return id.slice(0, idx).toLowerCase(); // "EUW1_123" -> "euw1"
}

function patchFromVersion(v: string | undefined): string | null {
  if (!v) return null;
  const parts = v.split(".");
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : v;
}

const cache = new Map<string, { at: number; data: MatchDetailData }>();
const TTL = 1000 * 60 * 30;

/** Full lobby + meta for one game, or null if it can't be loaded. */
export async function getMatchDetail(matchId: string): Promise<MatchDetailData | null> {
  const platform = platformFromMatchId(matchId);
  if (!platform) return null;

  const hit = cache.get(matchId);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const build = (info: RawInfo, gameStart: string | null, patch: string | null): MatchDetailData => {
    const players = mapPlayers(info.participants);
    return {
      matchId,
      region: platform,
      queueId: info.queueId,
      gameDuration: info.gameDuration,
      gameStart,
      patch,
      players,
      teams: summarizeTeams(players, info.teams),
    };
  };

  // 1) Prefer the stored raw payload — full lobby, no Riot request.
  try {
    const rows = await query<{ raw: { info?: RawInfo } | null; game_start: string | null; patch: string | null }>(
      `SELECT raw, game_start::text AS game_start, patch FROM matches WHERE match_id = $1`,
      [matchId],
      getPool(),
    );
    const info = rows[0]?.raw?.info;
    if (info?.participants?.length) {
      const data = build(info, rows[0]?.game_start ?? null, rows[0]?.patch ?? patchFromVersion(info.gameVersion));
      cache.set(matchId, { at: Date.now(), data });
      return data;
    }
  } catch {
    // fall through to a live fetch
  }

  // 2) Fall back to a live Riot fetch (needs a valid dev key).
  try {
    const match = await getRiotClient().getMatch(matchId, platform);
    const info = match.info as unknown as RawInfo;
    const gameStart = info.gameStartTimestamp ?? info.gameCreation;
    const data = build(info, gameStart ? new Date(gameStart).toISOString() : null, patchFromVersion(info.gameVersion));
    cache.set(matchId, { at: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}

// monsterSubType (timeline) -> the in-game elemental drake name.
const DRAGON_NAME: Record<string, string> = {
  FIRE_DRAGON: "Infernal",
  WATER_DRAGON: "Ocean",
  EARTH_DRAGON: "Mountain",
  AIR_DRAGON: "Cloud",
  HEXTECH_DRAGON: "Hextech",
  CHEMTECH_DRAGON: "Chemtech",
  ELDER_DRAGON: "Elder",
};

export type MarkerKind = "dragon" | "baron" | "herald" | "grub" | "tower" | "inhibitor" | "ace" | "firstblood" | "kill";
export interface TimelineMarker {
  at: number; // 0..1 fraction of game length
  team: number | null; // 100 (blue) | 200 (red) | null
  kind: MarkerKind;
  label: string;
}
export interface GoldFrame {
  min: number; // minute
  goldDiff: number; // blue total gold − red
  xpDiff: number; // blue total xp − red
}
export interface TeamObjectives {
  barons: number;
  heralds: number;
  towers: number;
  grubs: number;
}
export interface MatchTimeline {
  dragonsByTeam: Record<number, string[]>; // ordered drakes per team (for the header)
  // Per-team objective counts derived from the timeline. We use these instead of the
  // match payload's teams[].objectives because that block is dropped on the live-fetch
  // path (the MatchDto zod schema doesn't parse `teams`) — so on matches without stored
  // raw, baron/herald/tower counts would otherwise read 0.
  objectivesByTeam: Record<number, TeamObjectives>;
  gold: GoldFrame[]; // per-minute blue−red gold/xp advantage
  markers: TimelineMarker[]; // kills + objectives + buildings + aces, time-positioned
  // Reconstructed final inventory, keyed by participant SLOT (1-10), not puuid — the
  // timeline comes back under the current Riot key, whose puuids differ from the stored
  // match's (key-scoped), but the 1-10 slots line up across both.
  itemsByParticipant: Record<number, number[]>;
}

const teamOf = (id?: number) => (id && id <= 5 ? 100 : id ? 200 : null);
const EMPTY_TL: MatchTimeline = { dragonsByTeam: {}, objectivesByTeam: {}, gold: [], markers: [], itemsByParticipant: {} };
const tlCache = new Map<string, { at: number; data: MatchTimeline }>();

/**
 * Everything we surface on the in-depth page that match-v5 participant data can't give —
 * drake types, the gold/xp advantage curve, the kill/objective timeline, and item builds.
 * All parsed from a SINGLE timeline payload, fetched live ONLY here and never stored (see
 * CLAUDE.md rule #4 — timelines stay out of ingestion; this human-triggered call is the
 * exception). Best-effort: returns empties if the timeline can't be loaded.
 */
export async function getMatchTimeline(matchId: string): Promise<MatchTimeline> {
  const platform = platformFromMatchId(matchId);
  if (!platform) return EMPTY_TL;

  const hit = tlCache.get(matchId);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  try {
    const tl = await getRiotClient().getMatchTimeline(matchId, platform);
    const frames = tl.info?.frames ?? [];
    const totalMs = Math.max(1, frames[frames.length - 1]?.timestamp ?? 0);

    const dragonsByTeam: Record<number, string[]> = {};
    const gold: GoldFrame[] = [];
    const markers: TimelineMarker[] = [];
    const inv = new Map<number, number[]>(); // participantId -> running inventory

    const drop = (pid: number | undefined, item: number | undefined) => {
      if (!pid || !item) return;
      const list = inv.get(pid);
      if (!list) return;
      const i = list.lastIndexOf(item);
      if (i >= 0) list.splice(i, 1);
    };

    for (const frame of frames) {
      // Per-minute gold/xp advantage (blue − red).
      const pf = frame.participantFrames;
      if (pf) {
        let bg = 0,
          rg = 0,
          bx = 0,
          rx = 0;
        for (const [k, v] of Object.entries(pf)) {
          const blue = Number(k) <= 5;
          bg += blue ? v.totalGold ?? 0 : 0;
          rg += blue ? 0 : v.totalGold ?? 0;
          bx += blue ? v.xp ?? 0 : 0;
          rx += blue ? 0 : v.xp ?? 0;
        }
        gold.push({ min: Math.round((frame.timestamp ?? 0) / 60000), goldDiff: bg - rg, xpDiff: bx - rx });
      }

      for (const e of frame.events ?? []) {
        const at = Math.min(1, Math.max(0, (e.timestamp ?? 0) / totalMs));
        switch (e.type) {
          case "ITEM_PURCHASED":
            if (e.participantId) (inv.get(e.participantId) ?? inv.set(e.participantId, []).get(e.participantId)!).push(e.itemId!);
            break;
          case "ITEM_SOLD":
          case "ITEM_DESTROYED":
            drop(e.participantId, e.itemId);
            break;
          case "ITEM_UNDO":
            drop(e.participantId, e.beforeId); // undo a buy
            if (e.afterId && e.participantId) inv.get(e.participantId)?.push(e.afterId); // undo a sell
            break;
          case "ELITE_MONSTER_KILL": {
            const team = e.killerTeamId ?? teamOf(e.killerId);
            if (e.monsterType === "DRAGON") {
              const name = e.monsterSubType ? DRAGON_NAME[e.monsterSubType] : undefined;
              if (team && name) (dragonsByTeam[team] ??= []).push(name);
              markers.push({ at, team, kind: "dragon", label: name ?? "Drake" });
            } else if (e.monsterType === "BARON_NASHOR") markers.push({ at, team, kind: "baron", label: "Baron" });
            else if (e.monsterType === "RIFTHERALD") markers.push({ at, team, kind: "herald", label: "Rift Herald" });
            else if (e.monsterType === "HORDE") markers.push({ at, team, kind: "grub", label: "Void Grub" });
            break;
          }
          case "BUILDING_KILL": {
            const team = e.killerId ? teamOf(e.killerId) : e.teamId === 100 ? 200 : 100; // destroyer side
            const inhib = e.buildingType === "INHIBITOR_BUILDING";
            markers.push({ at, team, kind: inhib ? "inhibitor" : "tower", label: inhib ? "Inhibitor" : "Tower" });
            break;
          }
          case "CHAMPION_SPECIAL_KILL":
            if (e.killType === "KILL_ACE") markers.push({ at, team: teamOf(e.killerId), kind: "ace", label: "Ace" });
            else if (e.killType === "KILL_FIRST_BLOOD") markers.push({ at, team: teamOf(e.killerId), kind: "firstblood", label: "First blood" });
            break;
          case "CHAMPION_KILL":
            markers.push({ at, team: teamOf(e.killerId), kind: "kill", label: "Kill" });
            break;
        }
      }
    }

    const itemsByParticipant: Record<number, number[]> = {};
    for (const [pid, list] of inv) itemsByParticipant[pid] = list;

    // Per-team objective tallies from the markers (key-independent, raw-independent).
    const objectivesByTeam: Record<number, TeamObjectives> = {};
    for (const m of markers) {
      if (m.team == null) continue;
      const o = (objectivesByTeam[m.team] ??= { barons: 0, heralds: 0, towers: 0, grubs: 0 });
      if (m.kind === "baron") o.barons++;
      else if (m.kind === "herald") o.heralds++;
      else if (m.kind === "tower") o.towers++;
      else if (m.kind === "grub") o.grubs++;
    }

    const data: MatchTimeline = { dragonsByTeam, objectivesByTeam, gold, markers, itemsByParticipant };
    tlCache.set(matchId, { at: Date.now(), data });
    return data;
  } catch {
    return EMPTY_TL;
  }
}
