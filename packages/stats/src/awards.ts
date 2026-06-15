import { query, type Queryable, QUEUES, QUEUE_LABEL } from "@crewstats/shared";
import type { Award, AwardEntry, AwardCategory, RolePlacement, PlayerIdentity } from "@crewstats/shared";
import { winrate, NOT_REMAKE_SQL } from "./util.js";
import { getIdentity } from "./modes.js";

/** A crew member's full role spread across the 5 lanes (ranked solo + flex). */
export interface CrewRoleSpread {
  identity: PlayerIdentity;
  total: number;
  roles: Record<
    string,
    {
      games: number;
      wins: number;
      winrate: number | null;
      champions: { championName: string; games: number; wins: number }[]; // top-played in this lane
    }
  >;
}

const ROLE_KEYS: Record<string, string> = {
  TOP: "TOP",
  JUNGLE: "JUNGLE",
  MIDDLE: "MIDDLE",
  MID: "MIDDLE",
  BOTTOM: "BOTTOM",
  BOT: "BOTTOM",
  UTILITY: "UTILITY",
  SUPPORT: "UTILITY",
};

/**
 * Per-player role spread (how each member splits across all five lanes), not just
 * their single primary role — so the crew's role map reads as a filled heatmap:
 * who flexes vs one-tricks, which lane is crowded, which lane nobody covers.
 */
export async function getCrewRoleMatrix(client: Queryable, puuids: string[]): Promise<CrewRoleSpread[]> {
  if (puuids.length === 0) return [];
  // Grouped per champion so we can surface each player's go-to champs per lane.
  const rows = await query<{ puuid: string; role: string; champion_name: string; games: string; wins: string }>(
    `SELECT mp.puuid, mp.role, mp.champion_name,
       count(*)::text AS games,
       count(*) FILTER (WHERE mp.win)::text AS wins
     FROM match_participants mp
     JOIN matches m ON m.match_id = mp.match_id
     WHERE mp.puuid = ANY($1)
       AND m.queue_id IN (${QUEUES.RANKED_SOLO}, ${QUEUES.RANKED_FLEX})
       AND ${NOT_REMAKE_SQL}
       AND mp.role IS NOT NULL AND mp.role <> ''
     GROUP BY mp.puuid, mp.role, mp.champion_name`,
    [puuids],
    client,
  );

  const byPlayer = new Map<string, CrewRoleSpread["roles"]>();
  const totals = new Map<string, number>();
  for (const r of rows) {
    const key = ROLE_KEYS[r.role.toUpperCase()];
    if (!key) continue;
    const games = Number(r.games);
    const wins = Number(r.wins);
    if (!byPlayer.has(r.puuid)) byPlayer.set(r.puuid, {});
    const slot = byPlayer.get(r.puuid)!;
    const cur = slot[key] ?? { games: 0, wins: 0, winrate: null, champions: [] };
    const g = cur.games + games;
    const w = cur.wins + wins;
    cur.champions.push({ championName: r.champion_name, games, wins });
    slot[key] = { games: g, wins: w, winrate: winrate(w, g), champions: cur.champions };
    totals.set(r.puuid, (totals.get(r.puuid) ?? 0) + games);
  }
  // Keep each lane's champions sorted by games, top few.
  for (const roles of byPlayer.values()) {
    for (const cell of Object.values(roles)) {
      cell.champions.sort((a, b) => b.games - a.games || (b.wins / b.games || 0) - (a.wins / a.games || 0));
      cell.champions = cell.champions.slice(0, 3);
    }
  }

  const out: CrewRoleSpread[] = [];
  for (const [puuid, roles] of byPlayer) {
    const identity = await getIdentity(client, puuid);
    if (identity) out.push({ identity, roles, total: totals.get(puuid) ?? 0 });
  }
  out.sort((a, b) => b.total - a.total);
  return out;
}

interface TopRow {
  puuid: string;
  v: number;
  champion_name: string;
  queue_id: number;
  kills: number;
  deaths: number;
  assists: number;
  gold: number;
  cs: number;
  vision_score: number;
}


