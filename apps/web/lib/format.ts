import type { RankInfo } from "@crewstats/shared";

export const DDRAGON_VERSION = process.env.NEXT_PUBLIC_DDRAGON_VERSION ?? "16.12.1";

const CHAMP_FIXUPS: Record<string, string> = { FiddleSticks: "Fiddlesticks" };

export function champIcon(championName: string): string {
  const name = CHAMP_FIXUPS[championName] ?? championName;
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${name}.png`;
}

/** Wide champion splash art (1215x717) — no version in the path. */
export function champSplash(championName: string): string {
  const name = CHAMP_FIXUPS[championName] ?? championName;
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${name}_0.jpg`;
}

/** Summoner's Rift minimap art. */
export const RIFT_MAP_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/map/map11.png`;

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
