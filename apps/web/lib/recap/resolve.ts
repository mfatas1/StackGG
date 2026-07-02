import "server-only";
import {
  getPool,
  championDisplayName,
  seasonStartDate,
  seasonLabel as currentSeasonLabel,
} from "@crewstats/shared";
import {
  getRecapData,
  getCrewTags,
  getIdentities,
  rankBy,
  deriveStackIdentity,
  type RecapData,
  type RecapMemberAgg,
  type RankRow,
  type PlayerTag,
} from "@crewstats/stats";
import type {
  Recap,
  RecapWindow,
  RMember,
  RRankEntry,
  RComparison,
  RosterCard,
  Crime,
  Tone,
  RStatTable,
  PingTypeRow,
  RecapRecordView,
} from "./types";

const WEEK_MS = 7 * 86_400_000;
const MIN_DUO_GAMES = 3;
const MIN_OTP_GAMES = 8;
const MIN_MVP_GAMES = 5;

// ---- formatting ----
const num = (x: number) => Math.round(x).toLocaleString("en-US");
const one = (x: number) => x.toFixed(1);
const pctStr = (x: number) => `${Math.round(x * 100)}%`;
const hoursOf = (sec: number) => sec / 3600;
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
const isoDate = (epochSec: number) => new Date(epochSec * 1000).toISOString().slice(0, 10);

