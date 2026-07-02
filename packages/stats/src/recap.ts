import { query, type Queryable, QUEUES } from "@crewstats/shared";

/**
 * Recap data engine — the numeric backbone of the Season/Week "Year in Review". Everything
 * here is *comparison-first*: per-member aggregates the resolver ranks members against each
 * other, so the comedy comes from the contrast ("the most", "the least", "vs the rest"),
 * not from isolated trophies. Summoner's Rift (ranked solo + flex) only, full games
 * (>= 300s), within an optional time window (`since`). No timelines, no extra Riot calls.
 */

const SR = `(${QUEUES.RANKED_SOLO}, ${QUEUES.RANKED_FLEX})`;
const FULL = "m.game_duration >= 300";

/** Per-member windowed aggregate. All numbers; the resolver turns these into rankings + copy. */
export interface RecapMemberAgg {
  puuid: string;
  games: number;
  wins: number;
  secondsPlayed: number; // sum of game durations this member appeared in
  timeDead: number; // seconds
  kills: number;
  deaths: number;
  assists: number;
  avgDeaths: number;
  pentas: number;
  outnumbered: number;
  perfectGames: number;
  abilityUses: number;
  baitKills: number; // kills_under_own_turret — luring enemies to their death (bait master)
  saves: number; // ally_saves
  fistBumps: number;
  heraldDances: number;
  clutchSurvivals: number; // survived on single-digit HP
  yeets: number; // knock enemy into team & kill
  ffGames: number;
  ff15Games: number;
  carry: number; // avg carry_score
  mvpGames: number;
  nightGames: number;
  // Pings (per type, summed over the window)
  pings: {
    total: number;
    mia: number; // enemy_missing ("?")
    onMyWay: number;
    command: number;
    danger: number;
    needVision: number;
    assistMe: number;
    allIn: number;
    basic: number;
    getBack: number;
    hold: number;
    push: number;
    visionCleared: number;
    enemyVision: number;
    bait: number;
  };
}

export interface RecapMatchRow {
  matchId: string;
  durationSec: number;
  ts: number; // epoch seconds of game start
  surrender: boolean;
}

export interface RecapDuoRow {
  a: string;
  b: string;
  games: number;
  wins: number;
}

export interface RecapChampRow {
  puuid: string;
  champion: string;
  games: number;
  wins: number;
}

export interface RecapSingleGame {
  puuid: string;
  matchId: string;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
  durationSec: number;
  multikill: number;
}

/** A single-game peak: the one game where someone maxed a metric. The funny "moments". */
export interface RecapRecord {
  key: string;
  puuid: string;
  champion: string;
  matchId: string;
  value: number;
  kills: number;
  deaths: number;
  assists: number;
  durationSec: number;
}

export interface RecapData {
  members: RecapMemberAgg[];
  matches: RecapMatchRow[];
  duos: RecapDuoRow[];
  champs: RecapChampRow[];
  throwGame: RecapSingleGame | null;
  bestGame: RecapSingleGame | null;
  records: Record<string, RecapRecord>;
}

// sum-of-pings expression for "most pings in one game"
const PING_SUM =
  "(COALESCE(mp.all_in_pings,0)+COALESCE(mp.assist_me_pings,0)+COALESCE(mp.bait_pings,0)+COALESCE(mp.basic_pings,0)+" +
  "COALESCE(mp.command_pings,0)+COALESCE(mp.danger_pings,0)+COALESCE(mp.enemy_missing_pings,0)+COALESCE(mp.enemy_vision_pings,0)+" +
  "COALESCE(mp.get_back_pings,0)+COALESCE(mp.hold_pings,0)+COALESCE(mp.need_vision_pings,0)+COALESCE(mp.on_my_way_pings,0)+" +
  "COALESCE(mp.push_pings,0)+COALESCE(mp.vision_cleared_pings,0))";

