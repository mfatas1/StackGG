import { z } from "zod";

/** pg-boss job names + payload schemas (PLAN §9). */

export const JOB = {
  BACKFILL_MEMBER: "backfill_member",
  POLL_CREW: "poll_crew",
  POLL_ALL: "poll_all",
  REFRESH_RANKS: "refresh_ranks",
  COMPUTE_WEEKLY_SNAPSHOT: "compute_weekly_snapshot",
} as const;

export const BackfillMemberJobSchema = z.object({
  crewId: z.string().uuid().optional(), // optional: snapshot-only lookups have no crew
  puuid: z.string(),
  platform: z.string(),
  days: z.number().default(90),
});
export type BackfillMemberJob = z.infer<typeof BackfillMemberJobSchema>;

export const PollCrewJobSchema = z.object({ crewId: z.string().uuid() });
export type PollCrewJob = z.infer<typeof PollCrewJobSchema>;

export const RefreshRanksJobSchema = z.object({ puuid: z.string(), platform: z.string() });
export type RefreshRanksJob = z.infer<typeof RefreshRanksJobSchema>;

export const ComputeWeeklySnapshotJobSchema = z.object({ crewId: z.string().uuid() });
export type ComputeWeeklySnapshotJob = z.infer<typeof ComputeWeeklySnapshotJobSchema>;
