/**
 * Champion *display* names.
 *
 * Riot's match-v5 `championName` (and Data Dragon's champion id) is a compact,
 * space-less internal alias — "MonkeyKing", "MissFortune", "KSante", "Belveth".
 * Those are correct for building asset URLs, but wrong to show a human. This maps
 * the internal alias to the proper in-client name (with spaces, apostrophes, and
 * the few true renames like MonkeyKing → Wukong).
 *
 * Only champions whose display name differs from the alias need an entry; anything
 * not listed falls through unchanged. Lookup is normalization-insensitive (case +
 * punctuation stripped) so "Kaisa", "KaiSa", and "Kai'Sa" all resolve.
 *
 * NOTE: this is the display name only. Asset helpers (champIcon/champSplash) still
 * key off the raw alias — Data Dragon's image for Wukong is `MonkeyKing.png`.
 */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Keyed by the normalized alias.
const DISPLAY: Record<string, string> = {
  aurelionsol: "Aurelion Sol",
  belveth: "Bel'Veth",
  chogath: "Cho'Gath",
  drmundo: "Dr. Mundo",
  fiddlesticks: "Fiddlesticks", // match-v5 returns "FiddleSticks"; normalize away the odd caps
  jarvaniv: "Jarvan IV",
  kaisa: "Kai'Sa",
  khazix: "Kha'Zix",
  kogmaw: "Kog'Maw",
  ksante: "K'Sante",
  leblanc: "LeBlanc",
  leesin: "Lee Sin",
  masteryi: "Master Yi",
  missfortune: "Miss Fortune",
  monkeyking: "Wukong",
  nunu: "Nunu & Willump",
  reksai: "Rek'Sai",
  renata: "Renata Glasc",
  tahmkench: "Tahm Kench",
  twistedfate: "Twisted Fate",
  velkoz: "Vel'Koz",
  xinzhao: "Xin Zhao",
};

/** The human-facing champion name for a Riot `championName` alias. */
export function championDisplayName(name: string | null | undefined): string {
  if (!name) return name ?? "";
  return DISPLAY[norm(name)] ?? name;
}