const RECORD_METRICS: { key: string; expr: string }[] = [
  { key: "kills", expr: "mp.kills" },
  { key: "deaths", expr: "mp.deaths" },
  { key: "assists", expr: "mp.assists" },
  { key: "spree", expr: "COALESCE(mp.killing_spree,0)" },
  { key: "multikill", expr: "COALESCE(mp.multikill,0)" },
  { key: "pings", expr: PING_SUM },
  { key: "timeDead", expr: "COALESCE(mp.time_dead,0)" },
  { key: "outnumbered", expr: "COALESCE(mp.outnumbered_kills,0)" },
  { key: "damage", expr: "mp.damage" },
  { key: "cs", expr: "mp.cs" },
  { key: "gold", expr: "mp.gold" },
  { key: "abilityUses", expr: "COALESCE(mp.ability_uses,0)" },
];

const n = (x: string | number | null | undefined) => Number(x ?? 0);

/** Build the `since` clause + params for a windowed SR query ($1 = puuids, $2 = since). */
function windowed(puuids: string[], since: Date | null) {
  const clause = since ? "AND m.game_start >= $2" : "";
  const params = (since ? [puuids, since] : [puuids]) as unknown[];
  return { clause, params };
}

export async function getRecapData(
  client: Queryable,
  puuids: string[],
  since: Date | null = null,
): Promise<RecapData> {
  if (puuids.length === 0) {
    return { members: [], matches: [], duos: [], champs: [], throwGame: null, bestGame: null, records: {} };
  }
  const { clause, params } = windowed(puuids, since);

  const memberRows = await query<Record<string, string>>(
    `SELECT mp.puuid,
       count(*) AS games,
       count(*) FILTER (WHERE mp.win) AS wins,
       sum(m.game_duration) AS seconds_played,
       sum(COALESCE(mp.time_dead,0)) AS time_dead,
       sum(mp.kills) AS kills, sum(mp.deaths) AS deaths, sum(mp.assists) AS assists,
       avg(mp.deaths) AS avg_deaths,
       sum(COALESCE(mp.pentakills,0)) AS pentas,
       sum(COALESCE(mp.outnumbered_kills,0)) AS outnumbered,
       sum(COALESCE(mp.perfect_game,0)) AS perfect_games,
       sum(COALESCE(mp.ability_uses,0)) AS ability_uses,
       sum(COALESCE(mp.kills_under_own_turret,0)) AS bait_kills,
       sum(COALESCE(mp.ally_saves,0)) AS saves,
       sum(COALESCE(mp.fist_bump_participation,0)) AS fist_bumps,
       sum(COALESCE(mp.danced_with_herald,0)) AS herald_dances,
       sum(COALESCE(mp.survived_single_digit_hp,0)) AS clutch_survivals,
       sum(COALESCE(mp.knock_into_team_kills,0)) AS yeets,
       count(*) FILTER (WHERE mp.ended_in_surrender) AS ff_games,
       count(*) FILTER (WHERE mp.team_early_surrendered) AS ff15_games,
       avg(mp.carry_score) AS carry,
       count(*) FILTER (WHERE mp.is_team_mvp) AS mvp_games,
       count(*) FILTER (WHERE extract(hour FROM m.game_start AT TIME ZONE 'Europe/Paris') < 5) AS night_games,
       sum(COALESCE(mp.enemy_missing_pings,0)) AS p_mia,
       sum(COALESCE(mp.on_my_way_pings,0)) AS p_omw,
       sum(COALESCE(mp.command_pings,0)) AS p_command,
       sum(COALESCE(mp.danger_pings,0)) AS p_danger,
       sum(COALESCE(mp.need_vision_pings,0)) AS p_need_vision,
       sum(COALESCE(mp.assist_me_pings,0)) AS p_assist,
       sum(COALESCE(mp.all_in_pings,0)) AS p_all_in,
       sum(COALESCE(mp.basic_pings,0)) AS p_basic,
       sum(COALESCE(mp.get_back_pings,0)) AS p_get_back,
       sum(COALESCE(mp.hold_pings,0)) AS p_hold,
       sum(COALESCE(mp.push_pings,0)) AS p_push,
       sum(COALESCE(mp.vision_cleared_pings,0)) AS p_vision_cleared,
       sum(COALESCE(mp.enemy_vision_pings,0)) AS p_enemy_vision,
       sum(COALESCE(mp.bait_pings,0)) AS p_bait
     FROM match_participants mp
     JOIN matches m ON m.match_id = mp.match_id AND ${FULL}
     WHERE mp.puuid = ANY($1) AND m.queue_id IN ${SR} ${clause}
     GROUP BY mp.puuid`,
    params,
    client,
  );

  const members: RecapMemberAgg[] = memberRows.map((r) => {
    const p = {
      mia: n(r.p_mia),
      onMyWay: n(r.p_omw),
      command: n(r.p_command),
      danger: n(r.p_danger),
      needVision: n(r.p_need_vision),
      assistMe: n(r.p_assist),
      allIn: n(r.p_all_in),
      basic: n(r.p_basic),
      getBack: n(r.p_get_back),
      hold: n(r.p_hold),
      push: n(r.p_push),
      visionCleared: n(r.p_vision_cleared),
      enemyVision: n(r.p_enemy_vision),
      bait: n(r.p_bait),
    };
    const total =
      p.mia + p.onMyWay + p.command + p.danger + p.needVision + p.assistMe + p.allIn + p.basic +
      p.getBack + p.hold + p.push + p.visionCleared + p.enemyVision + p.bait;
    return {
      puuid: r.puuid!,
      games: n(r.games),
      wins: n(r.wins),
      secondsPlayed: n(r.seconds_played),
      timeDead: n(r.time_dead),
      kills: n(r.kills),
      deaths: n(r.deaths),
      assists: n(r.assists),
      avgDeaths: n(r.avg_deaths),
      pentas: n(r.pentas),
      outnumbered: n(r.outnumbered),
      perfectGames: n(r.perfect_games),
      abilityUses: n(r.ability_uses),
      baitKills: n(r.bait_kills),
      saves: n(r.saves),
      fistBumps: n(r.fist_bumps),
      heraldDances: n(r.herald_dances),
      clutchSurvivals: n(r.clutch_survivals),
      yeets: n(r.yeets),
      ffGames: n(r.ff_games),
      ff15Games: n(r.ff15_games),
      carry: n(r.carry),
      mvpGames: n(r.mvp_games),
      nightGames: n(r.night_games),
      pings: { total, ...p },
    };
  });

  const matchRows = await query<{ match_id: string; game_duration: string; ts: string; surrender: boolean }>(
    `WITH stack_matches AS (
       SELECT m.match_id, max(m.game_duration) AS game_duration,
              extract(epoch FROM max(m.game_start))::bigint AS ts,
              bool_or(COALESCE(mp.ended_in_surrender,false)) AS surrender
       FROM matches m
       JOIN match_participants mp ON mp.match_id = m.match_id
       WHERE mp.puuid = ANY($1) AND m.queue_id IN ${SR} AND ${FULL} ${clause}
       GROUP BY m.match_id
     )
     SELECT match_id, game_duration::text, ts::text, surrender FROM stack_matches`,
    params,
    client,
  );
  const matches: RecapMatchRow[] = matchRows.map((r) => ({
    matchId: r.match_id,
    durationSec: n(r.game_duration),
    ts: n(r.ts),
    surrender: !!r.surrender,
  }));

  const duoRows = await query<{ pa: string; pb: string; games: string; wins: string }>(
    `SELECT a.puuid AS pa, b.puuid AS pb,
       count(*) AS games, count(*) FILTER (WHERE a.win) AS wins
     FROM match_participants a
     JOIN matches m ON m.match_id = a.match_id AND ${FULL}
     JOIN match_participants b ON b.match_id = a.match_id AND a.puuid < b.puuid AND a.team_id = b.team_id
     WHERE a.puuid = ANY($1) AND b.puuid = ANY($1) AND m.queue_id IN ${SR} ${clause}
     GROUP BY a.puuid, b.puuid`,
    params,
    client,
  );
  const duos: RecapDuoRow[] = duoRows.map((r) => ({ a: r.pa, b: r.pb, games: n(r.games), wins: n(r.wins) }));

  const champRows = await query<{ puuid: string; champion_name: string; g: string; w: string }>(
    `SELECT mp.puuid, mp.champion_name, count(*) AS g, count(*) FILTER (WHERE mp.win) AS w
     FROM match_participants mp
     JOIN matches m ON m.match_id = mp.match_id AND ${FULL}
     WHERE mp.puuid = ANY($1) AND m.queue_id IN ${SR} ${clause}
     GROUP BY mp.puuid, mp.champion_name`,
    params,
    client,
  );
  const champs: RecapChampRow[] = champRows.map((r) => ({
    puuid: r.puuid,
    champion: r.champion_name,
    games: n(r.g),
    wins: n(r.w),
  }));

  // Worst single game (the throw): a loss with the ugliest deaths-minus-kills line.
  const throwRows = await query<Record<string, string>>(
    `SELECT mp.puuid, mp.match_id, mp.champion_name AS champ, mp.kills, mp.deaths, mp.assists,
            m.game_duration, COALESCE(mp.multikill,0) AS multikill
     FROM match_participants mp
     JOIN matches m ON m.match_id = mp.match_id AND ${FULL}
     WHERE mp.puuid = ANY($1) AND m.queue_id IN ${SR} AND NOT mp.win ${clause}
     ORDER BY (mp.deaths - mp.kills - mp.assists * 0.5) DESC, mp.deaths DESC
     LIMIT 1`,
    params,
    client,
  );
  // Best single game (the highlight): biggest multikill, then most kills.
  const bestRows = await query<Record<string, string>>(
    `SELECT mp.puuid, mp.match_id, mp.champion_name AS champ, mp.kills, mp.deaths, mp.assists,
            m.game_duration, COALESCE(mp.multikill,0) AS multikill
     FROM match_participants mp
     JOIN matches m ON m.match_id = mp.match_id AND ${FULL}
     WHERE mp.puuid = ANY($1) AND m.queue_id IN ${SR} ${clause}
     ORDER BY COALESCE(mp.multikill,0) DESC, mp.kills DESC
     LIMIT 1`,
    params,
    client,
  );
  const toGame = (r: Record<string, string> | undefined): RecapSingleGame | null =>
    r
      ? {
          puuid: r.puuid!,
          matchId: r.match_id!,
          champion: r.champ!,
          kills: n(r.kills),
          deaths: n(r.deaths),
          assists: n(r.assists),
          durationSec: n(r.game_duration),
          multikill: n(r.multikill),
        }
      : null;

  // Single-game records — the max single game per metric (the "most in one game" moments).
  const recordSql = RECORD_METRICS.map(
    (mt) =>
      `(SELECT '${mt.key}' AS k, mp.puuid, mp.champion_name AS champ, mp.match_id,
          ${mt.expr}::float AS v, mp.kills, mp.deaths, mp.assists, m.game_duration AS dur
        FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id AND ${FULL}
        WHERE mp.puuid = ANY($1) AND m.queue_id IN ${SR} ${clause}
        ORDER BY ${mt.expr} DESC, m.game_start DESC LIMIT 1)`,
  ).join("\nUNION ALL\n");
  const recordRows = await query<Record<string, string>>(recordSql, params, client);
  const records: Record<string, RecapRecord> = {};
  for (const r of recordRows) {
    records[r.k!] = {
      key: r.k!,
      puuid: r.puuid!,
      champion: r.champ!,
      matchId: r.match_id!,
      value: n(r.v),
      kills: n(r.kills),
      deaths: n(r.deaths),
      assists: n(r.assists),
      durationSec: n(r.dur),
    };
  }

  return { members, matches, duos, champs, throwGame: toGame(throwRows[0]), bestGame: toGame(bestRows[0]), records };
}