// Records only count Summoner's Rift (ranked solo + flex). ARAM and Arena are excluded —
// their kills / deaths / damage / time-dead numbers are not comparable to SR games.
const SR_QUEUES = `(${QUEUES.RANKED_SOLO}, ${QUEUES.RANKED_FLEX})`;

/** Each player's single best game for a metric, then the top-N players by that game. */
async function topGames(
  client: Queryable,
  puuids: string[],
  metricSql: string,
  whereExtra = "",
): Promise<TopRow[]> {
  return query<TopRow>(
    `SELECT * FROM (
       SELECT DISTINCT ON (mp.puuid)
         mp.puuid, (${metricSql})::float AS v, mp.champion_name, m.queue_id,
         mp.kills, mp.deaths, mp.assists, mp.gold, mp.cs, mp.vision_score
       FROM match_participants mp
       JOIN matches m ON m.match_id = mp.match_id
       WHERE mp.puuid = ANY($1) AND m.queue_id IN ${SR_QUEUES} AND ${NOT_REMAKE_SQL} ${whereExtra}
       ORDER BY mp.puuid, v DESC NULLS LAST
     ) best
     ORDER BY best.v DESC NULLS LAST
    `,
    [puuids],
    client,
  );
}

/** Crew superlatives / records. Each award carries the full top-N leaderboard. */
export async function getCrewAwards(client: Queryable, puuids: string[]): Promise<Award[]> {
  if (puuids.length === 0) return [];
  const awards: Award[] = [];

  // Memoise identity lookups — the same members recur across every record.
  const idCache = new Map<string, PlayerIdentity | null>();
  const ident = async (puuid: string) => {
    if (!idCache.has(puuid)) idCache.set(puuid, await getIdentity(client, puuid));
    return idCache.get(puuid)!;
  };

  // Records are grouped into three tabs on the records page; `category` is set before
  // each block below and stamped onto every award the push() helper builds.
  let category: AwardCategory = "pergame";

  // Build an award from already-ranked rows + a per-row {value, sub} formatter.
  const push = async <T extends { puuid: string }>(
    key: string,
    label: string,
    rows: T[],
    fmt: (r: T) => { value: string; sub: string } | null,
  ) => {
    const entries: AwardEntry[] = [];
    for (const r of rows) {
      const f = fmt(r);
      if (!f) continue;
      const holder = await ident(r.puuid);
      if (!holder) continue;
      entries.push({ rank: entries.length + 1, holder, value: f.value, sub: f.sub });
    }
    if (!entries.length) return;
    const top = entries[0]!;
    awards.push({ key, label, value: top.value, holder: top.holder, sub: top.sub, ranking: entries, category });
  };

  const kda = (r: TopRow) => `${r.kills}/${r.deaths}/${r.assists}`;
  const q = (r: TopRow) => QUEUE_LABEL[r.queue_id] ?? "Game";
  const ctx = (r: TopRow) => `${r.champion_name} · ${kda(r)} · ${q(r)}`;
  const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
  const num = (n: number) => Math.round(n).toLocaleString("en-US");

  // ---- Per-game records (each player's best game, ranked). Ordered for a fun mix. ----
  await push("kills", "Most kills in a game", await topGames(client, puuids, "mp.kills"), (r) =>
    r.v ? { value: String(r.kills), sub: ctx(r) } : null,
  );
  await push("deadtime", "Most time spent dead (one game)", await topGames(client, puuids, "mp.time_dead"), (r) =>
    r.v ? { value: mmss(r.v), sub: ctx(r) } : null,
  );
  await push(
    "kda",
    "Best KDA game",
    await topGames(client, puuids, "(mp.kills + mp.assists)::float / GREATEST(mp.deaths,1)", "AND mp.kills + mp.assists >= 8"),
    (r) => (r.v ? { value: ((r.kills + r.assists) / Math.max(r.deaths, 1)).toFixed(1), sub: ctx(r) } : null),
  );
  await push("damage", "Most damage in a game", await topGames(client, puuids, "mp.damage"), (r) =>
    r.v ? { value: num(r.v), sub: ctx(r) } : null,
  );
  await push("spree", "Longest killing spree", await topGames(client, puuids, "mp.killing_spree"), (r) =>
    r.v ? { value: String(Math.round(r.v)), sub: ctx(r) } : null,
  );
  await push("tanked", "Most damage tanked", await topGames(client, puuids, "mp.damage_taken"), (r) =>
    r.v ? { value: num(r.v), sub: ctx(r) } : null,
  );
  await push("assists", "Most assists in a game", await topGames(client, puuids, "mp.assists"), (r) =>
    r.v ? { value: String(r.assists), sub: ctx(r) } : null,
  );
  await push("gold", "Most gold in a game", await topGames(client, puuids, "mp.gold"), (r) =>
    r.v ? { value: num(r.v), sub: ctx(r) } : null,
  );
  await push("cs", "Most CS in a game", await topGames(client, puuids, "mp.cs"), (r) =>
    r.v ? { value: String(r.cs), sub: ctx(r) } : null,
  );
  await push("mitigated", "Most damage self-mitigated", await topGames(client, puuids, "mp.self_mitigated"), (r) =>
    r.v ? { value: num(r.v), sub: ctx(r) } : null,
  );
  await push("healing", "Most healing for teammates", await topGames(client, puuids, "mp.heal_teammates"), (r) =>
    r.v ? { value: num(r.v), sub: ctx(r) } : null,
  );
  await push("shielding", "Most shielding for teammates", await topGames(client, puuids, "mp.shield_teammates"), (r) =>
    r.v ? { value: num(r.v), sub: ctx(r) } : null,
  );
  await push("cc", "Most crowd control (one game)", await topGames(client, puuids, "mp.cc_time"), (r) =>
    r.v ? { value: `${Math.round(r.v)}s`, sub: ctx(r) } : null,
  );
  await push("crit", "Biggest critical strike", await topGames(client, puuids, "mp.largest_crit"), (r) =>
    r.v ? { value: num(r.v), sub: ctx(r) } : null,
  );
  await push("vision", "Highest vision score", await topGames(client, puuids, "mp.vision_score"), (r) =>
    r.v ? { value: String(r.vision_score), sub: ctx(r) } : null,
  );
  await push("alive", "Longest life (one game)", await topGames(client, puuids, "mp.longest_life"), (r) =>
    r.v ? { value: mmss(r.v), sub: ctx(r) } : null,
  );
  await push("int", "Biggest int (most deaths)", await topGames(client, puuids, "mp.deaths"), (r) =>
    r.v ? { value: String(r.deaths), sub: ctx(r) } : null,
  );

  // ---- All-time totals + aggregate records (per player, ranked) ----
  category = "alltime";
  const careerSum = async (key: string, label: string, col: string, unit: string) => {
    const rows = await query<{ puuid: string; total: string }>(
      `SELECT mp.puuid, sum(mp.${col})::text AS total
       FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id
       WHERE mp.puuid = ANY($1) AND m.queue_id IN ${SR_QUEUES} AND ${NOT_REMAKE_SQL} AND mp.${col} IS NOT NULL
       GROUP BY mp.puuid HAVING sum(mp.${col}) > 0
       ORDER BY sum(mp.${col}) DESC`,
      [puuids],
      client,
    );
    await push(key, label, rows, (r) => ({ value: num(Number(r.total)), sub: unit }));
  };
  await careerSum("pentas", "Most pentakills", "pentakills", "pentakills · all games");
  await careerSum("steals", "Most objective steals", "objectives_stolen", "Baron / Dragon steals");
  await careerSum("solokills", "Most solo kills", "solo_kills", "solo kills · all games");

  // ---- Aggregate records (per player, ranked) ----
  // Longest win streak (best consecutive-win run per player, SR only).
  const streak = await query<{ puuid: string; streak: string }>(
    `WITH seq AS (
       SELECT mp.puuid, mp.win,
         row_number() OVER (PARTITION BY mp.puuid ORDER BY m.game_start)
         - row_number() OVER (PARTITION BY mp.puuid, mp.win ORDER BY m.game_start) AS grp
       FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id
       WHERE mp.puuid = ANY($1) AND m.queue_id IN ${SR_QUEUES} AND ${NOT_REMAKE_SQL}
     ),
     runs AS (SELECT puuid, count(*) AS streak FROM seq WHERE win GROUP BY puuid, grp),
     best AS (SELECT puuid, max(streak) AS best_streak FROM runs GROUP BY puuid)
     SELECT puuid, best_streak::text AS streak FROM best ORDER BY best_streak DESC`,
    [puuids],
    client,
  );
  await push("streak", "Longest win streak", streak, (r) =>
    Number(r.streak) >= 3 ? { value: `${r.streak}W`, sub: "consecutive wins" } : null,
  );

  // The grinder (most SR games tracked).
  const grind = await query<{ puuid: string; games: string }>(
    `SELECT mp.puuid, count(*)::text AS games
     FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id
     WHERE mp.puuid = ANY($1) AND m.queue_id IN ${SR_QUEUES} AND ${NOT_REMAKE_SQL}
     GROUP BY mp.puuid ORDER BY count(*) DESC`,
    [puuids],
    client,
  );
  await push("grind", "The grinder", grind, (r) => ({ value: r.games, sub: "SR games tracked" }));

  // ---- Per-minute records (best single game's rate; ≥10-min games so short games
  // don't inflate the rate). ----
  category = "perminute";
  const perMin = (col: string) => `${col}::float / GREATEST(m.game_duration, 1) * 60`;
  const longGame = "AND m.game_duration >= 600";
  const fixed = (d: number) => (r: TopRow) => (r.v ? { value: r.v.toFixed(d), sub: ctx(r) } : null);
  await push("dmgmin", "Most damage / min", await topGames(client, puuids, perMin("mp.damage"), longGame), fixed(0));
  await push("deathsmin", "Most deaths / min", await topGames(client, puuids, perMin("mp.deaths"), longGame), fixed(2));
  await push("killsmin", "Most kills / min", await topGames(client, puuids, perMin("mp.kills"), longGame), fixed(2));
  await push("goldmin", "Most gold / min", await topGames(client, puuids, perMin("mp.gold"), longGame), fixed(0));
  await push("csmin", "Most CS / min", await topGames(client, puuids, perMin("mp.cs"), longGame), fixed(1));
  await push("tankedmin", "Most damage tanked / min", await topGames(client, puuids, perMin("mp.damage_taken"), longGame), fixed(0));
  await push("healmin", "Most healing / min", await topGames(client, puuids, perMin("mp.heal_teammates"), longGame), fixed(0));
  await push("visionmin", "Highest vision / min", await topGames(client, puuids, perMin("mp.vision_score"), longGame), fixed(2));

  return awards;
}

