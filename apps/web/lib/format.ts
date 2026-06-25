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

/** Summoner's Rift minimap art — the CURRENT in-game minimap from CommunityDragon
 * (Riot's live game assets; "latest" tracks the current patch). Data Dragon only
 * ships the legacy map11.png, so we use CommunityDragon for the up-to-date terrain.
 * Served via the same-origin /api/riftmap proxy (cached, no CORS taint for WebGL). */
export const RIFT_MAP_URL =
  "https://raw.communitydragon.org/latest/game/assets/maps/info/map11/2dlevelminimap_base_baron1.png";

const CDRAGON = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default";

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
