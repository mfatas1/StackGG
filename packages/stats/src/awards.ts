import { query, type Queryable, QUEUES, QUEUE_LABEL } from "@crewstats/shared";
import type { Award, RolePlacement } from "@crewstats/shared";
import { winrate } from "./util.js";
import { getIdentity } from "./modes.js";

interface TopRow {
  puuid: string;
  v: number;
  champion_name: string;
  queue_id: number;
  kills: number;
  deaths: number;
  assists: number;
}

async function topGame(
  client: Queryable,
  puuids: string[],
  metricSql: string,
  whereExtra = "",
): Promise<TopRow | null> {
  const rows = await query<TopRow>(
    `SELECT mp.puuid, (${metricSql})::float AS v, mp.champion_name, m.queue_id,
            mp.kills, mp.deaths, mp.assists
     FROM match_participants mp
     JOIN matches m ON m.match_id = mp.match_id
     WHERE mp.puuid = ANY($1) ${whereExtra}
     ORDER BY v DESC
     LIMIT 1`,
    [puuids],
    client,
  );
  return rows[0] ?? null;
}

/** Crew superlatives / records. Returns only awards that have a holder. */
export async function getCrewAwards(client: Queryable, puuids: string[]): Promise<Award[]> {
  if (puuids.length === 0) return [];
  const awards: Award[] = [];

  const add = async (
    key: string,
    label: string,
    row: TopRow | null,
    fmt: (r: TopRow) => { value: string; sub: string },
  ) => {
    if (!row || !row.v) return;
    const holder = await getIdentity(client, row.puuid);
    if (!holder) return;
    const { value, sub } = fmt(row);
    awards.push({ key, label, value, holder, sub });
  };

  const kda = (r: TopRow) => `${r.kills}/${r.deaths}/${r.assists}`;
  const q = (r: TopRow) => QUEUE_LABEL[r.queue_id] ?? "Game";

  await add("kills", "Most kills in a game", await topGame(client, puuids, "mp.kills"), (r) => ({
    value: String(r.kills),
    sub: `${r.champion_name} · ${kda(r)} · ${q(r)}`,
  }));

  await add(
    "kda",
    "Best KDA game",
    await topGame(client, puuids, "(mp.kills + mp.assists)::float / GREATEST(mp.deaths,1)", "AND mp.kills + mp.assists >= 8"),
    (r) => ({ value: ((r.kills + r.assists) / Math.max(r.deaths, 1)).toFixed(1), sub: `${r.champion_name} · ${kda(r)} · ${q(r)}` }),
  );

  await add("damage", "Most damage in a game", await topGame(client, puuids, "mp.damage"), (r) => ({
    value: r.v.toLocaleString("en-US"),
    sub: `${r.champion_name} · ${kda(r)} · ${q(r)}`,
  }));

  await add("int", "Biggest int (most deaths)", await topGame(client, puuids, "mp.deaths"), (r) => ({
    value: String(r.deaths),
    sub: `${r.champion_name} · ${kda(r)} · ${q(r)}`,
  }));

  // Longest win streak (consecutive wins by game time, any queue).
  const streak = await query<{ puuid: string; streak: string }>(
    `WITH seq AS (
       SELECT mp.puuid, mp.win,
         row_number() OVER (PARTITION BY mp.puuid ORDER BY m.game_start)
         - row_number() OVER (PARTITION BY mp.puuid, mp.win ORDER BY m.game_start) AS grp
       FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id
       WHERE mp.puuid = ANY($1)
     )
     SELECT puuid, count(*)::text AS streak FROM seq WHERE win GROUP BY puuid, grp
     ORDER BY count(*) DESC LIMIT 1`,
    [puuids],
    client,
  );
  if (streak[0] && Number(streak[0].streak) >= 3) {
    const holder = await getIdentity(client, streak[0].puuid);
    if (holder) awards.push({ key: "streak", label: "Longest win streak", value: `${streak[0].streak}W`, holder, sub: "consecutive wins" });
  }

  // The grinder (most games tracked).
  const grind = await query<{ puuid: string; games: string }>(
    `SELECT puuid, count(*)::text AS games FROM match_participants WHERE puuid = ANY($1) GROUP BY puuid ORDER BY count(*) DESC LIMIT 1`,
    [puuids],
    client,
  );
  if (grind[0]) {
    const holder = await getIdentity(client, grind[0].puuid);
    if (holder) awards.push({ key: "grind", label: "The grinder", value: `${grind[0].games}`, holder, sub: "games tracked" });
  }

  // Arena champion (most 1st-place finishes).
  const arena = await query<{ puuid: string; wins: string }>(
    `SELECT mp.puuid, count(*)::text AS wins
     FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id
     WHERE mp.puuid = ANY($1) AND m.queue_id = ${QUEUES.ARENA} AND mp.placement = 1
     GROUP BY mp.puuid ORDER BY count(*) DESC LIMIT 1`,
    [puuids],
    client,
  );
  if (arena[0] && Number(arena[0].wins) > 0) {
    const holder = await getIdentity(client, arena[0].puuid);
    if (holder) awards.push({ key: "arena", label: "Arena champion", value: `${arena[0].wins}`, holder, sub: "1st-place finishes" });
  }

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
