import type { RankInfo } from "@crewstats/shared";
// Import from the leaf subpath, NOT the package barrel: format.ts is pulled into client
// bundles, and the barrel re-exports db.ts → pg (Node-only net/tls), which can't be bundled.
import { championDisplayName } from "@crewstats/shared/champions";

export const DDRAGON_VERSION = process.env.NEXT_PUBLIC_DDRAGON_VERSION ?? "16.12.1";

const CHAMP_FIXUPS: Record<string, string> = { FiddleSticks: "Fiddlesticks" };

/** Human-facing champion name (e.g. "MonkeyKing" → "Wukong", "MissFortune" → "Miss Fortune"). */
export const champName = championDisplayName;

export function champIcon(championName: string): string {
  const name = CHAMP_FIXUPS[championName] ?? championName;
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${name}.png`;
}

/** Item icon (Data Dragon). */
export function itemIcon(id: number): string {
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/item/${id}.png`;
}

/** Wide champion splash art (1215x717) — no version in the path. */
export function champSplash(championName: string): string {
  const name = CHAMP_FIXUPS[championName] ?? championName;
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${name}_0.jpg`;
}

/** Tall champion "loading screen" portrait (308x560) — the champ-select / card crop. */
export function champLoading(championName: string): string {
  const name = CHAMP_FIXUPS[championName] ?? championName;
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${name}_0.jpg`;
}

/** Summoner's Rift minimap art — the CURRENT in-game minimap from CommunityDragon
 * (Riot's live game assets; "latest" tracks the current patch). Data Dragon only
 * ships the legacy map11.png, so we use CommunityDragon for the up-to-date terrain.
 * Served via the same-origin /api/riftmap proxy (cached, no CORS taint for WebGL). */
export const RIFT_MAP_URL =
  "https://raw.communitydragon.org/latest/game/assets/maps/info/map11/2dlevelminimap_base_baron1.png";

const CDRAGON = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default";

// The real in-game ping-wheel sprites (Community Dragon). Keys match the recap's ping types.
const PINGS = "https://raw.communitydragon.org/latest/game/assets/ux/minimap/pings";
const PING_FILES: Record<string, string> = {
  onMyWay: "on_my_way_new.png",
  mia: "mia_new.png",
  enemyMissing: "mia_new.png",
  danger: "caution.png",
  assistMe: "assist.png",
  needVision: "need_ward.png",
  allIn: "all_in.png",
  getBack: "retreat.png",
  push: "push.png",
  hold: "hold.png",
  command: "ping.png",
  basic: "ping.png",
  enemyVision: "enemychampsighted.png",
};

/** In-game ping-wheel icon for a recap ping type. Falls back to the generic ping sprite. */
export function pingIcon(type: string): string {
  return `${PINGS}/${PING_FILES[type] ?? "ping.png"}`;
}

// Real in-game summoner emotes (Community Dragon), for conveying emotion/jokes in the recap.
const EMOTE_BASE = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loadouts/summoneremotes";
const EMOTES: Record<string, string> = {
  laugh: `${EMOTE_BASE}/esports/globalteam2025/4952_laughing_out_loud_inventory.png`,
  cry: `${EMOTE_BASE}/marketing/4306_the_crying_woman_inventory.png`,
  angry: `${EMOTE_BASE}/flairs/mcat_angry_mad_inventory.png`,
  thumbsup: `${EMOTE_BASE}/flairs/thumb_happy_up_inventory.png`,
  poro: `${EMOTE_BASE}/flairs/poro_happy_cheers_inventory.png`,
  question: `${EMOTE_BASE}/esports/digital_esports/em_what_inventory.png`,
  gg: `${EMOTE_BASE}/events/valentines/em_events_valentines_heart_01_inventory.png`,
  rip: `${EMOTE_BASE}/events/harrowing/grave_inventory.png`,
  mock: `${EMOTE_BASE}/flairs/poro_happy_taunt_inventory.png`,
  sad: `${EMOTE_BASE}/tft/memeemotes/tft_meme_emote_so_sad_inventory.png`,
  love: `${EMOTE_BASE}/events/valentines/em_events_valentines_brokenheart_01_inventory.png`,
  sleep: `${EMOTE_BASE}/events/poolparty/em_pool_party_poro_01_inventory.png`,
};

