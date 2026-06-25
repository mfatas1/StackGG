import { query, type Queryable, QUEUES, championDisplayName } from "@crewstats/shared";

/**
 * Porofessor-style per-player "tags" shown inline on the leaderboard. Every tag is a numeric
 * metric scored by Z-SCORE against the whole stack: how many standard deviations the player
 * sits onto the tag's favourable side. Each player keeps their few highest-z-score tags.
 * Summoner's Rift (ranked + flex) only, like the records.
 */
export type TagTone = "shame" | "flex" | "neutral";
export interface PlayerTag {
  key: string;
  label: string;
  tone: TagTone;
  meaning: string;
  detail: string;
  /** Tiebreak weight only — used to order tags with an identical z-score. */
  priority: number;
  /** The tag's underlying metric key. Kept for reference/debugging; not used for selection. */
  cluster: string;
  /**
   * The player's directional z-score on this tag's metric — (value − stack mean) / stack
   * stddev, sign-flipped for "low is the tag" metrics. This is the selection signal: a
   * player keeps their highest-`lead` tags. ~0 = stack-average; higher = further onto the
   * tag's favourable side than the rest of the stack.
   */
  lead: number;
}

const SR = `(${QUEUES.RANKED_SOLO}, ${QUEUES.RANKED_FLEX})`;
const MIN_GAMES = 10;
// Minimum NON-support games before the CS-based farm tags (Farm King / Minion Hater) apply,
// so the CS/min average is a real sample and primary supports are excluded from them.
const CS_MIN = 5;
// Each player shows at most this many tags — their highest-z-score ones.
const CAP_PER_PLAYER = 5;
// A tag is only awarded if the player is at least this many standard deviations onto the
// favorable side of the stack. Tuned so a tag is held by at most ~2 players (only genuine
// outliers clear it) and most players land at 3–5 tags. This is the single knob for the
// whole system: raise it for rarer tags, lower it for more. (Players who don't clear it on
// anything still keep their single highest-z tag, so no profile is ever blank.)
const MIN_Z = 1.2;