/** Each member's primary role across Summoner's Rift queues, for the rift map. */
export async function getCrewRolePlacements(client: Queryable, puuids: string[]): Promise<RolePlacement[]> {
  if (puuids.length === 0) return [];
  const rows = await query<{ puuid: string; role: string; games: string; wins: string }>(
    `SELECT mp.puuid, mp.role,
       count(*)::text AS games,
       count(*) FILTER (WHERE mp.win)::text AS wins
     FROM match_participants mp
     JOIN matches m ON m.match_id = mp.match_id
     WHERE mp.puuid = ANY($1)
       AND m.queue_id IN (${QUEUES.RANKED_SOLO}, ${QUEUES.RANKED_FLEX})
       AND ${NOT_REMAKE_SQL}
       AND mp.role IS NOT NULL AND mp.role <> ''
     GROUP BY mp.puuid, mp.role`,
    [puuids],
    client,
  );

  // Pick each member's most-played role.
  const best = new Map<string, { role: string; games: number; wins: number }>();
  for (const r of rows) {
    const games = Number(r.games);
    const cur = best.get(r.puuid);
    if (!cur || games > cur.games) best.set(r.puuid, { role: r.role, games, wins: Number(r.wins) });
  }

  const out: RolePlacement[] = [];
  for (const [puuid, b] of best) {
    const identity = await getIdentity(client, puuid);
    if (identity) out.push({ identity, role: b.role, games: b.games, wins: b.wins, winrate: winrate(b.wins, b.games) });
  }
  return out;
}