export type EmoteKey = keyof typeof EMOTES | string;

/** URL for an in-game emote by keyword (laugh, cry, angry, poro, rip, gg, question…). */
export function emote(key: EmoteKey): string {
  return EMOTES[key] ?? EMOTES.poro!;
}

/** Ranked tier mini-crest svg (iron…challenger). Returns null when unranked. */
export function tierCrest(tier?: string | null): string | null {
  if (!tier) return null;
  const t = tier.toLowerCase();
  const known = ["iron", "bronze", "silver", "gold", "platinum", "emerald", "diamond", "master", "grandmaster", "challenger"];
  if (!known.includes(t)) return null;
  return `${CDRAGON}/images/ranked-mini-crests/${t}.svg`;
}

const ROLE_MAP: Record<string, string> = {
  TOP: "top",
  JUNGLE: "jungle",
  MIDDLE: "middle",
  MID: "middle",
  BOTTOM: "bottom",
  BOT: "bottom",
  UTILITY: "utility",
  SUPPORT: "utility",
};

/** Position/role icon svg. Returns null for unknown roles. */
export function roleIcon(role?: string | null): string | null {
  if (!role) return null;
  const r = ROLE_MAP[role.toUpperCase()];
  return r ? `${CDRAGON}/svg/position-${r}.svg` : null;
}

export function profileIcon(id: number | null): string | null {
  if (id == null) return null;
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/profileicon/${id}.png`;
}

export function pct(fraction: number | null, dp = 0): string {
  if (fraction == null) return "—";
  return `${(fraction * 100).toFixed(dp)}%`;
}

export function signedPp(fraction: number | null): string {
  if (fraction == null) return "—";
  const pp = fraction * 100;
  const sign = pp > 0 ? "+" : "";
  return `${sign}${pp.toFixed(1)}pp`;
}

export function rankString(rank: RankInfo | null): string {
  if (!rank) return "Unranked";
  const tier = rank.tier.charAt(0) + rank.tier.slice(1).toLowerCase();
  const apex = ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(rank.tier);
  return apex ? `${tier} ${rank.lp} LP` : `${tier} ${rank.rank} · ${rank.lp} LP`;
}

const TIER_ORDER = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVISION_ORDER: Record<string, number> = { IV: 0, III: 1, II: 2, I: 3 };

/** A single comparable number for a ranked tier (higher = better). Unranked sorts last. */
export function rankScore(rank: RankInfo | null | undefined): number {
  if (!rank) return -1;
  const t = TIER_ORDER.indexOf(rank.tier.toUpperCase());
  if (t < 0) return -1;
  const apex = t >= TIER_ORDER.indexOf("MASTER");
  const div = apex ? 0 : DIVISION_ORDER[rank.rank.toUpperCase()] ?? 0;
  return t * 10_000 + div * 1_000 + rank.lp;
}

/** Inverse of rankScore: turn an averaged score back into a representative RankInfo. */
export function rankFromScore(score: number): RankInfo | null {
  if (score < 0) return null;
  const t = Math.min(TIER_ORDER.length - 1, Math.max(0, Math.floor(score / 10_000)));
  const apex = t >= TIER_ORDER.indexOf("MASTER");
  const divIdx = apex ? 3 : Math.min(3, Math.max(0, Math.round((score % 10_000) / 1_000)));
  const rank = (Object.keys(DIVISION_ORDER) as string[]).find((k) => DIVISION_ORDER[k] === divIdx) ?? "I";
  return { tier: TIER_ORDER[t]!, rank, lp: Math.round(score % 1_000), wins: 0, losses: 0 };
}

/** The stack's blended ranked standing — the average of all ranked members' scores. */
export function averageRank(ranks: (RankInfo | null | undefined)[]): { rank: RankInfo | null; counted: number } {
  const scores = ranks.map(rankScore).filter((s) => s >= 0);
  if (!scores.length) return { rank: null, counted: 0 };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { rank: rankFromScore(avg), counted: scores.length };
}

export function kdaString(k: number, d: number, a: number): string {
  return `${k}/${d}/${a}`;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export function gameDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function placementSuffix(p: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = p % 100;
  return p + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
