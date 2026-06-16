import { query, type Queryable, QUEUES } from "@crewstats/shared";
import type { MatchHistoryItem } from "@crewstats/shared";
import { queueIdsForSlug, slugForQueueId, NOT_REMAKE_SQL } from "./util.js";
import type { QueueSlug } from "@crewstats/shared";

// Canonical lane → the role strings that map to it (Riot uses TOP/JUNGLE/MIDDLE/
// BOTTOM/UTILITY; we accept common aliases defensively).
const ROLE_ALIASES: Record<string, string[]> = {
  TOP: ["TOP"],
  JUNGLE: ["JUNGLE"],
  MIDDLE: ["MIDDLE", "MID"],
  BOTTOM: ["BOTTOM", "BOT", "ADC"],
  UTILITY: ["UTILITY", "SUPPORT", "SUP"],
};
// Reverse: any raw role string (uppercased) → its canonical lane key.
const ALIAS_TO_CANON: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_ALIASES).flatMap(([canon, aliases]) => aliases.map((a) => [a, canon])),
);

/** Canonical lanes the player actually played a given champion in (for the current
 *  queue filter) — used to gray out impossible lane filters while a champ is selected. */
export async function getChampionLanes(
  client: Queryable,
  puuid: string,
  championId: number,
  opts: { slug?: QueueSlug } = {},
): Promise<string[]> {
  const queueIds = opts.slug ? queueIdsForSlug(opts.slug) : null;
  const params: unknown[] = [puuid, championId];
  let where = `mp.puuid = $1 AND mp.champion_id = $2 AND ${NOT_REMAKE_SQL} AND mp.role IS NOT NULL AND mp.role <> ''`;
  if (queueIds) {
    where += ` AND m.queue_id = ANY($3::int[])`;
    params.push(queueIds);
  }
  const rows = await query<{ role: string }>(
    `SELECT DISTINCT upper(mp.role) AS role
       FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id
      WHERE ${where}`,
    params,
    client,
  );
  const out = new Set<string>();
  for (const r of rows) {
    const canon = ALIAS_TO_CANON[r.role];
    if (canon) out.add(canon);
  }
  return [...out];
}

/** Queue slugs the player actually played a given champion in — used to drop the champ
 *  filter when switching to a queue where that champ has no games. */
export async function getChampionQueues(client: Queryable, puuid: string, championId: number): Promise<QueueSlug[]> {
  const rows = await query<{ queue_id: number }>(
    `SELECT DISTINCT m.queue_id
       FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id
      WHERE mp.puuid = $1 AND mp.champion_id = $2 AND ${NOT_REMAKE_SQL}`,
    [puuid, championId],
    client,
  );
  const out = new Set<QueueSlug>();
  for (const r of rows) {
    const s = slugForQueueId(r.queue_id);
    if (s !== "all") out.add(s);
  }
  return [...out];
}

/** Aggregate stats for the player's current filter (queue + champion), over the FULL
 *  filtered set — not just the page shown. Remakes excluded. */
export interface FilteredStats {
  games: number;
  wins: number;
  losses: number;
  winrate: number | null;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  kda: number;
  csPerMin: number;
  avgDamage: number;
  avgVision: number;
}

