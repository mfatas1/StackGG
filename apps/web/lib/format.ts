import type { RankInfo } from "@crewstats/shared";

export const DDRAGON_VERSION = process.env.NEXT_PUBLIC_DDRAGON_VERSION ?? "15.13.1";

export function champIcon(championName: string): string {
  // DDragon uses PascalCase keys; match-v5 championName already matches for most.
  const fixups: Record<string, string> = { FiddleSticks: "Fiddlesticks" };
  const name = fixups[championName] ?? championName;
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${name}.png`;
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
