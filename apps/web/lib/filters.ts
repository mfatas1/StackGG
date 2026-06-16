// Build a player-page URL preserving the active filters (queue / champion / lane).
// `q === "all"` and empty values are dropped so the URL stays clean.
export function filterHref(basePath: string, p: { q?: string; champ?: string; role?: string }): string {
  const parts: string[] = [];
  if (p.q && p.q !== "all") parts.push(`q=${p.q}`);
  if (p.champ) parts.push(`champ=${p.champ}`);
  if (p.role) parts.push(`role=${p.role}`);
  return parts.length ? `${basePath}?${parts.join("&")}` : basePath;
}

export const LANES: { key: string; label: string }[] = [
  { key: "TOP", label: "Top" },
  { key: "JUNGLE", label: "Jungle" },
  { key: "MIDDLE", label: "Mid" },
  { key: "BOTTOM", label: "Bot" },
  { key: "UTILITY", label: "Support" },
];
