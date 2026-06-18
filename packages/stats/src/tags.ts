import { query, type Queryable, QUEUES } from "@crewstats/shared";

/**
 * Porofessor-style per-player "tags" shown inline on the leaderboard. These are almost
 * all RELATIVE crew superlatives — the best (or worst) in the group at some metric, with
 * a funny name for each extreme. Plus a couple of identity tags (OTP / Cursed champ).
 * Summoner's Rift (ranked + flex) only, like the records.
 */
export type TagTone = "shame" | "flex" | "neutral";
export interface PlayerTag {
  key: string;
  label: string;
  tone: TagTone;
  meaning: string;
  detail: string;
  priority: number;
}

const SR = `(${QUEUES.RANKED_SOLO}, ${QUEUES.RANKED_FLEX})`;
const MIN_GAMES = 10;
const MAX_PER_PLAYER = 20; // sanity cap; the UI shows ~5 inline and the rest behind a "+N" pill

interface Agg {
  puuid: string;
  games: number;
  wins: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgDead: number;
  avgLife: number;
  avgVision: number;
  avgCspm: number;
  avgTank: number;
  avgDamage: number;
  avgGold: number;
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
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
const pctStr = (x: number) => `${Math.round(x * 100)}%`;
const num = (n: number) => Math.round(n).toLocaleString("en-US");

export async function getCrewTags(client: Queryable, puuids: string[]): Promise<Record<string, PlayerTag[]>> {
  if (puuids.length === 0) return {};

  const rows = await query<Record<string, string>>(
    `SELECT mp.puuid,
       count(*) AS games, count(*) FILTER (WHERE mp.win) AS wins,
       avg(mp.kills) AS avg_kills, avg(mp.deaths) AS avg_deaths, avg(mp.assists) AS avg_assists,
       avg(mp.time_dead) AS avg_dead, avg(mp.longest_life) AS avg_life, avg(mp.vision_score) AS avg_vision,
       avg(mp.cs::float / GREATEST(m.game_duration, 1) * 60) AS avg_cspm,
       avg(mp.damage_taken) AS avg_tank, avg(mp.damage) AS avg_damage, avg(mp.gold) AS avg_gold, avg(mp.cc_time) AS avg_cc,
       max(mp.killing_spree) AS max_spree, sum(mp.pentakills) AS pentas, sum(mp.solo_kills) AS solos,
       sum(mp.objectives_stolen) AS steals,
       sum(COALESCE(mp.heal_teammates,0) + COALESCE(mp.shield_teammates,0)) AS heal_shield,
       avg(mp.team_damage_pct) AS team_dmg_pct, avg(mp.skillshots_dodged) AS dodged,
       sum(mp.kills_near_enemy_turret) AS tower_kills, sum(mp.fountain_takedowns) AS fountain,
       sum(mp.smiteless_steals) AS smiteless, sum(mp.ally_saves) AS saves,
       avg(CASE WHEN extract(hour FROM m.game_start AT TIME ZONE 'Europe/Paris') < 5 THEN 1 ELSE 0 END) AS night_share
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
    avgDeaths: Number(r.avg_deaths),
    avgAssists: Number(r.avg_assists),
    avgDead: Number(r.avg_dead) || 0,
    avgLife: Number(r.avg_life) || 0,
    avgVision: Number(r.avg_vision),
    avgCspm: Number(r.avg_cspm),
    avgTank: Number(r.avg_tank) || 0,
    avgDamage: Number(r.avg_damage) || 0,
    avgGold: Number(r.avg_gold) || 0,
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
  // Relative superlatives ("best/worst in the stack") only mean something with a real
  // group to compare. With 1–2 eligible members one person wins every extreme (both
  // "Int Andy" and "Cockroach"), so suppress them below this floor — identity tags
  // (OTP / cursed champ) still show for solo and duo profiles.
  const enough = elig.length >= 3;
  const wr = (a: Agg) => (a.games ? a.wins / a.games : 0);
  const kda = (a: Agg) => (a.avgKills + a.avgAssists) / Math.max(a.avgDeaths, 0.6);

  // Absolute floors: a superlative should reflect an objectively good/bad number, not
  // just the best/worst in *this* stack — so a winning record isn't branded "Anchor"
  // and a strong line isn't branded "Liability" merely for trailing better teammates.
  // Grounded in commonly-cited LoL benchmarks: KDA >2 is "good" and >3 strong; ~5-6
  // deaths/game is average; non-support farming sits ~5-6 CS/min and 7+ is strong;
  // vision is role-skewed (supports far higher); ~6 kills & ~9 assists/game are typical.
  // These are gates on the relative winner, so they only ever *suppress* an undeserved
  // tag — never invent one. Role/length-dependent totals (champ damage, gold, damage
  // taken) are intentionally left as pure stack-relative: no fair absolute line exists
  // across roles and game lengths. Tune any number here in one place.
  const FLOOR = {
    carryWr: 0.5, //  Stack Carry — must actually be winning
    anchorWr: 0.5, // Anchor — must actually be losing (strictly below even)
    goodKda: 3.0, //  KDA Player — genuinely strong KDA
    badKda: 2.0, //   Liability — strictly below an even 2.0 KDA
    manyDeaths: 7, // Int Andy — objectively high deaths/game
    fewDeaths: 4, //  Cockroach — objectively durable
    goodCspm: 6.5, // Farm King — strong farming
    lowCspm: 5, //    Minion Hater — weak farming
    goodVision: 40, //Warden — genuinely high vision
    lowVision: 25, // Wardless — low vision
    manyKills: 8, //  Bloodthirsty — objectively high kills/game
    manyAssists: 10, //Team Player — objectively high assists/game
  };

  // Award a relative superlative: holder = the player at the extreme (max or min) of a
  // metric, among players with enough games (optionally a stricter pool).
  const rel = (
    dir: "max" | "min",
    f: (a: Agg) => number,
    t: { key: string; label: string; tone: TagTone; priority: number; meaning: string; detail: (a: Agg) => string },
    opts: { gate?: (a: Agg) => boolean; pool?: Agg[] } = {},
  ) => {
    if (!enough) return;
    const pool = (opts.pool ?? elig).filter(opts.gate ?? (() => true));
    if (!pool.length) return;
    const holder = pool.reduce((b, a) => ((dir === "max" ? f(a) > f(b) : f(a) < f(b)) ? a : b));
    add(holder.puuid, { key: t.key, label: t.label, tone: t.tone, priority: t.priority, meaning: t.meaning, detail: t.detail(holder) });
  };

  // ---- Deaths / survival ----
  // Int Andy only for objectively high deaths; Cockroach only for objectively low ones.
  rel("max", (a) => a.avgDeaths, { key: "int", label: "Int Andy", tone: "shame", priority: 92, meaning: "Dies the most per game in the stack.", detail: (a) => `${a.avgDeaths.toFixed(1)} deaths/game` }, { gate: (a) => a.avgDeaths >= FLOOR.manyDeaths });
  rel("min", (a) => a.avgDeaths, { key: "cockroach", label: "Cockroach", tone: "flex", priority: 74, meaning: "Dies the least per game — impossible to put down.", detail: (a) => `${a.avgDeaths.toFixed(1)} deaths/game` }, { gate: (a) => a.avgDeaths <= FLOOR.fewDeaths });

  // ---- Kills / damage ----
  rel("max", (a) => a.avgKills, { key: "bloodthirsty", label: "Bloodthirsty", tone: "flex", priority: 66, meaning: "Most kills per game in the stack.", detail: (a) => `${a.avgKills.toFixed(1)} kills/game` }, { gate: (a) => a.avgKills >= FLOOR.manyKills });
  rel("min", (a) => a.avgKills, { key: "pacifist", label: "Pacifist", tone: "neutral", priority: 58, meaning: "Fewest kills per game — a lover, not a fighter.", detail: (a) => `${a.avgKills.toFixed(1)} kills/game` });
  rel("max", (a) => a.avgDamage, { key: "glasscannon", label: "Glass Cannon", tone: "flex", priority: 68, meaning: "Deals the most damage to champions per game.", detail: (a) => `${num(a.avgDamage)} dmg/game` });
  rel("min", (a) => a.avgDamage, { key: "decoration", label: "Decoration", tone: "shame", priority: 64, meaning: "Least damage to champions — basically a ward with legs.", detail: (a) => `${num(a.avgDamage)} dmg/game` });
  rel("max", (a) => a.avgTank, { key: "punchingbag", label: "Punching Bag", tone: "neutral", priority: 56, meaning: "Eats the most damage per game — the frontline (or feeding).", detail: (a) => `${num(a.avgTank)} taken/game` });
  rel("min", (a) => a.avgTank, { key: "backline", label: "Backline", tone: "neutral", priority: 48, meaning: "Takes the least damage — safely out of range at all times.", detail: (a) => `${num(a.avgTank)} taken/game` });

  // ---- Win rate / streaks ----
  // Carry only counts if they're actually winning; Anchor only if actually losing — a
  // 50%+ record shouldn't be branded dead weight just for trailing the rest of the group.
  rel("max", wr, { key: "carry", label: "Stack Carry", tone: "flex", priority: 76, meaning: "Highest win rate in the group — the one carrying.", detail: (a) => `${pctStr(wr(a))} over ${a.games}g` }, { gate: (a) => wr(a) > FLOOR.carryWr });
  rel("min", wr, { key: "anchor", label: "Anchor", tone: "shame", priority: 82, meaning: "Lowest win rate in the group — the dead weight.", detail: (a) => `${pctStr(wr(a))} over ${a.games}g` }, { gate: (a) => wr(a) < FLOOR.anchorWr });
  // Coinflip — closest to a perfect 50/50.
  {
    const pool = elig;
    if (enough && pool.length) {
      const h = pool.reduce((b, a) => (Math.abs(wr(a) - 0.5) < Math.abs(wr(b) - 0.5) ? a : b));
      add(h.puuid, { key: "coinflip", label: "Coinflip", tone: "neutral", priority: 88, meaning: "Win rate closest to a perfect 50/50 — a walking coin toss.", detail: `${pctStr(wr(h))} over ${h.games}g` });
    }
  }
  {
    const h = elig.map((a) => ({ a, s: winStreak.get(a.puuid) ?? 0 })).filter((x) => x.s >= 4).sort((x, y) => y.s - x.s)[0];
    if (enough && h) add(h.a.puuid, { key: "heater", label: "Heater", tone: "flex", priority: 72, meaning: "Longest win streak in the stack.", detail: `${h.s} wins in a row` });
  }
  {
    const h = elig.map((a) => ({ a, s: lossStreak.get(a.puuid) ?? 0 })).filter((x) => x.s >= 4).sort((x, y) => y.s - x.s)[0];
    if (enough && h) add(h.a.puuid, { key: "tilted", label: "Tilted", tone: "shame", priority: 84, meaning: "Longest losing streak in the stack — and kept queuing.", detail: `${h.s} losses in a row` });
  }
  {
    // In Form — best winrate over the last 15 games (min 8 to qualify).
    const pool = elig
      .map((a) => ({ a, f: recentForm.get(a.puuid) }))
      .filter((x) => x.f && x.f.games >= 8)
      .map((x) => ({ a: x.a, wr: x.f!.wins / x.f!.games, n: x.f!.games }))
      // "In Form" should mean actually hot — a winning recent record, not just the
      // least-cold player in a slumping stack.
      .filter((x) => x.wr >= 0.5);
    if (enough && pool.length) {
      const h = pool.reduce((b, x) => (x.wr > b.wr || (x.wr === b.wr && x.n > b.n) ? x : b));
      add(h.a.puuid, { key: "inform", label: "In Form", tone: "flex", priority: 83, meaning: "Hottest recent form — best win rate over the last 15 games.", detail: `${pctStr(h.wr)} over last ${h.n}` });
    }
  }

  // ---- Farm / gold ----
  // Farm King needs genuinely strong CS; Minion Hater needs genuinely weak CS. (Supports
  // farm little by design, so this still mostly lands on non-supports — see note below.)
  rel("max", (a) => a.avgCspm, { key: "farm", label: "Farm King", tone: "flex", priority: 54, meaning: "Highest CS per minute — never misses a minion.", detail: (a) => `${a.avgCspm.toFixed(1)} CS/min` }, { gate: (a) => a.avgCspm >= FLOOR.goodCspm });
  rel("min", (a) => a.avgCspm, { key: "minionhater", label: "Minion Hater", tone: "shame", priority: 50, meaning: "Lowest CS per minute — farming is beneath them.", detail: (a) => `${a.avgCspm.toFixed(1)} CS/min` }, { gate: (a) => a.avgCspm < FLOOR.lowCspm });
  rel("max", (a) => a.avgGold, { key: "rich", label: "Gold Digger", tone: "neutral", priority: 44, meaning: "Earns the most gold per game.", detail: (a) => `${num(a.avgGold)} gold/game` });
  rel("min", (a) => a.avgGold, { key: "broke", label: "Broke", tone: "shame", priority: 42, meaning: "Earns the least gold — perpetually behind.", detail: (a) => `${num(a.avgGold)} gold/game` });

  // ---- Vision / utility ----
  // Vision is role-skewed (supports run far higher), so these floors keep Wardless off
  // someone with decent vision and Warden off a stack where nobody really wards.
  rel("min", (a) => a.avgVision, { key: "wardless", label: "Wardless", tone: "shame", priority: 70, meaning: "Lowest vision score — wards are someone else's problem.", detail: (a) => `${a.avgVision.toFixed(0)} vision avg` }, { gate: (a) => a.avgVision < FLOOR.lowVision });
  rel("max", (a) => a.avgVision, { key: "warden", label: "Warden", tone: "flex", priority: 49, meaning: "Highest vision score — actually buys control wards.", detail: (a) => `${a.avgVision.toFixed(0)} vision avg` }, { gate: (a) => a.avgVision >= FLOOR.goodVision });
  rel("max", (a) => a.avgAssists, { key: "teamplayer", label: "Team Player", tone: "flex", priority: 46, meaning: "Most assists per game — always in the fight for the team.", detail: (a) => `${a.avgAssists.toFixed(1)} assists/game` }, { gate: (a) => a.avgAssists >= FLOOR.manyAssists });
  rel("min", (a) => a.avgAssists, { key: "lonewolf", label: "Lone Wolf", tone: "neutral", priority: 45, meaning: "Fewest assists — does its own thing.", detail: (a) => `${a.avgAssists.toFixed(1)} assists/game` });
  rel("max", (a) => a.avgCc, { key: "ccbot", label: "CC Machine", tone: "flex", priority: 47, meaning: "Locks enemies down the most (crowd-control time).", detail: (a) => `${a.avgCc.toFixed(0)}s CC/game` }, { gate: (a) =>a.avgCc > 0 });
  rel("max", (a) => a.healShield, { key: "medic", label: "Pocket Medic", tone: "flex", priority: 51, meaning: "Most healing + shielding poured into teammates.", detail: (a) => `${num(a.healShield)} healed/shielded` }, { gate: (a) =>a.healShield > 0 });

  // ---- KDA ----
  // KDA Player only if the best KDA is genuinely strong; Liability only if the worst is
  // actually poor — a 2.1+ KDA is respectable and shouldn't be branded a liability.
  rel("max", kda, { key: "kdaplayer", label: "KDA Player", tone: "neutral", priority: 55, meaning: "Best overall KDA — may or may not ever press a button.", detail: (a) => `${kda(a).toFixed(1)} KDA` }, { gate: (a) => kda(a) >= FLOOR.goodKda });
  rel("min", kda, { key: "liability", label: "The Liability", tone: "shame", priority: 78, meaning: "Worst KDA in the stack.", detail: (a) => `${kda(a).toFixed(1)} KDA` }, { gate: (a) => kda(a) < FLOOR.badKda });

  // ---- Activity / misc ----
  rel("max", (a) => a.games, { key: "nolife", label: "No-Life", tone: "neutral", priority: 62, meaning: "Most games tracked — touch grass.", detail: (a) => `${a.games} games` });
  rel("min", (a) => a.games, { key: "casual", label: "Casual", tone: "neutral", priority: 40, meaning: "Plays the least — a part-timer.", detail: (a) => `${a.games} games` });
  rel("max", (a) => a.nightShare, { key: "nightowl", label: "Night Owl", tone: "shame", priority: 67, meaning: "Plays the most games after midnight. Sleep is a myth.", detail: (a) => `${pctStr(a.nightShare)} after midnight` }, { gate: (a) =>a.nightShare >= 0.25 });
  rel("max", (a) => a.solos, { key: "solokiller", label: "Solo Killer", tone: "flex", priority: 52, meaning: "Most solo kills in the group — no help needed.", detail: (a) => `${a.solos} solo kills` }, { gate: (a) =>a.solos > 0 });
  rel("max", (a) => a.steals, { key: "thief", label: "Objective Thief", tone: "flex", priority: 65, meaning: "Stole the most Barons/Dragons. Smite diff.", detail: (a) => `${a.steals} steals` }, { gate: (a) =>a.steals > 0 });
  rel("max", (a) => a.maxSpree, { key: "spree", label: "Spree King", tone: "flex", priority: 43, meaning: "Longest single killing spree without dying.", detail: (a) => `${a.maxSpree}-kill spree` }, { gate: (a) =>a.maxSpree >= 8 });
  rel("max", (a) => a.pentas, { key: "pentaking", label: "Pentakill King", tone: "flex", priority: 69, meaning: "Most pentakills in the group. ACE!", detail: (a) => `${a.pentas} penta${a.pentas > 1 ? "s" : ""}` }, { gate: (a) => a.pentas > 0 });

  // ---- Challenge-derived (migration 003) ----
  rel("max", (a) => a.dodged, { key: "untouchable", label: "Untouchable", tone: "flex", priority: 57, meaning: "Dodges the most skillshots — slippery.", detail: (a) => `${a.dodged.toFixed(1)} dodged/game` }, { gate: (a) => a.dodged > 0 });
  rel("min", (a) => a.dodged, { key: "hitbox", label: "Walking Hitbox", tone: "shame", priority: 71, meaning: "Dodges the fewest skillshots — walks into everything.", detail: (a) => `${a.dodged.toFixed(1)} dodged/game` }, { gate: (a) => a.dodged > 0 });
  rel("max", (a) => a.towerKills, { key: "towerdiver", label: "Tower Diver", tone: "flex", priority: 59, meaning: "Most kills under the enemy turret — fearless (or stupid).", detail: (a) => `${a.towerKills} kills under tower` }, { gate: (a) => a.towerKills > 0 });
  rel("max", (a) => a.fountain, { key: "fountain", label: "Fountain Diver", tone: "flex", priority: 67, meaning: "Got takedowns in the enemy fountain. Peak disrespect.", detail: (a) => `${a.fountain} fountain takedowns` }, { gate: (a) => a.fountain > 0 });
  rel("max", (a) => a.smiteless, { key: "smiteless", label: "Smiteless Thief", tone: "flex", priority: 66, meaning: "Stole an epic monster WITHOUT smite. Filthy.", detail: (a) => `${a.smiteless} smiteless steals` }, { gate: (a) => a.smiteless > 0 });
  rel("max", (a) => a.saves, { key: "guardian", label: "Guardian Angel", tone: "flex", priority: 53, meaning: "Saved teammates from certain death the most.", detail: (a) => `${a.saves} ally saves` }, { gate: (a) => a.saves > 0 });

  // ---- Identity (per-player, not relative) ----
  for (const a of aggs) {
    if (a.games < MIN_GAMES) continue;
    const champs = (champByPlayer.get(a.puuid) ?? []).sort((x, y) => y.g - x.g);
    const top = champs[0];
    if (top && top.g >= 10 && top.g / a.games >= 0.4) {
      add(a.puuid, { key: `otp:${top.name}`, label: `${top.name} OTP`, tone: "neutral", priority: 73, meaning: `One-tricks ${top.name} — plays it in a huge share of games.`, detail: `${Math.round((top.g / a.games) * 100)}% on ${top.name}` });
    }
    const cursed = champs.filter((c) => c.g >= 12 && c.w / c.g <= 0.42).sort((x, y) => x.w / x.g - y.w / y.g)[0];
    if (cursed) {
      add(a.puuid, { key: `cursed:${cursed.name}`, label: `Cursed: ${cursed.name}`, tone: "shame", priority: 80, meaning: `Keeps losing on ${cursed.name} but refuses to drop it.`, detail: `${Math.round((cursed.w / cursed.g) * 100)}% over ${cursed.g}g` });
    }
  }

  for (const puuid of Object.keys(out)) {
    out[puuid] = out[puuid]!.sort((x, y) => y.priority - x.priority).slice(0, MAX_PER_PLAYER);
  }
  return out;
}