export async function getFilteredStats(
  client: Queryable,
  puuid: string,
  opts: { slug?: QueueSlug; championId?: number; role?: string } = {},
): Promise<FilteredStats> {
  const queueIds = opts.slug ? queueIdsForSlug(opts.slug) : null;
  const params: unknown[] = [puuid];
  let i = 2;
  let where = `mp.puuid = $1 AND ${NOT_REMAKE_SQL}`;
  if (queueIds) {
    where += ` AND m.queue_id = ANY($${i}::int[])`;
    params.push(queueIds);
    i++;
  }
  if (opts.championId != null) {
    where += ` AND mp.champion_id = $${i}`;
    params.push(opts.championId);
    i++;
  }
  const roleAliases = opts.role ? ROLE_ALIASES[opts.role] : undefined;
  if (roleAliases) {
    where += ` AND upper(mp.role) = ANY($${i}::text[])`;
    params.push(roleAliases);
    i++;
  }
  const rows = await query<{
    games: number;
    wins: number;
    sum_k: number;
    sum_d: number;
    sum_a: number;
    sum_cs: number;
    sum_dur: number;
    avg_k: number;
    avg_d: number;
    avg_a: number;
    avg_dmg: number;
    avg_vis: number;
  }>(
    `SELECT count(*)::int AS games,
            count(*) FILTER (WHERE mp.win)::int AS wins,
            COALESCE(sum(mp.kills),0)::int AS sum_k,
            COALESCE(sum(mp.deaths),0)::int AS sum_d,
            COALESCE(sum(mp.assists),0)::int AS sum_a,
            COALESCE(sum(mp.cs),0)::int AS sum_cs,
            COALESCE(sum(m.game_duration),0)::int AS sum_dur,
            COALESCE(avg(mp.kills),0)::float AS avg_k,
            COALESCE(avg(mp.deaths),0)::float AS avg_d,
            COALESCE(avg(mp.assists),0)::float AS avg_a,
            COALESCE(avg(mp.damage),0)::float AS avg_dmg,
            COALESCE(avg(mp.vision_score),0)::float AS avg_vis
       FROM match_participants mp
       JOIN matches m ON m.match_id = mp.match_id
      WHERE ${where}`,
    params,
    client,
  );
  const r = rows[0];
  const games = r?.games ?? 0;
  const wins = r?.wins ?? 0;
  return {
    games,
    wins,
    losses: games - wins,
    winrate: games ? wins / games : null,
    avgKills: r?.avg_k ?? 0,
    avgDeaths: r?.avg_d ?? 0,
    avgAssists: r?.avg_a ?? 0,
    kda: r && r.sum_d > 0 ? (r.sum_k + r.sum_a) / r.sum_d : (r?.sum_k ?? 0) + (r?.sum_a ?? 0),
    csPerMin: r && r.sum_dur > 0 ? r.sum_cs / (r.sum_dur / 60) : 0,
    avgDamage: r?.avg_dmg ?? 0,
    avgVision: r?.avg_vis ?? 0,
  };
}

/** A player's champion pool for the current queue/lane filter — most-played first,
 *  with games + winrate — to drive a "click a champion to filter" selector. */
export interface ChampPoolEntry {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  winrate: number | null;
}

export async function getChampionPool(
  client: Queryable,
  puuid: string,
  opts: { slug?: QueueSlug; role?: string; limit?: number } = {},
): Promise<ChampPoolEntry[]> {
  const queueIds = opts.slug ? queueIdsForSlug(opts.slug) : null;
  const limit = Math.min(opts.limit ?? 12, 30);
  const params: unknown[] = [puuid];
  let i = 2;
  let where = `mp.puuid = $1 AND ${NOT_REMAKE_SQL}`;
  if (queueIds) {
    where += ` AND m.queue_id = ANY($${i}::int[])`;
    params.push(queueIds);
    i++;
  }
  const roleAliases = opts.role ? ROLE_ALIASES[opts.role] : undefined;
  if (roleAliases) {
    where += ` AND upper(mp.role) = ANY($${i}::text[])`;
    params.push(roleAliases);
    i++;
  }
  params.push(limit);
  const rows = await query<{ champion_id: number; champion_name: string; games: number; wins: number }>(
    `SELECT mp.champion_id, mp.champion_name,
            count(*)::int AS games,
            count(*) FILTER (WHERE mp.win)::int AS wins
       FROM match_participants mp
       JOIN matches m ON m.match_id = mp.match_id
      WHERE ${where}
      GROUP BY mp.champion_id, mp.champion_name
      ORDER BY games DESC, wins DESC
      LIMIT $${i}`,
    params,
    client,
  );
  return rows.map((r) => ({
    championId: r.champion_id,
    championName: r.champion_name,
    games: r.games,
    wins: r.wins,
    winrate: r.games ? r.wins / r.games : null,
  }));
}

/**
 * Per-player match history (op.gg-style game-by-game list). Optionally filtered
 * by queue and/or champion. `crewPuuids` lets us annotate which crewmates were in
 * each game (same side or opposing) for the crew-context view.
 */
