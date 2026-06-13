/** Platform host -> regional route (account-v1 / match-v5). PLAN §7. */
export const REGIONAL_ROUTE: Record<string, string> = {
  euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe",
  na1: "americas", br1: "americas", la1: "americas", la2: "americas",
  kr: "asia", jp1: "asia",
  oc1: "sea", ph2: "sea", sg2: "sea", th2: "sea", tw2: "sea", vn2: "sea",
};

export function regionalRouteFor(platform: string): string {
  return REGIONAL_ROUTE[platform] ?? "europe";
}

/** Queue IDs tracked in v1 (PLAN / CLAUDE.md). */
export const QUEUES = {
  RANKED_SOLO: 420,
  RANKED_FLEX: 440,
  ARAM: 450,
  ARENA: 1700,
} as const;

export const TRACKED_QUEUE_IDS = [
  QUEUES.RANKED_SOLO,
  QUEUES.RANKED_FLEX,
  QUEUES.ARAM,
  QUEUES.ARENA,
] as const;

export type QueueId = (typeof TRACKED_QUEUE_IDS)[number];

export const QUEUE_LABEL: Record<number, string> = {
  420: "Ranked Solo/Duo",
  440: "Ranked Flex",
  450: "ARAM",
  1700: "Arena",
};

export const QUEUE_SLUG: Record<number, "ranked" | "flex" | "aram" | "arena"> = {
  420: "ranked",
  440: "flex",
  450: "aram",
  1700: "arena",
};

export function isArena(queueId: number): boolean {
  return queueId === QUEUES.ARENA;
}