// ---- Comparison primitive -------------------------------------------------

export interface RankRow {
  puuid: string;
  value: number;
}

/**
 * Rank members by a metric. `dir: "desc"` = biggest first (most kills), `"asc"` = smallest
 * first (fewest deaths). Members with a null sample are dropped. The result is the spine of
 * every comparison scene: the leader is at index 0, the rest trail.
 */
export function rankBy(
  members: RecapMemberAgg[],
  metric: (m: RecapMemberAgg) => number | null,
  dir: "desc" | "asc" = "desc",
): RankRow[] {
  const rows = members
    .map((m) => ({ puuid: m.puuid, value: metric(m) }))
    .filter((r): r is RankRow => r.value !== null && Number.isFinite(r.value));
  rows.sort((x, y) => (dir === "desc" ? y.value - x.value : x.value - y.value));
  return rows;
}

// ---- Group identity heuristic ---------------------------------------------

export interface StackIdentitySignals {
  games: number;
  hours: number;
  winrate: number; // 0..1
  avgDeaths: number; // group average deaths/game
  nightShare: number; // 0..1 share of games after midnight
  surrenderRate: number; // 0..1 share of games that hit /ff
  championVariety: number; // distinct champs per game across the stack (0..1-ish)
  pentas: number;
}

export interface StackIdentity {
  key: string;
  name: string;
  blurb: string;
}