interface Agg {
  puuid: string;
  games: number;
  wins: number;
  avgKills: number;
  nsKills: number; // avg kills over NON-support games (supports kill little by design)
  avgDeaths: number;
  avgAssists: number;
  avgDead: number;
  avgLife: number;
  avgVision: number;
  avgCspm: number; // CS/min over NON-support games only (supports don't farm by design)
  csGames: number; // count of those non-support games — sample size for the farm tags
  avgTank: number;
  avgDamage: number;
  avgGold: number;
  nsDamage: number; // avg damage over NON-support games (supports deal little by design)
  nsGold: number; //   avg gold over NON-support games (supports earn little by design)
  avgCc: number;
  maxSpree: number;
  pentas: number;
  solos: number;
  steals: number;
  healShield: number;
  teamDmgPct: number;
  dodged: number;
  towerKills: number;
  fountain: number;
  smiteless: number;
  saves: number;
  nightShare: number;
  avgDur: number; // average game length (seconds)
  kdaSd: number; // game-to-game std-dev of KDA — consistency vs boom-or-bust
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
const pctStr = (x: number) => `${Math.round(x * 100)}%`;
const num = (n: number) => Math.round(n).toLocaleString("en-US");

export async function getCrewTags(
  client: Queryable,
  puuids: string[],
  opts: { minZ?: number; cap?: number } = {},
): Promise<Record<string, PlayerTag[]>> {
  if (puuids.length === 0) return {};
  const minZ = opts.minZ ?? MIN_Z;
  const cap = opts.cap ?? CAP_PER_PLAYER;

  const rows = await query<Record<string, string>>(
    `SELECT mp.puuid,
       count(*) AS games, count(*) FILTER (WHERE mp.win) AS wins,
       avg(mp.kills) AS avg_kills, avg(mp.deaths) AS avg_deaths, avg(mp.assists) AS avg_assists,
       avg(mp.kills) FILTER (WHERE mp.role IS DISTINCT FROM 'UTILITY') AS avg_kills_ns,
       avg(mp.time_dead) AS avg_dead, avg(mp.longest_life) AS avg_life, avg(mp.vision_score) AS avg_vision,
       avg(mp.cs::float / GREATEST(m.game_duration, 1) * 60) FILTER (WHERE mp.role IS DISTINCT FROM 'UTILITY') AS avg_cspm,
       count(*) FILTER (WHERE mp.role IS DISTINCT FROM 'UTILITY') AS cs_games,
       avg(mp.damage_taken) AS avg_tank, avg(mp.damage) AS avg_damage, avg(mp.gold) AS avg_gold, avg(mp.cc_time) AS avg_cc,
       avg(mp.damage) FILTER (WHERE mp.role IS DISTINCT FROM 'UTILITY') AS avg_damage_ns,
       avg(mp.gold) FILTER (WHERE mp.role IS DISTINCT FROM 'UTILITY') AS avg_gold_ns,
       max(mp.killing_spree) AS max_spree, sum(mp.pentakills) AS pentas, sum(mp.solo_kills) AS solos,
       sum(mp.objectives_stolen) AS steals,
       sum(COALESCE(mp.heal_teammates,0) + COALESCE(mp.shield_teammates,0)) AS heal_shield,
       avg(mp.team_damage_pct) AS team_dmg_pct, avg(mp.skillshots_dodged) AS dodged,
       sum(mp.kills_near_enemy_turret) AS tower_kills, sum(mp.fountain_takedowns) AS fountain,
       sum(mp.smiteless_steals) FILTER (WHERE mp.role IS DISTINCT FROM 'JUNGLE') AS smiteless, sum(mp.ally_saves) AS saves,
       avg(CASE WHEN extract(hour FROM m.game_start AT TIME ZONE 'Europe/Paris') < 5 THEN 1 ELSE 0 END) AS night_share,
       avg(m.game_duration) AS avg_dur,
       stddev_samp((mp.kills + mp.assists)::float / GREATEST(mp.deaths, 1)) AS kda_sd
     FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id AND m.game_duration >= 300
     WHERE mp.puuid = ANY($1) AND m.queue_id IN ${SR}
     GROUP BY mp.puuid`,
    [puuids],
    client,
  );

  const aggs: Agg[] = rows.map((r) => ({
    puuid: r.puuid!,
    games: Number(r.games),
    wins: Number(r.wins),
    avgKills: Number(r.avg_kills),
    nsKills: Number(r.avg_kills_ns) || 0,
    avgDeaths: Number(r.avg_deaths),
    avgAssists: Number(r.avg_assists),
    avgDead: Number(r.avg_dead) || 0,
    avgLife: Number(r.avg_life) || 0,
    avgVision: Number(r.avg_vision),
    avgCspm: Number(r.avg_cspm) || 0,
    csGames: Number(r.cs_games) || 0,
    avgTank: Number(r.avg_tank) || 0,
    avgDamage: Number(r.avg_damage) || 0,
    avgGold: Number(r.avg_gold) || 0,
    nsDamage: Number(r.avg_damage_ns) || 0,
    nsGold: Number(r.avg_gold_ns) || 0,
    avgCc: Number(r.avg_cc) || 0,
    maxSpree: Number(r.max_spree) || 0,
    pentas: Number(r.pentas) || 0,
    solos: Number(r.solos) || 0,
    steals: Number(r.steals) || 0,
    healShield: Number(r.heal_shield) || 0,
    teamDmgPct: Number(r.team_dmg_pct) || 0,
    dodged: Number(r.dodged) || 0,
    towerKills: Number(r.tower_kills) || 0,
    fountain: Number(r.fountain) || 0,
    smiteless: Number(r.smiteless) || 0,
    saves: Number(r.saves) || 0,
    nightShare: Number(r.night_share) || 0,
    avgDur: Number(r.avg_dur) || 0,
    kdaSd: Number(r.kda_sd) || 0,
  }));

  // Longest win & loss streaks per player (for Heater / Tilted).
  const streakRows = async (won: boolean) =>
    query<{ puuid: string; streak: string }>(
      `WITH seq AS (
         SELECT mp.puuid, mp.win,
           row_number() OVER (PARTITION BY mp.puuid ORDER BY m.game_start)
           - row_number() OVER (PARTITION BY mp.puuid, mp.win ORDER BY m.game_start) AS grp
         FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id AND m.game_duration >= 300
         WHERE mp.puuid = ANY($1) AND m.queue_id IN ${SR}
       ),
       runs AS (SELECT puuid, count(*) AS streak FROM seq WHERE win = ${won ? "true" : "false"} GROUP BY puuid, grp)
       SELECT puuid, max(streak)::text AS streak FROM runs GROUP BY puuid`,
      [puuids],
      client,
    );
  const winStreak = new Map((await streakRows(true)).map((r) => [r.puuid, Number(r.streak)]));
  const lossStreak = new Map((await streakRows(false)).map((r) => [r.puuid, Number(r.streak)]));

  // Recent form — winrate over each player's last 15 SR games.
  const RECENT_N = 15;
  const recentRows = await query<{ puuid: string; rg: string; rw: string }>(
    `WITH recent AS (
       SELECT mp.puuid, mp.win,
         row_number() OVER (PARTITION BY mp.puuid ORDER BY m.game_start DESC) AS rn
       FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id AND m.game_duration >= 300
       WHERE mp.puuid = ANY($1) AND m.queue_id IN ${SR}
     )
     SELECT puuid,
       count(*) FILTER (WHERE rn <= ${RECENT_N}) AS rg,
       count(*) FILTER (WHERE rn <= ${RECENT_N} AND win) AS rw
     FROM recent GROUP BY puuid`,
    [puuids],
    client,
  );
  const recentForm = new Map(recentRows.map((r) => [r.puuid, { games: Number(r.rg), wins: Number(r.rw) }]));

  // Champion pool — top champ (share) + a "cursed" champ (plenty of games, losing).
  const champRows = await query<{ puuid: string; champion_name: string; g: string; w: string }>(
    `SELECT mp.puuid, mp.champion_name, count(*) AS g, count(*) FILTER (WHERE mp.win) AS w
     FROM match_participants mp JOIN matches m ON m.match_id = mp.match_id AND m.game_duration >= 300
     WHERE mp.puuid = ANY($1) AND m.queue_id IN ${SR}
     GROUP BY mp.puuid, mp.champion_name`,
    [puuids],
    client,
  );
  const champByPlayer = new Map<string, { name: string; g: number; w: number }[]>();
  for (const c of champRows) {
    const arr = champByPlayer.get(c.puuid) ?? [];
    arr.push({ name: c.champion_name, g: Number(c.g), w: Number(c.w) });
    champByPlayer.set(c.puuid, arr);
  }

  const out: Record<string, PlayerTag[]> = {};
  const add = (puuid: string, t: PlayerTag) => {
    (out[puuid] ??= []).push(t);
  };

  const elig = aggs.filter((a) => a.games >= MIN_GAMES);
  // Z-score model: every tag is a numeric metric measured against the WHOLE stack. We
  // compute each eligible player's z-score on that metric — (value − stack mean) / stack
  // stddev — and flip the sign for "low is the tag" metrics, so a tag's score is how many
  // standard deviations the player sits onto its favourable side. A player then keeps their
  // CAP_PER_PLAYER highest-scoring tags. No priorities, no axis-dedup, no absolute floors —
  // purely "how far from your stack are you, and in which direction". Comparison needs a real
  // distribution, so require >= 3 eligible players.
  if (elig.length < 3) return out;

  const wr = (a: Agg) => (a.games ? a.wins / a.games : 0);
  const kda = (a: Agg) => (a.avgKills + a.avgAssists) / Math.max(a.avgDeaths, 0.6);
  const poolSize = (a: Agg) => champByPlayer.get(a.puuid)?.length ?? 0;
  const champsOf = (a: Agg) => [...(champByPlayer.get(a.puuid) ?? [])].sort((x, y) => y.g - x.g);

  // One reading for a player on a tag's metric, plus the copy to show. `null` = the tag
  // doesn't apply to this player (no sample), so they're left out of its distribution.
  type Sample = { v: number; label?: string; key?: string; detail: string; meaning?: string };
  interface Spec {
    key: string;
    label: string;
    tone: TagTone;
    meaning: string;
    dir: 1 | -1; // +1 = high value earns the tag, -1 = low value earns it
    priority: number; // tiebreak only — orders tags that score the same z
    sample: (a: Agg) => Sample | null;
  }
  // Shorthand for a plain numeric tag: value + formatted detail.
  const m = (v: number, detail: string): Sample => ({ v, detail });

  const SPECS: Spec[] = [
    // ---- Deaths / damage taken / dodging ----
    { key: "int", label: "Int Andy", tone: "shame", dir: 1, priority: 92, meaning: "Dies the most per game in the stack.", sample: (a) => m(a.avgDeaths, `${a.avgDeaths.toFixed(1)} deaths/game`) },
    { key: "cockroach", label: "Cockroach", tone: "flex", dir: -1, priority: 74, meaning: "Dies the least per game — impossible to put down.", sample: (a) => m(a.avgDeaths, `${a.avgDeaths.toFixed(1)} deaths/game`) },
    { key: "punchingbag", label: "Punching Bag", tone: "neutral", dir: 1, priority: 56, meaning: "Eats the most damage per game — the frontline (or feeding).", sample: (a) => m(a.avgTank, `${num(a.avgTank)} taken/game`) },
    { key: "backline", label: "Backline", tone: "neutral", dir: -1, priority: 48, meaning: "Takes the least damage — safely out of range at all times.", sample: (a) => m(a.avgTank, `${num(a.avgTank)} taken/game`) },
    { key: "untouchable", label: "Untouchable", tone: "flex", dir: 1, priority: 57, meaning: "Dodges the most skillshots — slippery.", sample: (a) => m(a.dodged, `${a.dodged.toFixed(1)} dodged/game`) },
    { key: "hitbox", label: "Walking Hitbox", tone: "shame", dir: -1, priority: 71, meaning: "Dodges the fewest skillshots — walks into everything.", sample: (a) => m(a.dodged, `${a.dodged.toFixed(1)} dodged/game`) },

    // ---- Kills / damage / KDA ----
    { key: "bloodthirsty", label: "Bloodthirsty", tone: "flex", dir: 1, priority: 66, meaning: "Most kills per game in the stack.", sample: (a) => m(a.avgKills, `${a.avgKills.toFixed(1)} kills/game`) },
    // Pacifist / Decoration use NON-support figures (supports kill/deal little by design); a
    // primary support with no non-support sample is left out entirely.
    { key: "pacifist", label: "Pacifist", tone: "shame", dir: -1, priority: 58, meaning: "Fewest kills per game — a lover, not a fighter.", sample: (a) => (a.csGames >= CS_MIN ? m(a.nsKills, `${a.nsKills.toFixed(1)} kills/game`) : null) },
    { key: "glasscannon", label: "Glass Cannon", tone: "flex", dir: 1, priority: 68, meaning: "Deals the most damage to champions per game.", sample: (a) => m(a.avgDamage, `${num(a.avgDamage)} dmg/game`) },
    { key: "decoration", label: "Decoration", tone: "shame", dir: -1, priority: 64, meaning: "Least damage to champions — basically a ward with legs.", sample: (a) => (a.csGames >= CS_MIN ? m(a.nsDamage, `${num(a.nsDamage)} dmg/game`) : null) },
    { key: "kdaplayer", label: "KDA Player", tone: "neutral", dir: 1, priority: 55, meaning: "Best overall KDA — may or may not ever press a button.", sample: (a) => m(kda(a), `${kda(a).toFixed(1)} KDA`) },
    { key: "liability", label: "The Liability", tone: "shame", dir: -1, priority: 78, meaning: "Worst KDA in the stack.", sample: (a) => m(kda(a), `${kda(a).toFixed(1)} KDA`) },

    // ---- Win rate / streaks / form ----
    { key: "carry", label: "Stack Carry", tone: "flex", dir: 1, priority: 76, meaning: "Highest win rate in the group — the one carrying.", sample: (a) => m(wr(a), `${pctStr(wr(a))} over ${a.games}g`) },
    { key: "anchor", label: "Anchor", tone: "shame", dir: -1, priority: 82, meaning: "Lowest win rate in the group — the dead weight.", sample: (a) => m(wr(a), `${pctStr(wr(a))} over ${a.games}g`) },
    // Coinflip: closest to 50% = smallest |wr − 0.5|; negate so "high score" means closest.
    { key: "coinflip", label: "Coinflip", tone: "neutral", dir: 1, priority: 88, meaning: "Win rate closest to a perfect 50/50 — a walking coin toss.", sample: (a) => m(-Math.abs(wr(a) - 0.5), `${pctStr(wr(a))} over ${a.games}g`) },
    { key: "heater", label: "Heater", tone: "flex", dir: 1, priority: 72, meaning: "Longest win streak in the stack.", sample: (a) => { const s = winStreak.get(a.puuid) ?? 0; return m(s, `${s} wins in a row`); } },
    { key: "tilted", label: "Tilted", tone: "shame", dir: 1, priority: 84, meaning: "Longest losing streak in the stack — and kept queuing.", sample: (a) => { const s = lossStreak.get(a.puuid) ?? 0; return m(s, `${s} losses in a row`); } },
    { key: "inform", label: "In Form", tone: "flex", dir: 1, priority: 83, meaning: "Hottest recent form — best win rate over the last 15 games.", sample: (a) => { const f = recentForm.get(a.puuid); return f && f.games >= 8 ? m(f.wins / f.games, `${pctStr(f.wins / f.games)} over last ${f.games}`) : null; } },

    // ---- Farm / gold ----
    { key: "farm", label: "Farm King", tone: "flex", dir: 1, priority: 54, meaning: "Highest CS per minute — never misses a minion.", sample: (a) => (a.csGames >= CS_MIN ? m(a.avgCspm, `${a.avgCspm.toFixed(1)} CS/min`) : null) },
    { key: "minionhater", label: "Minion Hater", tone: "shame", dir: -1, priority: 50, meaning: "Lowest CS per minute — farming is beneath them.", sample: (a) => (a.csGames >= CS_MIN ? m(a.avgCspm, `${a.avgCspm.toFixed(1)} CS/min`) : null) },
    { key: "rich", label: "Gold Digger", tone: "neutral", dir: 1, priority: 44, meaning: "Earns the most gold per game.", sample: (a) => m(a.avgGold, `${num(a.avgGold)} gold/game`) },
    { key: "broke", label: "Broke", tone: "shame", dir: -1, priority: 42, meaning: "Earns the least gold — perpetually behind.", sample: (a) => (a.csGames >= CS_MIN ? m(a.nsGold, `${num(a.nsGold)} gold/game`) : null) },

    // ---- Vision / utility ----
    { key: "warden", label: "Warden", tone: "flex", dir: 1, priority: 49, meaning: "Highest vision score — actually buys control wards.", sample: (a) => m(a.avgVision, `${a.avgVision.toFixed(0)} vision avg`) },
    { key: "wardless", label: "Wardless", tone: "shame", dir: -1, priority: 70, meaning: "Lowest vision score — wards are someone else's problem.", sample: (a) => m(a.avgVision, `${a.avgVision.toFixed(0)} vision avg`) },
    { key: "teamplayer", label: "Team Player", tone: "flex", dir: 1, priority: 46, meaning: "Most assists per game — always in the fight for the team.", sample: (a) => m(a.avgAssists, `${a.avgAssists.toFixed(1)} assists/game`) },
    { key: "lonewolf", label: "Lone Wolf", tone: "neutral", dir: -1, priority: 45, meaning: "Fewest assists — does its own thing.", sample: (a) => m(a.avgAssists, `${a.avgAssists.toFixed(1)} assists/game`) },
    { key: "ccbot", label: "CC Machine", tone: "flex", dir: 1, priority: 47, meaning: "Locks enemies down the most (crowd-control time).", sample: (a) => m(a.avgCc, `${a.avgCc.toFixed(0)}s CC/game`) },
    { key: "medic", label: "Pocket Medic", tone: "flex", dir: 1, priority: 51, meaning: "Most healing + shielding poured into teammates.", sample: (a) => m(a.healShield, `${num(a.healShield)} healed/shielded`) },
    { key: "guardian", label: "Guardian Angel", tone: "flex", dir: 1, priority: 53, meaning: "Saved teammates from certain death the most.", sample: (a) => m(a.saves, `${a.saves} ally saves`) },

    // ---- Activity / playstyle ----
    { key: "nolife", label: "No-Life", tone: "neutral", dir: 1, priority: 62, meaning: "Most games tracked — touch grass.", sample: (a) => m(a.games, `${a.games} games`) },
    { key: "casual", label: "Casual", tone: "neutral", dir: -1, priority: 40, meaning: "Plays the least — a part-timer.", sample: (a) => m(a.games, `${a.games} games`) },
    { key: "nightowl", label: "Night Owl", tone: "shame", dir: 1, priority: 67, meaning: "Plays the most games after midnight. Sleep is a myth.", sample: (a) => m(a.nightShare, `${pctStr(a.nightShare)} after midnight`) },
    { key: "variety", label: "Commitment Issues", tone: "neutral", dir: 1, priority: 61, meaning: "Plays a different champion almost every game — no loyalty.", sample: (a) => m(poolSize(a), `${poolSize(a)} champions`) },
    { key: "comfort", label: "Comfort Picks", tone: "neutral", dir: -1, priority: 60, meaning: "Sticks to a tiny rotation of comfort champs.", sample: (a) => m(poolSize(a), `${poolSize(a)} champions`) },
    { key: "marathon", label: "Full 40", tone: "neutral", dir: 1, priority: 58, meaning: "Their games drag on — longest average game length in the stack.", sample: (a) => m(a.avgDur, `${Math.round(a.avgDur / 60)} min avg`) },
    { key: "speedrun", label: "Speedrunner", tone: "neutral", dir: -1, priority: 57, meaning: "In and out — shortest average games in the stack.", sample: (a) => m(a.avgDur, `${Math.round(a.avgDur / 60)} min avg`) },
    { key: "wildcard", label: "Wildcard", tone: "neutral", dir: 1, priority: 60, meaning: "Boom or bust — the biggest game-to-game swings in the stack.", sample: (a) => m(a.kdaSd, `±${a.kdaSd.toFixed(1)} KDA swing`) },
    { key: "reliable", label: "Mr. Reliable", tone: "neutral", dir: -1, priority: 59, meaning: "Same stat line every game — utterly predictable, in a good way.", sample: (a) => m(a.kdaSd, `±${a.kdaSd.toFixed(1)} KDA swing`) },

    // ---- Rare / meme achievements. Mostly counts, so the players who never did the thing
    // sit at/below the stack mean and never clear MIN_Z — only the ones who did earn it. ----
    { key: "solokiller", label: "Solo Killer", tone: "flex", dir: 1, priority: 52, meaning: "Most solo kills in the group — no help needed.", sample: (a) => m(a.solos, `${a.solos} solo kills`) },
    { key: "thief", label: "Objective Thief", tone: "flex", dir: 1, priority: 65, meaning: "Stole the most Barons/Dragons. Smite diff.", sample: (a) => m(a.steals, `${a.steals} steals`) },
    { key: "spree", label: "Spree King", tone: "flex", dir: 1, priority: 43, meaning: "Longest single killing spree without dying.", sample: (a) => m(a.maxSpree, `${a.maxSpree}-kill spree`) },
    { key: "pentaking", label: "Pentakill King", tone: "flex", dir: 1, priority: 69, meaning: "Most pentakills in the group. ACE!", sample: (a) => m(a.pentas, `${a.pentas} penta${a.pentas === 1 ? "" : "s"}`) },
    { key: "towerdiver", label: "Tower Diver", tone: "flex", dir: 1, priority: 59, meaning: "Most kills under the enemy turret — fearless (or stupid).", sample: (a) => m(a.towerKills, `${a.towerKills} kills under tower`) },
    { key: "fountain", label: "Fountain Diver", tone: "flex", dir: 1, priority: 67, meaning: "Got takedowns in the enemy fountain. Peak disrespect.", sample: (a) => m(a.fountain, `${a.fountain} fountain takedowns`) },
    { key: "smiteless", label: "Smiteless Thief", tone: "flex", dir: 1, priority: 66, meaning: "Stole an epic monster without smite — and not even as the jungler.", sample: (a) => m(a.smiteless, `${a.smiteless} steals off-role`) },

    // ---- Identity (champion-anchored): metric = how concentrated / how cursed, with the
    // champ riding along in the label & detail. Needs a meaningfully-played champ to apply. ----
    {
      key: "otp",
      label: "OTP",
      tone: "neutral",
      dir: 1,
      priority: 73,
      meaning: "One-tricks a champion.",
      sample: (a) => {
        const top = champsOf(a)[0];
        if (!top || top.g < 10) return null;
        const name = championDisplayName(top.name);
        const share = top.g / a.games;
        return { v: share, key: `otp:${top.name}`, label: `${name} OTP`, detail: `${Math.round(share * 100)}% on ${name}`, meaning: `One-tricks ${name} — plays it in a huge share of games.` };
      },
    },
    {
      key: "cursed",
      label: "Cursed",
      tone: "shame",
      dir: -1,
      priority: 80,
      meaning: "Keeps losing on a champ but won't drop it.",
      sample: (a) => {
        const worst = champsOf(a).filter((c) => c.g >= 12).sort((x, y) => x.w / x.g - y.w / y.g)[0];
        if (!worst) return null;
        const name = championDisplayName(worst.name);
        const w = worst.w / worst.g;
        return { v: w, key: `cursed:${worst.name}`, label: `Cursed: ${name}`, detail: `${Math.round(w * 100)}% over ${worst.g}g`, meaning: `Keeps losing on ${name} but refuses to drop it.` };
      },
    },
  ];

  // For each tag: gather samples across eligible players, standardise to z-scores, and award
  // the tag to anyone whose directional z clears MIN_Z. The z-score is stored in `lead` (the
  // selection signal the final cut sorts on).
  for (const spec of SPECS) {
    const taken = elig.map((a) => ({ a, s: spec.sample(a) })).filter((x): x is { a: Agg; s: Sample } => x.s !== null);
    if (taken.length < 2) continue; // can't standardise a single point
    const vals = taken.map((x) => x.s.v);
    const mean = vals.reduce((sum, v) => sum + v, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length);
    if (sd === 0) continue; // everyone identical — no separation to measure
    for (const { a, s } of taken) {
      const score = (spec.dir * (s.v - mean)) / sd;
      if (score <= 0) continue; // must at least be on the tag's favourable side of the mean
      add(a.puuid, {
        key: s.key ?? spec.key,
        label: s.label ?? spec.label,
        tone: spec.tone,
        meaning: s.meaning ?? spec.meaning,
        detail: s.detail,
        priority: spec.priority,
        cluster: spec.key,
        lead: score,
      });
    }
  }

  // Each player keeps their tags that clear minZ (genuine outliers), up to `cap`. If they
  // clear it on nothing, they still keep their single highest-z tag so no profile is blank.
  for (const puuid of Object.keys(out)) {
    const sorted = out[puuid]!.sort((x, y) => y.lead - x.lead || y.priority - x.priority);
    const kept = sorted.filter((t) => t.lead >= minZ).slice(0, cap);
    out[puuid] = kept.length ? kept : sorted.slice(0, 1);
  }
  return out;
}
