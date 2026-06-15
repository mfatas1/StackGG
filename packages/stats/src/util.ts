import { QUEUE_SLUG, QUEUES } from "@crewstats/shared";
import type { QueueSlug } from "@crewstats/shared";

/** All winrates in this package are fractions in [0,1]; the UI formats as %. */
export function winrate(wins: number, games: number): number | null {
  if (games <= 0) return null;
  return wins / games;
}

export function kda(kills: number, deaths: number, assists: number): number {
  return deaths === 0 ? kills + assists : (kills + assists) / deaths;
}

export function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/**
 * Map a UI queue slug to its queue_id filter. NOTE: the default "all" tab means
 * Summoner's Rift (ranked solo + flex) — Arena and ARAM are NOT blended into the
 * headline winrate; they live on their own tabs. (Never returns null now.)
 */
export function queueIdsForSlug(slug: QueueSlug): number[] | null {
  switch (slug) {
    case "ranked":
      return [QUEUES.RANKED_SOLO];
    case "flex":
      return [QUEUES.RANKED_FLEX];
    case "aram":
      return [QUEUES.ARAM];
    case "arena":
      return [QUEUES.ARENA];
    case "all":
      return [QUEUES.RANKED_SOLO, QUEUES.RANKED_FLEX];
  }
}

export function slugForQueueId(queueId: number): QueueSlug {
  return QUEUE_SLUG[queueId] ?? "all";
}
