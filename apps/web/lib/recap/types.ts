// The typed Recap object the resolver produces and every scene component consumes. Pure types
// only — no server imports — so client scene components can import this freely.

export type RecapWindow = "season" | "week";
export type Tone = "shame" | "flex" | "neutral";

export interface RMember {
  puuid: string;
  name: string; // riot game name
  tag: string; // tagline
  champion: string; // signature champion this window (most played) — splash/portrait
  profileIcon: number | null;
  games: number;
}

/** One member's standing on a metric, pre-formatted for display. */
export interface RRankEntry {
  puuid: string;
  name: string;
  champion: string;
  value: number;
  display: string;
}

/** A full member-vs-member comparison: the spine of nearly every scene. */
export interface RComparison {
  title: string;
  subject: string; // what's being measured, e.g. "deaths per game"
  entries: RRankEntry[]; // leader-first
  leaderLine: string; // the roast about whoever tops it
  tone: Tone;
}

export interface RosterCard {
  puuid: string;
  name: string;
  tag: string;
  champion: string;
  profileIcon: number | null;
  title: string;
  proof: string;
  meaning: string;
  tone: Tone;
  rankNote: string; // comparison context, e.g. "1.8× the stack average"
  secondary: { title: string; proof: string; tone: Tone } | null;
}

export interface Crime {
  puuid: string;
  name: string;
  champion: string; // the defendant's most-played champ (their "face")
  caseNo: string; // e.g. "0417"
  crime: string; // the alias, e.g. "The Grey-Screen Enjoyer"
  charge: string; // plain-English offense
  stat: string; // headline value, e.g. "8.1"
  unit: string; // e.g. "deaths / game"
  evidence: string; // e.g. "worst in the stack · 2.3× the next"
}

export interface PingCallout {
  key: string;
  label: string; // funny label, e.g. "On My Way (lying)"
  blurb: string;
  puuid: string;
  name: string;
  champion: string;
  count: number;
  vs: string; // comparison vs the rest
}

/** A generic dense table for the "show full breakdown" expandable panels. */
export interface RStatTable {
  columns: string[]; // header labels (first column is always the player)
  rows: { puuid: string; name: string; champion: string; cells: string[] }[];
}

/** One ping type, plainly explained, with who leads it (per game). */
export interface PingTypeRow {
  key: string;
  label: string; // funny label, e.g. "On My Way (lying)"
  meaning: string; // plain-English: what this ping actually is
  leaderName: string;
  leaderChampion: string;
  leaderPerGame: number; // leader's per-game rate
  total: number; // stack total for this type
}

/** A single-game peak, framed for a record card. */
export interface RecapRecordView {
  key: string;
  title: string; // "Most kills in a game"
  holder: string;
  champion: string;
  value: string; // headline value
  kda: string; // "21/4/9"
  line: string; // the joke
  matchId: string;
}

export interface Recap {
  meta: {
    stackName: string;
    slug: string;
    window: RecapWindow;
    windowLabel: string;
    seasonLabel: string;
    hasData: boolean;
    memberCount: number;
    topChampions: string[]; // most-played across the stack, for the cover montage
  };
  members: RMember[];

  // ACT I — THE DAMAGE
  grind: {
    stackGames: number;
    hours: number;
    perMember: RComparison; // who queued the most
    comparisons: { label: string; detail: string }[]; // hours made relatable
    table: RStatTable; // full per-member breakdown (expandable)
  };
  calendar: {
    days: { date: string; count: number }[];
    peak: { date: string; count: number } | null;
    nights: number;
    span: { start: string; end: string } | null;
  };
  greyScreen: { totalHours: number; ranking: RComparison; table: RStatTable } | null;
  marathon: { durationSec: number; matchId: string; surrender: boolean } | null;

  // single-game moments ("most in one game")
  records: RecapRecordView[];

  // ACT II — THE CAST
  roster: RosterCard[];

  // ACT III — THE CRIMES
  shame: Crime[];
  pings: {
    total: number;
    perGame: number; // stack-wide pings per game
    perMember: RComparison; // who pings most, per game
    byType: PingTypeRow[]; // each ping type explained, with its leader
    table: RStatTable; // full per-member ping breakdown (expandable)
  } | null;
  throwGame: {
    puuid: string;
    name: string;
    champion: string;
    kills: number;
    deaths: number;
    assists: number;
    matchId: string;
    line: string;
  } | null;
  surrenders: { total: number; ranking: RComparison } | null;

  // ACT IV — THE GLORY
  mvp: {
    puuid: string;
    name: string;
    champion: string;
    carry: number;
    winrate: number;
    kda: number;
    mvpGames: number;
    runnerUp: { puuid: string; name: string; carry: number } | null;
  } | null;
  pentakills: { total: number; ranking: RComparison } | null;
  outnumbered: RComparison | null;
  flawless: { total: number; ranking: RComparison } | null;
  apm: RComparison | null;
  duo: {
    deadliest: { a: RMember; b: RMember; games: number; wins: number; winrate: number } | null;
    bff: { a: RMember; b: RMember; games: number } | null;
    hero: RRankEntry | null;
  };
  champPool: {
    cloud: { champion: string; count: number }[];
    otp: { puuid: string; name: string; champion: string; share: number; games: number } | null;
    flexer: { puuid: string; name: string; distinct: number } | null;
  };

  // ACT V — CURTAIN CALL
  identity: { key: string; name: string; blurb: string };
}