export async function getMatchHistory(
  client: Queryable,
  puuid: string,
  opts: {
    slug?: QueueSlug;
    championId?: number;
    role?: string;
    limit?: number;
    offset?: number;
    crewPuuids?: string[];
  } = {},
): Promise<MatchHistoryItem[]> {
  const queueIds = opts.slug ? queueIdsForSlug(opts.slug) : null;
  const limit = Math.min(opts.limit ?? 20, 50);
  const offset = opts.offset ?? 0;

  const params: unknown[] = [puuid];
  let i = 2;
  let where = "mp.puuid = $1";
  if (queueIds) {
    where += ` AND m.queue_id = ANY($${i}::int[])`;
    params.push(queueIds);
    i++;
  }
  if (opts.championId != null) {
    where += ` AND mp.champion_id = $${i}`;
    params.push(opts.championId);
    i++;
  }
  const roleAliases = opts.role ? ROLE_ALIASES[opts.role] : undefined;
  if (roleAliases) {
    where += ` AND upper(mp.role) = ANY($${i}::text[])`;
    params.push(roleAliases);
    i++;
  }
  const limIdx = i;
  params.push(limit);
  const offIdx = i + 1;
  params.push(offset);

  const rows = await query<{
    match_id: string;
    queue_id: number;
    game_start: string;
    game_duration: number;
    champion_id: number;
    champion_name: string;
    role: string | null;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
    cs: number;
    gold: number;
    damage: number;
    vision_score: number;
    placement: number | null;
    team_id: number;
    subteam_id: number | null;
    is_team_mvp: boolean | null;
  }>(
    `SELECT mp.match_id, m.queue_id, m.game_start::text AS game_start, m.game_duration,
            mp.champion_id, mp.champion_name, mp.role, mp.win, mp.kills, mp.deaths,
            mp.assists, mp.cs, mp.gold, mp.damage, mp.vision_score, mp.placement, mp.team_id, mp.subteam_id, mp.is_team_mvp
     FROM match_participants mp
     JOIN matches m ON m.match_id = mp.match_id
     WHERE ${where}
     ORDER BY m.game_start DESC
     LIMIT $${limIdx} OFFSET $${offIdx}`,
    params,
    client,
  );
  if (rows.length === 0) return [];

  // Annotate crewmates present in each match.
  const crew = (opts.crewPuuids ?? []).filter((p) => p !== puuid);
  const mateByMatch = new Map<string, MatchHistoryItem["crewmates"]>();
  if (crew.length) {
    const matchIds = rows.map((r) => r.match_id);
    const mates = await query<{
      match_id: string;
      puuid: string;
      riot_id: string;
      tag: string;
      region: string;
      champion_name: string;
      team_id: number;
      subteam_id: number | null;
      queue_id: number;
      win: boolean;
      kills: number;
      deaths: number;
      assists: number;
      damage: number;
    }>(
      `SELECT mp.match_id, mp.puuid, ra.riot_id, ra.tag, ra.region, mp.champion_name,
              mp.team_id, mp.subteam_id, m.queue_id, mp.win, mp.kills, mp.deaths, mp.assists, mp.damage
       FROM match_participants mp
       JOIN riot_accounts ra ON ra.puuid = mp.puuid
       JOIN matches m ON m.match_id = mp.match_id
       WHERE mp.match_id = ANY($1) AND mp.puuid = ANY($2)`,
      [matchIds, crew],
      client,
    );
    const meByMatch = new Map(rows.map((r) => [r.match_id, r]));
    for (const mate of mates) {
      const me = meByMatch.get(mate.match_id);
      if (!me) continue;
      const sameSide =
        mate.queue_id === QUEUES.ARENA ? mate.subteam_id === me.subteam_id : mate.team_id === me.team_id;
      const arr = mateByMatch.get(mate.match_id) ?? [];
      arr.push({
        puuid: mate.puuid,
        riotId: mate.riot_id,
        tag: mate.tag,
        region: mate.region,
        championName: mate.champion_name,
        sameSide,
        win: mate.win,
        kills: mate.kills,
        deaths: mate.deaths,
        assists: mate.assists,
        damage: mate.damage,
      });
      mateByMatch.set(mate.match_id, arr);
    }
  }

  return rows.map((r) => ({
    matchId: r.match_id,
    queueId: r.queue_id,
    queueSlug: slugForQueueId(r.queue_id),
    gameStart: r.game_start,
    gameDuration: r.game_duration,
    championId: r.champion_id,
    championName: r.champion_name,
    role: r.role,
    win: r.win,
    kills: r.kills,
    deaths: r.deaths,
    assists: r.assists,
    cs: r.cs,
    gold: r.gold,
    damage: r.damage,
    visionScore: r.vision_score,
    placement: r.placement,
    isTeamMvp: r.is_team_mvp ?? false,
    crewmates: mateByMatch.get(r.match_id) ?? [],
  }));
}
