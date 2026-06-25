import { query, type Queryable, QUEUES, championDisplayName } from "@crewstats/shared";
import { NOT_REMAKE_SQL } from "./util.js";

/**
 * "Edge" — descriptive, scouting-style takeaways from a player's ranked history (SR solo
 * + flex): best/weakest champ, strongest role, carry rate, early-vs-late tendency and
 * current streak. Viewer-neutral copy so it reads on any profile. Empty when thin.
 */
export interface PlayerInsight {
  kind: "bestChamp" | "worstChamp" | "bestRole" | "earlyGame" | "lateGame" | "streakUp" | "streakDown" | "carryRate";
  headline: string;
  detail: string;
  tone: "good" | "bad" | "neutral";
  championName?: string;
  role?: string;
}

const SR = `(${QUEUES.RANKED_SOLO}, ${QUEUES.RANKED_FLEX})`;
const P = (x: number) => `${Math.round(x * 100)}%`;
const ROLE_LABEL: Record<string, string> = { TOP: "top lane", JUNGLE: "the jungle", MIDDLE: "mid", BOTTOM: "bot lane", UTILITY: "support" };

export async function getPlayerInsights(client: Queryable, puuid: string): Promise<PlayerInsight[]> {
  const out: PlayerInsight[] = [];

  // ---- Champions (best + toughest among reasonably-played picks) ----
  const champs = await query<{ champion_name: string; games: number; wins: number }>(
    `SELECT mp.champion_name, count(*)::int AS games, count(*) FILTER (WHERE mp.win)::int AS wins
       FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id
      WHERE mp.puuid = $1 AND m.queue_id IN ${SR} AND ${NOT_REMAKE_SQL}
      GROUP BY mp.champion_name HAVING count(*) >= 6`,
    [puuid],
    client,
  );
  const cw = champs.map((c) => ({ ...c, wr: c.wins / c.games }));
  const bestChamp = [...cw].sort((a, b) => b.wr - a.wr || b.games - a.games)[0];
  if (bestChamp && bestChamp.wr >= 0.55) {
    out.push({
      kind: "bestChamp",
      headline: `Best pick: ${championDisplayName(bestChamp.champion_name)}`,
      detail: `${P(bestChamp.wr)} over ${bestChamp.games} games.`,
      tone: "good",
      championName: bestChamp.champion_name,
    });
  }
  const worstChamp = [...cw].filter((c) => c.games >= 8).sort((a, b) => a.wr - b.wr || b.games - a.games)[0];
  if (worstChamp && worstChamp.wr <= 0.45 && worstChamp.champion_name !== bestChamp?.champion_name) {
    out.push({
      kind: "worstChamp",
      headline: `Weakest pick: ${championDisplayName(worstChamp.champion_name)}`,
      detail: `${P(worstChamp.wr)} over ${worstChamp.games} games.`,
      tone: "bad",
      championName: worstChamp.champion_name,
    });
  }

  // ---- Strongest role ----
  const roles = await query<{ role: string; games: number; wins: number }>(
    `SELECT upper(mp.role) AS role, count(*)::int AS games, count(*) FILTER (WHERE mp.win)::int AS wins
       FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id
      WHERE mp.puuid = $1 AND m.queue_id IN ${SR} AND ${NOT_REMAKE_SQL} AND mp.role IS NOT NULL AND mp.role <> ''
      GROUP BY 1 HAVING count(*) >= 10`,
    [puuid],
    client,
  );
  if (roles.length >= 2) {
    const best = roles.map((r) => ({ ...r, wr: r.wins / r.games })).sort((a, b) => b.wr - a.wr || b.games - a.games)[0]!;
    if (best.wr >= 0.53 && ROLE_LABEL[best.role]) {
      out.push({
        kind: "bestRole",
        headline: `Strongest in ${ROLE_LABEL[best.role]}`,
        detail: `${P(best.wr)} over ${best.games} games.`,
        tone: "good",
        role: best.role,
      });
    }
  }

  // ---- Carry rate (top carry score on your team) — uses the stored carry metric. ----
  try {
    const carry = (
      await query<{ total: number; mvp: number }>(
        `SELECT count(*)::int AS total, count(*) FILTER (WHERE mp.is_team_mvp)::int AS mvp
           FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id
          WHERE mp.puuid = $1 AND m.queue_id IN ${SR} AND ${NOT_REMAKE_SQL} AND mp.is_team_mvp IS NOT NULL`,
        [puuid],
        client,
      )
    )[0];
    if (carry && carry.total >= 15) {
      const rate = carry.mvp / carry.total;
      if (rate >= 0.45) {
        out.push({ kind: "carryRate", headline: "Hard carry", detail: `Top score on the team in ${P(rate)} of games.`, tone: "good" });
      } else if (rate >= 0.3) {
        out.push({ kind: "carryRate", headline: "Reliable carry", detail: `Top score on the team in ${P(rate)} of games.`, tone: "good" });
      }
    }
  } catch {
    // is_team_mvp column not present (pre-005 DB) — skip this insight.
  }

  // ---- Early vs late game (split at 30 min) ----
  const gl = (
    await query<{ sg: number; sw: number; lg: number; lw: number }>(
      `SELECT count(*) FILTER (WHERE m.game_duration < 1800)::int AS sg,
              count(*) FILTER (WHERE m.game_duration < 1800 AND mp.win)::int AS sw,
              count(*) FILTER (WHERE m.game_duration >= 1800)::int AS lg,
              count(*) FILTER (WHERE m.game_duration >= 1800 AND mp.win)::int AS lw
         FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id
        WHERE mp.puuid = $1 AND m.queue_id IN ${SR} AND ${NOT_REMAKE_SQL}`,
      [puuid],
      client,
    )
  )[0];
  if (gl && gl.sg >= 8 && gl.lg >= 8) {
    const sw = gl.sw / gl.sg;
    const lw = gl.lw / gl.lg;
    if (Math.abs(sw - lw) >= 0.08) {
      out.push(
        sw > lw
          ? { kind: "earlyGame", headline: "Early-game player", detail: `${P(sw)} before 30 min, ${P(lw)} after.`, tone: "neutral" }
          : { kind: "lateGame", headline: "Late-game scaler", detail: `${P(lw)} after 30 min, ${P(sw)} before.`, tone: "neutral" },
      );
    }
  }

  // ---- Current streak (last 20 ranked games) ----
  const recent = await query<{ win: boolean }>(
    `SELECT mp.win FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id
      WHERE mp.puuid = $1 AND m.queue_id IN ${SR} AND ${NOT_REMAKE_SQL}
      ORDER BY m.game_start DESC LIMIT 20`,
    [puuid],
    client,
  );
  if (recent.length >= 3) {
    let n = 1;
    while (n < recent.length && recent[n]!.win === recent[0]!.win) n++;
    if (n >= 3) {
      out.push(
        recent[0]!.win
          ? { kind: "streakUp", headline: `${n}-game win streak`, detail: "Hot right now.", tone: "good" }
          : { kind: "streakDown", headline: `${n}-game skid`, detail: "Cold right now.", tone: "bad" },
      );
    }
  }

  return out;
}