export async function getStackRecap(
  stackName: string,
  slug: string,
  puuids: string[],
  window: RecapWindow,
): Promise<Recap> {
  const pool = getPool();
  const since = window === "week" ? new Date(Date.now() - WEEK_MS) : seasonStartDate();
  const windowLabel = window === "week" ? "This Week" : currentSeasonLabel();

  const [data, identityMap, tagMap] = await Promise.all([
    getRecapData(pool, puuids, since),
    getIdentities(pool, puuids),
    getCrewTags(pool, puuids, { since }),
  ]);

  const aggByPuuid = new Map(data.members.map((m) => [m.puuid, m]));

  // signature champ = most-played this window (fallback: any champ, else empty)
  const champsByPuuid = new Map<string, { champion: string; games: number; wins: number }[]>();
  for (const c of data.champs) {
    const arr = champsByPuuid.get(c.puuid) ?? [];
    arr.push({ champion: c.champion, games: c.games, wins: c.wins });
    champsByPuuid.set(c.puuid, arr);
  }
  const sigChamp = (puuid: string): string => {
    const arr = [...(champsByPuuid.get(puuid) ?? [])].sort((a, b) => b.games - a.games);
    return arr[0]?.champion ?? "";
  };

  const nameOf = (puuid: string) => identityMap.get(puuid)?.riotId ?? "Unknown";

  const members: RMember[] = [...puuids]
    .map((puuid) => {
      const id = identityMap.get(puuid);
      const agg = aggByPuuid.get(puuid);
      return {
        puuid,
        name: id?.riotId ?? "Unknown",
        tag: id?.tag ?? "",
        champion: sigChamp(puuid),
        profileIcon: id?.profileIcon ?? null,
        games: agg?.games ?? 0,
      } satisfies RMember;
    })
    .sort((a, b) => b.games - a.games);

  const present = data.members; // members who actually have games in the window
  const hasData = present.length > 0 && present.some((m) => m.games > 0);

  // ---- comparison primitive ----
  const mkEntry = (puuid: string, value: number, display: string): RRankEntry => ({
    puuid,
    name: nameOf(puuid),
    champion: sigChamp(puuid),
    value,
    display,
  });
  const toComparison = (
    title: string,
    subject: string,
    rows: RankRow[],
    fmt: (v: number) => string,
    tone: Tone,
    leaderLine: (leader: RRankEntry, rows: RRankEntry[]) => string,
    limit = 8,
  ): RComparison => {
    const entries = rows.slice(0, limit).map((r) => mkEntry(r.puuid, r.value, fmt(r.value)));
    return { title, subject, entries, tone, leaderLine: entries.length ? leaderLine(entries[0]!, entries) : "" };
  };
  // ratio of leader to the runner-up (or to the average), for "X× the rest" lines
  const leadRatio = (rows: RankRow[]): number => {
    if (rows.length < 2) return 1;
    const top = rows[0]!.value;
    const next = rows[1]!.value;
    return next > 0 ? top / next : top > 0 ? 2 : 1;
  };
  const perGame = (m: RecapMemberAgg, v: number) => (m.games ? v / m.games : 0);
  const statTable = (columns: string[], rows: { puuid: string; cells: string[] }[]): RStatTable => ({
    columns,
    rows: rows.map((r) => ({ puuid: r.puuid, name: nameOf(r.puuid), champion: sigChamp(r.puuid), cells: r.cells })),
  });

  // ================= ACT I — THE DAMAGE =================
  const stackGames = data.matches.length;
  const groupSeconds = data.matches.reduce((s, m) => s + m.durationSec, 0);
  const hours = hoursOf(groupSeconds);

  const grind: Recap["grind"] = {
    stackGames,
    hours,
    perMember: toComparison(
      "Who could not log off",
      "games played",
      rankBy(present, (m) => m.games),
      (v) => `${num(v)} games`,
      "neutral",
      (leader, rows) =>
        rows.length > 1
          ? `${leader.name} queued ${num(leader.value)} times — more than anyone else in the stack.`
          : `${leader.name} carried the queue button all by themselves.`,
    ),
    comparisons: [
      { label: `${num(hours / 40)}×`, detail: "full-time work weeks, gone" },
      { label: `${num(hours / 11.4)}×`, detail: "the entire Lord of the Rings trilogy, extended" },
      { label: `${one(hours / 14)}×`, detail: "round-trips New York → Tokyo, by air" },
    ],
    table: statTable(
      ["Player", "Games", "Hours", "Win%"],
      [...present]
        .sort((a, b) => b.games - a.games)
        .map((m) => ({
          puuid: m.puuid,
          cells: [num(m.games), `${num(hoursOf(m.secondsPlayed))}h`, m.games ? pctStr(m.wins / m.games) : "—"],
        })),
    ),
  };

  // calendar
  const dayCounts = new Map<string, number>();
  for (const m of data.matches) {
    const d = isoDate(m.ts);
    dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
  }
  const days = [...dayCounts.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
  const peak = days.reduce<{ date: string; count: number } | null>((best, d) => (!best || d.count > best.count ? d : best), null);
  const calendar: Recap["calendar"] = {
    days,
    peak,
    nights: days.length,
    span: days.length ? { start: days[0]!.date, end: days[days.length - 1]!.date } : null,
  };

  // grey screen — group total (scale) + per-GAME ranking (fair across different game counts)
  const totalDeadSec = present.reduce((s, m) => s + m.timeDead, 0);
  const deadPerGameRows = rankBy(present, (m) => perGame(m, m.timeDead));
  const greyScreen: Recap["greyScreen"] = present.length
    ? {
        totalHours: hoursOf(totalDeadSec),
        ranking: toComparison(
          "Most time dead — per game",
          "time dead per game",
          deadPerGameRows,
          (v) => `${mmss(v)}/game`,
          "shame",
          (leader, rows) =>
            `${leader.name} averages ${mmss(leader.value)} dead every single game${
              rows.length > 1 ? ` — ${one(leadRatio(deadPerGameRows))}× the next-worst.` : "."
            }`,
        ),
        table: statTable(
          ["Player", "Dead/game", "Deaths/game", "Total dead"],
          [...present]
            .sort((a, b) => perGame(b, b.timeDead) - perGame(a, a.timeDead))
            .map((m) => ({
              puuid: m.puuid,
              cells: [mmss(perGame(m, m.timeDead)), one(m.avgDeaths), `${num(m.timeDead / 60)} min`],
            })),
        ),
      }
    : null;

  // marathon
  const longest = data.matches.reduce<RecapData["matches"][number] | null>(
    (best, m) => (!best || m.durationSec > best.durationSec ? m : best),
    null,
  );
  const marathon: Recap["marathon"] = longest
    ? { durationSec: longest.durationSec, matchId: longest.matchId, surrender: longest.surrender }
    : null;

  // ================= ACT II — THE CAST =================
  const roster = buildRoster(members, present, tagMap, nameOf, sigChamp);

  // ================= ACT III — THE CRIMES =================
  const shame = buildShame(present, nameOf, sigChamp, leadRatio);

  // pings — per-game, plainly explained, with a full per-type + per-member breakdown
  const totalPings = present.reduce((s, m) => s + m.pings.total, 0);
  const groupGamesForPings = present.reduce((s, m) => s + m.games, 0);
  const pings: Recap["pings"] = present.length && totalPings > 0
    ? {
        total: totalPings,
        perGame: groupGamesForPings ? totalPings / groupGamesForPings : 0,
        perMember: toComparison(
          "Loudest in the comms — pings per game",
          "pings per game",
          rankBy(present, (m) => perGame(m, m.pings.total)),
          (v) => `${one(v)}/game`,
          "neutral",
          (leader) => `${leader.name} fires ${one(leader.value)} pings a game. Allegedly to communicate.`,
        ),
        byType: buildPingByType(present, nameOf, sigChamp),
        table: statTable(
          ["Player", "Pings/game", "Total", "Most-used"],
          [...present]
            .sort((a, b) => perGame(b, b.pings.total) - perGame(a, a.pings.total))
            .map((m) => ({ puuid: m.puuid, cells: [one(perGame(m, m.pings.total)), num(m.pings.total), topPingLabel(m)] })),
        ),
      }
    : null;

  // throw of the window
  const throwGame: Recap["throwGame"] = data.throwGame
    ? {
        puuid: data.throwGame.puuid,
        name: nameOf(data.throwGame.puuid),
        champion: data.throwGame.champion,
        kills: data.throwGame.kills,
        deaths: data.throwGame.deaths,
        assists: data.throwGame.assists,
        matchId: data.throwGame.matchId,
        line: `${data.throwGame.kills}/${data.throwGame.deaths}/${data.throwGame.assists} on ${championDisplayName(
          data.throwGame.champion,
        )} — a performance for the ages.`,
      }
    : null;

  // surrenders
  const surrenderedMatches = data.matches.filter((m) => m.surrender).length;
  const ffRateRows = rankBy(present, (m) => (m.games >= 10 ? perGame(m, m.ffGames) : null));
  const surrenders: Recap["surrenders"] = surrenderedMatches > 0
    ? {
        total: surrenderedMatches,
        ranking: toComparison(
          "Quickest to throw in the towel",
          "share of games surrendered",
          ffRateRows,
          (v) => pctStr(v),
          "shame",
          (leader) => `${leader.name} voted to surrender in ${pctStr(leader.value)} of their games. Hope is not a strategy.`,
        ),
      }
    : null;

  // ================= ACT IV — THE GLORY =================
  const mvp = buildMvp(present, nameOf, sigChamp);

  const pentaTotal = present.reduce((s, m) => s + m.pentas, 0);
  const pentaRows = rankBy(present, (m) => (m.pentas > 0 ? m.pentas : null));
  const pentakills: Recap["pentakills"] = pentaTotal > 0
    ? {
        total: pentaTotal,
        ranking: toComparison(
          "Pentakill leaderboard",
          "pentakills",
          pentaRows,
          (v) => `${num(v)} penta${v === 1 ? "" : "s"}`,
          "flex",
          (leader, rows) =>
            rows.length > 1
              ? `${leader.name} owns ${num(leader.value)} of the stack's ${num(pentaTotal)} pentakills. ACE.`
              : `${leader.name} is the only one who's ever heard "PENTAKILL".`,
        ),
      }
    : null;

  const outnumberedRows = rankBy(present, (m) => (m.outnumbered > 0 ? perGame(m, m.outnumbered) : null));
  const outnumbered: Recap["outnumbered"] = outnumberedRows.length
    ? toComparison(
        "Most likely to win a fight they had no business winning",
        "outnumbered kills per game",
        outnumberedRows,
        (v) => `${one(v)}/game`,
        "flex",
        (leader) => `${leader.name} racks up ${one(leader.value)} outnumbered kills a game. Math is a suggestion.`,
      )
    : null;

  const perfectTotal = present.reduce((s, m) => s + m.perfectGames, 0);
  const perfectRows = rankBy(present, (m) => (m.perfectGames > 0 ? m.perfectGames : null));
  const flawless: Recap["flawless"] = perfectTotal > 0
    ? {
        total: perfectTotal,
        ranking: toComparison(
          "Cleanest hands in the stack",
          "flawless games",
          perfectRows,
          (v) => `${num(v)} flawless`,
          "flex",
          (leader) => `${leader.name} logged ${num(leader.value)} flawless games — won without dying once.`,
        ),
      }
    : null;

  const apmRows = rankBy(present, (m) => (m.secondsPlayed > 0 ? m.abilityUses / (m.secondsPlayed / 60) : null));
  const apm: Recap["apm"] = apmRows.length
    ? toComparison(
        "Closest thing we have to APM",
        "ability casts per minute",
        apmRows,
        (v) => `${one(v)} casts/min`,
        "neutral",
        (leader) =>
          `${leader.name} mashed ${one(leader.value)} abilities a minute. (Real APM isn't in Riot's API — enjoy this honest fake.)`,
      )
    : null;

  const duo = buildDuo(data, members, nameOf, sigChamp, present);

  const champPool = buildChampPool(data, present, nameOf, sigChamp);

  // ================= ACT V — CURTAIN CALL =================
  const groupGames = present.reduce((s, m) => s + m.games, 0);
  const groupWins = present.reduce((s, m) => s + m.wins, 0);
  const groupNight = present.reduce((s, m) => s + m.nightGames, 0);
  const distinctChamps = new Set(data.champs.map((c) => c.champion)).size;
  const identity = deriveStackIdentity({
    games: stackGames,
    hours,
    winrate: groupGames ? groupWins / groupGames : 0,
    avgDeaths: present.length ? present.reduce((s, m) => s + m.avgDeaths, 0) / present.length : 0,
    nightShare: groupGames ? groupNight / groupGames : 0,
    surrenderRate: stackGames ? surrenderedMatches / stackGames : 0,
    championVariety: stackGames ? distinctChamps / stackGames : 0,
    pentas: pentaTotal,
  });

  // single-game records — the funny "most in one game" moments
  const records = buildRecords(data, nameOf);

  // top champions across the stack, for the cover montage
  const cloudMap = new Map<string, number>();
  for (const c of data.champs) cloudMap.set(c.champion, (cloudMap.get(c.champion) ?? 0) + c.games);
  const topChampions = [...cloudMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c);

  return {
    meta: {
      stackName,
      slug,
      window,
      windowLabel,
      seasonLabel: currentSeasonLabel(),
      hasData,
      memberCount: members.length,
      topChampions,
    },
    members,
    grind,
    calendar,
    greyScreen,
    marathon,
    records,
    roster,
    shame,
    pings,
    throwGame,
    surrenders,
    mvp,
    pentakills,
    outnumbered,
    flawless,
    apm,
    duo,
    champPool,
    identity,
  };
}

// ---- roster ---------------------------------------------------------------

function tagToCard(t: PlayerTag): { title: string; proof: string; meaning: string; tone: Tone } {
  return { title: t.label, proof: t.detail, meaning: t.meaning, tone: t.tone };
}

function buildRoster(
  members: RMember[],
  present: RecapMemberAgg[],
  tagMap: Record<string, PlayerTag[]>,
  nameOf: (p: string) => string,
  sigChamp: (p: string) => string,
): RosterCard[] {
  const presentSet = new Set(present.map((m) => m.puuid));
  const fallback = fallbackArchetypes(present);
  const cards: RosterCard[] = [];
  for (const mem of members) {
    if (!presentSet.has(mem.puuid)) continue;
    const tags = tagMap[mem.puuid] ?? [];
    let primary: { title: string; proof: string; meaning: string; tone: Tone } | null = null;
    let secondary: { title: string; proof: string; tone: Tone } | null = null;
    let rankNote = "";
    if (tags.length) {
      primary = tagToCard(tags[0]!);
      rankNote = `${tags[0]!.lead.toFixed(1)}σ from the stack average`;
      if (tags[1]) {
        const s = tagToCard(tags[1]!);
        secondary = { title: s.title, proof: s.proof, tone: s.tone };
      }
    } else {
      const fb = fallback.get(mem.puuid);
      if (fb) {
        primary = { title: fb.title, proof: fb.proof, meaning: fb.meaning, tone: fb.tone };
        rankNote = fb.rankNote;
        secondary = fb.secondary;
      }
    }
    if (!primary) primary = { title: "The Regular", proof: `${mem.games} games`, meaning: "Showed up, queued, repeated.", tone: "neutral" };
    cards.push({
      puuid: mem.puuid,
      name: nameOf(mem.puuid),
      tag: mem.tag,
      champion: sigChamp(mem.puuid),
      profileIcon: mem.profileIcon,
      title: primary.title,
      proof: primary.proof,
      meaning: primary.meaning,
      tone: primary.tone,
      rankNote,
      secondary,
    });
  }
  return cards;
}

interface FbMetric {
  key: string;
  title: string;
  meaning: string;
  tone: Tone;
  dir: 1 | -1;
  val: (m: RecapMemberAgg) => number | null;
  proof: (m: RecapMemberAgg) => string;
}

// A compact, always-available archetype assigner (used for the week cut, or whenever the
// z-score tag engine has too small a sample). Each member gets the metric on which they're the
// biggest outlier vs the rest — comparison-first by construction.
function fallbackArchetypes(
  present: RecapMemberAgg[],
): Map<string, { title: string; proof: string; meaning: string; tone: Tone; rankNote: string; secondary: { title: string; proof: string; tone: Tone } | null }> {
  const perMin = (m: RecapMemberAgg, v: number) => (m.secondsPlayed > 0 ? v / (m.secondsPlayed / 60) : 0);
  const metrics: FbMetric[] = [
    { key: "int", title: "Int Andy", meaning: "Dies the most per game in the stack.", tone: "shame", dir: 1, val: (m) => m.avgDeaths, proof: (m) => `${one(m.avgDeaths)} deaths/game` },
    { key: "cockroach", title: "The Cockroach", meaning: "Dies the least — impossible to put down.", tone: "flex", dir: -1, val: (m) => m.avgDeaths, proof: (m) => `${one(m.avgDeaths)} deaths/game` },
    { key: "blood", title: "Bloodthirsty", meaning: "Most kills per game.", tone: "flex", dir: 1, val: (m) => (m.games ? m.kills / m.games : 0), proof: (m) => `${one(m.games ? m.kills / m.games : 0)} kills/game` },
    { key: "carry", title: "The Carry", meaning: "Highest carry impact in the group.", tone: "flex", dir: 1, val: (m) => m.carry, proof: () => `top carry score` },
    { key: "penta", title: "Pentakill King", meaning: "Most pentakills.", tone: "flex", dir: 1, val: (m) => (m.pentas > 0 ? m.pentas : null), proof: (m) => `${m.pentas} penta${m.pentas === 1 ? "" : "s"}` },
    { key: "hero", title: "My Hero", meaning: "Saved teammates from death the most.", tone: "flex", dir: 1, val: (m) => (m.saves > 0 ? m.saves : null), proof: (m) => `${m.saves} ally saves` },
    { key: "night", title: "Night Owl", meaning: "Plays the most after midnight.", tone: "shame", dir: 1, val: (m) => (m.games ? m.nightGames / m.games : 0), proof: (m) => `${pctStr(m.games ? m.nightGames / m.games : 0)} after midnight` },
    { key: "pinger", title: "The Pinger", meaning: "Fires the most pings — allegedly to communicate.", tone: "neutral", dir: 1, val: (m) => m.pings.total, proof: (m) => `${num(m.pings.total)} pings` },
    { key: "mia", title: "MIA Andy", meaning: "Spams the most '?' pings, still gets ganked.", tone: "shame", dir: 1, val: (m) => (m.pings.mia > 0 ? m.pings.mia : null), proof: (m) => `${num(m.pings.mia)} '?' pings` },
    { key: "1vx", title: "1vX Andy", meaning: "Wins fights they had no business winning.", tone: "flex", dir: 1, val: (m) => (m.outnumbered > 0 ? m.outnumbered : null), proof: (m) => `${m.outnumbered} outnumbered kills` },
    { key: "apm", title: "Button Masher", meaning: "Mashes more abilities per minute than anyone.", tone: "neutral", dir: 1, val: (m) => perMin(m, m.abilityUses), proof: (m) => `${one(perMin(m, m.abilityUses))} casts/min` },
    { key: "ff", title: "FF Andy", meaning: "On the surrender screen more than anyone.", tone: "shame", dir: 1, val: (m) => (m.ffGames > 0 ? m.ffGames : null), proof: (m) => `${m.ffGames} surrenders` },
    { key: "bait", title: "Bait Master", meaning: "Lures enemies under tower to their doom.", tone: "neutral", dir: 1, val: (m) => (m.baitKills > 0 ? m.baitKills : null), proof: (m) => `${m.baitKills} kills under own turret` },
  ];

  // z-score each metric over the present members
  const zByMetric = new Map<string, Map<string, number>>();
  for (const met of metrics) {
    const samples = present.map((m) => ({ p: m.puuid, v: met.val(m) })).filter((s): s is { p: string; v: number } => s.v !== null);
    if (samples.length < 2) continue;
    const mean = samples.reduce((s, x) => s + x.v, 0) / samples.length;
    const sd = Math.sqrt(samples.reduce((s, x) => s + (x.v - mean) ** 2, 0) / samples.length);
    if (sd === 0) continue;
    const zmap = new Map<string, number>();
    for (const s of samples) zmap.set(s.p, (met.dir * (s.v - mean)) / sd);
    zByMetric.set(met.key, zmap);
  }

  const out = new Map<string, { title: string; proof: string; meaning: string; tone: Tone; rankNote: string; secondary: { title: string; proof: string; tone: Tone } | null }>();
  const taken = new Set<string>();
  // assign in order of strongest available signal so headline archetypes go to clear outliers
  const candidates: { puuid: string; metric: FbMetric; z: number }[] = [];
  for (const m of present) {
    for (const met of metrics) {
      const z = zByMetric.get(met.key)?.get(m.puuid);
      if (z != null && z > 0) candidates.push({ puuid: m.puuid, metric: met, z });
    }
  }
  candidates.sort((a, b) => b.z - a.z);
  const secondaryFor = new Map<string, { title: string; proof: string; tone: Tone }>();
  for (const c of candidates) {
    const agg = present.find((m) => m.puuid === c.puuid)!;
    if (!out.has(c.puuid) && !taken.has(c.metric.key)) {
      out.set(c.puuid, {
        title: c.metric.title,
        proof: c.metric.proof(agg),
        meaning: c.metric.meaning,
        tone: c.metric.tone,
        rankNote: `${c.z.toFixed(1)}σ from the stack`,
        secondary: null,
      });
      taken.add(c.metric.key);
    } else if (out.has(c.puuid) && !secondaryFor.has(c.puuid)) {
      secondaryFor.set(c.puuid, { title: c.metric.title, proof: c.metric.proof(agg), tone: c.metric.tone });
    }
  }
  for (const [p, sec] of secondaryFor) {
    const card = out.get(p);
    if (card) card.secondary = sec;
  }
  return out;
}

// ---- shame ----------------------------------------------------------------

interface CrimeSpec {
  key: string;
  crime: string;
  charge: string; // the offense, plain English
  unit: string; // caption under the value
  fmt: (n: number) => string;
  dir: "desc" | "asc";
  minGames?: number;
  val: (m: RecapMemberAgg) => number | null;
}

// Deterministic 4-digit "case number" from a string, so it's stable across renders.
function caseNumber(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return String(1000 + (h % 9000));
}

const SHAME_CAP_PER_PERSON = 3;

function buildShame(
  present: RecapMemberAgg[],
  nameOf: (p: string) => string,
  sigChamp: (p: string) => string,
  leadRatio: (rows: RankRow[]) => number,
): Crime[] {
  const pg = (m: RecapMemberAgg, v: number) => (m.games ? v / m.games : 0);
  const kdaOf = (m: RecapMemberAgg) => (m.kills + m.assists) / Math.max(m.deaths, 1);
  const wr = (m: RecapMemberAgg) => (m.games ? m.wins / m.games : 0);
  const specs: CrimeSpec[] = [
    { key: "int", crime: "The Int King", charge: "dying over and over, every single game", unit: "deaths / game", fmt: one, dir: "desc", val: (m) => m.avgDeaths },
    { key: "grey", crime: "The Grey-Screen Enjoyer", charge: "spending more of each game dead than anyone", unit: "dead / game", fmt: mmss, dir: "desc", val: (m) => pg(m, m.timeDead) },
    { key: "liability", crime: "The Liability", charge: "posting the worst KDA in the stack", unit: "KDA", fmt: one, dir: "asc", minGames: 10, val: kdaOf },
    { key: "anchor", crime: "The Anchor", charge: "dragging the group's win rate to the bottom", unit: "win rate", fmt: pctStr, dir: "asc", minGames: 15, val: wr },
    { key: "mia", crime: "MIA Andy", charge: "spamming “?” and getting ganked anyway", unit: "“?” pings / game", fmt: one, dir: "desc", val: (m) => (m.pings.mia > 0 ? pg(m, m.pings.mia) : null) },
    { key: "backseat", crime: "The Backseat General", charge: "command-pinging a team that didn't ask", unit: "command pings / game", fmt: one, dir: "desc", val: (m) => (m.pings.command > 0 ? pg(m, m.pings.command) : null) },
    { key: "paranoid", crime: "The Paranoid", charge: "panic-pinging danger at everything that moves", unit: "danger pings / game", fmt: one, dir: "desc", val: (m) => (m.pings.danger > 0 ? pg(m, m.pings.danger) : null) },
    { key: "cryingwolf", crime: "Crying Wolf", charge: "screaming “assist me!” — usually far too late", unit: "assist pings / game", fmt: one, dir: "desc", val: (m) => (m.pings.assistMe > 0 ? pg(m, m.pings.assistMe) : null) },
    { key: "quitter", crime: "The Quitter", charge: "voting to surrender more than anybody", unit: "% of games /ff'd", fmt: pctStr, dir: "desc", minGames: 10, val: (m) => pg(m, m.ffGames) },
    { key: "gremlin", crime: "The Night Gremlin", charge: "refusing to sleep — most games after midnight", unit: "games after midnight", fmt: pctStr, dir: "desc", minGames: 10, val: (m) => pg(m, m.nightGames) },
    { key: "herald", crime: "Herald's Dance Partner", charge: "pointless little dances with the Rift Herald", unit: "herald dances", fmt: num, dir: "desc", val: (m) => (m.heraldDances > 0 ? m.heraldDances : null) },
    { key: "career", crime: "The Career Feeder", charge: "the most total deaths this whole season", unit: "deaths, all season", fmt: num, dir: "desc", val: (m) => m.deaths },
  ];
  // Each crime goes to its TRUE worst offender. A person can hold several (that's the joke), up
  // to a cap; past the cap the crime is skipped rather than misattributed to a non-leader.
  const crimes: Crime[] = [];
  const count = new Map<string, number>();
  for (const spec of specs) {
    const eligible = spec.minGames ? present.filter((m) => m.games >= spec.minGames!) : present;
    const rows = rankBy(eligible, spec.val, spec.dir);
    const winner = rows.find((r) => (count.get(r.puuid) ?? 0) < SHAME_CAP_PER_PERSON);
    if (!winner) continue;
    count.set(winner.puuid, (count.get(winner.puuid) ?? 0) + 1);
    const ratio = leadRatio(rows);
    const evidence =
      spec.dir === "desc" && rows.length > 1 && ratio > 1.15
        ? `worst in the stack · ${one(ratio)}× the next`
        : "worst in the stack";
    crimes.push({
      puuid: winner.puuid,
      name: nameOf(winner.puuid),
      champion: sigChamp(winner.puuid),
      caseNo: caseNumber(spec.key + winner.puuid),
      crime: spec.crime,
      charge: spec.charge,
      stat: spec.fmt(winner.value),
      unit: spec.unit,
      evidence,
    });
  }
  return crimes;
}

// ---- pings ----------------------------------------------------------------

// Each ping type: a funny label, a plain-English meaning, and how to read the member's count.
const PING_META: { key: string; label: string; meaning: string; val: (m: RecapMemberAgg) => number }[] = [
  { key: "mia", label: "“They’re Missing” (?)", meaning: "The “?” ping — where did the enemy go?", val: (m) => m.pings.mia },
  { key: "onMyWay", label: "“On My Way” (lying)", meaning: "The green arrow promising backup that rarely arrives.", val: (m) => m.pings.onMyWay },
  { key: "command", label: "The Backseat General", meaning: "Command pings — telling the team where to go, uninvited.", val: (m) => m.pings.command },
  { key: "danger", label: "Paranoid", meaning: "The “careful!” danger ping — everything is a trap.", val: (m) => m.pings.danger },
  { key: "needVision", label: "“Buy a Ward, Coward”", meaning: "“Place a ward here” — for somebody else to do.", val: (m) => m.pings.needVision },
  { key: "assistMe", label: "Cry for Help", meaning: "The “assist me!” ping — usually too late.", val: (m) => m.pings.assistMe },
  { key: "allIn", label: "“We’re Fighting Now”", meaning: "The all-in ping — let’s go, ready or not.", val: (m) => m.pings.allIn },
  { key: "getBack", label: "The Retreat Caller", meaning: "“Fall back” — the voice of reason, or cowardice.", val: (m) => m.pings.getBack },
];

const PING_LABELS: Record<string, string> = Object.fromEntries(PING_META.map((p) => [p.key, p.label]));

function topPingLabel(m: RecapMemberAgg): string {
  const best = [...PING_META].sort((a, b) => b.val(m) - a.val(m))[0];
  return best && best.val(m) > 0 ? PING_LABELS[best.key]! : "—";
}

function buildPingByType(
  present: RecapMemberAgg[],
  nameOf: (p: string) => string,
  sigChamp: (p: string) => string,
): PingTypeRow[] {
  const out: PingTypeRow[] = [];
  for (const meta of PING_META) {
    const total = present.reduce((s, m) => s + meta.val(m), 0);
    if (total <= 0) continue;
    // leader by per-game rate, with a real sample
    const rows = present
      .filter((m) => m.games >= 5 && meta.val(m) > 0)
      .map((m) => ({ puuid: m.puuid, rate: meta.val(m) / m.games }))
      .sort((a, b) => b.rate - a.rate);
    const leader = rows[0];
    if (!leader) continue;
    out.push({
      key: meta.key,
      label: meta.label,
      meaning: meta.meaning,
      leaderName: nameOf(leader.puuid),
      leaderChampion: sigChamp(leader.puuid),
      leaderPerGame: leader.rate,
      total,
    });
  }
  return out.sort((a, b) => b.total - a.total);
}

// ---- single-game records --------------------------------------------------

function buildRecords(data: RecapData, nameOf: (p: string) => string): RecapRecordView[] {
  const multi = (v: number) => (v >= 5 ? "PENTAKILL" : v === 4 ? "Quadrakill" : v === 3 ? "Triple Kill" : v === 2 ? "Double Kill" : `${v}×`);
  const metas: { key: string; title: string; tone?: string; fmt: (r: RecapData["records"][string]) => string; line: (name: string, champ: string, r: RecapData["records"][string]) => string; minable?: boolean }[] = [
    { key: "kills", title: "Most kills in a game", fmt: (r) => `${r.value}`, line: (n, c, r) => `${n} went ${r.kills}/${r.deaths}/${r.assists} on ${c}. Somebody had to hard-carry.` },
    { key: "deaths", title: "Most deaths in a game", fmt: (r) => `${r.value}`, line: (n, c, r) => `${n} died ${r.value} times in ONE game on ${c}. A real commitment to the bit.` },
    { key: "spree", title: "Biggest killing spree", fmt: (r) => `${r.value}`, minable: true, line: (n, c, r) => `${n} got ${r.value} kills without dying on ${c}. Unstoppable, briefly.` },
    { key: "multikill", title: "Best multikill", fmt: (r) => multi(r.value), minable: true, line: (n, c, r) => `${n} hit a ${multi(r.value).toLowerCase()} on ${c}. ACE.` },
    { key: "timeDead", title: "Most time dead in a game", fmt: (r) => mmss(r.value), minable: true, line: (n, c) => `${n} spent ${"that whole game"} watching the grey screen on ${c}.` },
    { key: "pings", title: "Most pings in a game", fmt: (r) => `${r.value}`, minable: true, line: (n, c, r) => `${n} fired ${r.value} pings in a single game on ${c}. The mute button is right there.` },
    { key: "outnumbered", title: "Most outnumbered kills in a game", fmt: (r) => `${r.value}`, minable: true, line: (n, c, r) => `${n} got ${r.value} kills while outnumbered on ${c}. No business winning that.` },
    { key: "damage", title: "Most damage in a game", fmt: (r) => num(r.value), minable: true, line: (n, c, r) => `${n} dealt ${num(r.value)} damage to champions on ${c}. A menace.` },
  ];
  const out: RecapRecordView[] = [];
  for (const meta of metas) {
    const r = data.records[meta.key];
    if (!r) continue;
    if (meta.minable && r.value <= 0) continue;
    const champ = championDisplayName(r.champion);
    out.push({
      key: meta.key,
      title: meta.title,
      holder: nameOf(r.puuid),
      champion: r.champion,
      value: meta.fmt(r),
      kda: `${r.kills}/${r.deaths}/${r.assists}`,
      line: meta.line(nameOf(r.puuid), champ, r),
      matchId: r.matchId,
    });
  }
  return out;
}

// ---- glory ----------------------------------------------------------------

function buildMvp(
  present: RecapMemberAgg[],
  nameOf: (p: string) => string,
  sigChamp: (p: string) => string,
): Recap["mvp"] {
  const eligible = present.filter((m) => m.games >= MIN_MVP_GAMES);
  const pool = eligible.length ? eligible : present;
  if (!pool.length) return null;
  const sorted = [...pool].sort((a, b) => b.carry - a.carry || b.mvpGames - a.mvpGames);
  const top = sorted[0]!;
  const runner = sorted[1] ?? null;
  const kda = (top.kills + top.assists) / Math.max(top.deaths, 1);
  return {
    puuid: top.puuid,
    name: nameOf(top.puuid),
    champion: sigChamp(top.puuid),
    carry: top.carry,
    winrate: top.games ? top.wins / top.games : 0,
    kda,
    mvpGames: top.mvpGames,
    runnerUp: runner ? { puuid: runner.puuid, name: nameOf(runner.puuid), carry: runner.carry } : null,
  };
}

function buildDuo(
  data: RecapData,
  members: RMember[],
  nameOf: (p: string) => string,
  sigChamp: (p: string) => string,
  present: RecapMemberAgg[],
): Recap["duo"] {
  const memRef = (puuid: string): RMember =>
    members.find((m) => m.puuid === puuid) ?? {
      puuid,
      name: nameOf(puuid),
      tag: "",
      champion: sigChamp(puuid),
      profileIcon: null,
      games: 0,
    };
  const qualified = data.duos.filter((d) => d.games >= MIN_DUO_GAMES);
  const deadliest = qualified.length
    ? [...qualified].sort((a, b) => b.wins / b.games - a.wins / a.games || b.games - a.games)[0]!
    : null;
  const bff = data.duos.length ? [...data.duos].sort((a, b) => b.games - a.games)[0]! : null;
  const heroRows = rankBy(present, (m) => (m.saves > 0 ? m.saves : null));
  const heroLeader = heroRows[0] ?? null;
  return {
    deadliest: deadliest
      ? {
          a: memRef(deadliest.a),
          b: memRef(deadliest.b),
          games: deadliest.games,
          wins: deadliest.wins,
          winrate: deadliest.wins / deadliest.games,
        }
      : null,
    bff: bff ? { a: memRef(bff.a), b: memRef(bff.b), games: bff.games } : null,
    hero: heroLeader
      ? { puuid: heroLeader.puuid, name: nameOf(heroLeader.puuid), champion: sigChamp(heroLeader.puuid), value: heroLeader.value, display: `${num(heroLeader.value)} ally saves` }
      : null,
  };
}

function buildChampPool(
  data: RecapData,
  present: RecapMemberAgg[],
  nameOf: (p: string) => string,
  sigChamp: (p: string) => string,
): Recap["champPool"] {
  const cloudMap = new Map<string, number>();
  for (const c of data.champs) cloudMap.set(c.champion, (cloudMap.get(c.champion) ?? 0) + c.games);
  const cloud = [...cloudMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([champion, count]) => ({ champion, count }));

  // OTP — highest single-champ share of any member (min games)
  const byPuuid = new Map<string, { champion: string; games: number }[]>();
  const distinctByPuuid = new Map<string, number>();
  for (const c of data.champs) {
    const arr = byPuuid.get(c.puuid) ?? [];
    arr.push({ champion: c.champion, games: c.games });
    byPuuid.set(c.puuid, arr);
    distinctByPuuid.set(c.puuid, (distinctByPuuid.get(c.puuid) ?? 0) + 1);
  }
  let otp: Recap["champPool"]["otp"] = null;
  for (const m of present) {
    const arr = (byPuuid.get(m.puuid) ?? []).sort((a, b) => b.games - a.games);
    const top = arr[0];
    if (!top || top.games < MIN_OTP_GAMES || !m.games) continue;
    const share = top.games / m.games;
    if (!otp || share > otp.share) otp = { puuid: m.puuid, name: nameOf(m.puuid), champion: top.champion, share, games: top.games };
  }
  let flexer: Recap["champPool"]["flexer"] = null;
  for (const m of present) {
    const distinct = distinctByPuuid.get(m.puuid) ?? 0;
    if (!flexer || distinct > flexer.distinct) flexer = { puuid: m.puuid, name: nameOf(m.puuid), distinct };
  }
  return { cloud, otp, flexer };
}