/**
 * One bold, funny verdict for the whole stack, derived from aggregate signals. Each archetype
 * is gated by a threshold; the first that fires (most "characterful" signals first) wins, with
 * a friendly catch-all so every group lands somewhere.
 */
export function deriveStackIdentity(s: StackIdentitySignals): StackIdentity {
  const pick = (key: string, name: string, blurb: string): StackIdentity => ({ key, name, blurb });

  if (s.nightShare >= 0.4)
    return pick(
      "night-crew",
      "The Degenerate Night Crew",
      "Most of your games started when sane people were asleep. The Rift is your nightclub.",
    );
  if (s.avgDeaths >= 7 && s.surrenderRate >= 0.18)
    return pick(
      "inting-enjoyers",
      "Certified Inting Enjoyers",
      "You die a lot, you surrender a lot, and somehow you queue again. Respect the commitment.",
    );
  if (s.surrenderRate >= 0.22)
    return pick(
      "ff-andies",
      "The /ff15 Federation",
      "The surrender vote is basically a group chat at this point. Hope is not part of the strategy.",
    );
  if (s.winrate >= 0.56)
    return pick(
      "tryhards",
      "Tryhard Tuesdays",
      "You win more than you lose and you take it personally. The enemy team did not have fun.",
    );
  if (s.championVariety >= 0.6)
    return pick(
      "menagerie",
      "The Champion Select Menagerie",
      "Nobody plays the same thing twice. Drafting against you is a coin flip with a blindfold.",
    );
  if (s.pentas >= 5)
    return pick(
      "ace-hunters",
      "The Pentakill Pursuit",
      "You don't just win fights, you collect souls. Somebody on this stack is allergic to leaving kills.",
    );
  if (s.hours >= 400)
    return pick(
      "no-lifers",
      "The Grass-Allergic",
      "The hours you logged could have been a part-time job. The Rift thanks you for your service.",
    );
  if (Math.abs(s.winrate - 0.5) <= 0.04)
    return pick(
      "coinflip",
      "The Coinflip Collective",
      "Dead-even win rate. Every queue is a 50/50 and you wouldn't have it any other way.",
    );
  return pick(
    "weekend-warriors",
    "The Weekend Warriors",
    "No grand pattern, just friends queuing up and finding new ways to lose lane together.",
  );
}
