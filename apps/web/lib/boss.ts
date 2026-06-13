import "server-only";
import PgBoss from "pg-boss";
import { databaseUrl, JOB } from "@crewstats/shared";
import type { BackfillMemberJob, PollCrewJob, ComputeWeeklySnapshotJob } from "@crewstats/shared";

/**
 * Send-only pg-boss client for the web process. supervise/schedule disabled —
 * the worker owns maintenance and cron. Used to enqueue background full backfills
 * after a member is added (the synchronous quick backfill handles immediate data).
 */
let bossPromise: Promise<PgBoss> | null = null;

async function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const boss = new PgBoss({ connectionString: databaseUrl(), supervise: false, schedule: false });
      boss.on("error", (err) => console.error("[web pg-boss]", err.message));
      await boss.start();
      await boss.createQueue(JOB.BACKFILL_MEMBER);
      await boss.createQueue(JOB.POLL_CREW);
      await boss.createQueue(JOB.COMPUTE_WEEKLY_SNAPSHOT);
      return boss;
    })();
  }
  return bossPromise;
}

/** Best-effort enqueue; never throws into the request path. */
async function safeSend(name: string, data: unknown): Promise<void> {
  try {
    const boss = await getBoss();
    await boss.send(name, data as object);
  } catch (err) {
    console.warn(`[web] enqueue ${name} failed: ${(err as Error).message}`);
  }
}

export function enqueueBackfill(job: BackfillMemberJob): Promise<void> {
  return safeSend(JOB.BACKFILL_MEMBER, job);
}
export function enqueuePollCrew(job: PollCrewJob): Promise<void> {
  return safeSend(JOB.POLL_CREW, job);
}
export function enqueueWeekly(job: ComputeWeeklySnapshotJob): Promise<void> {
  return safeSend(JOB.COMPUTE_WEEKLY_SNAPSHOT, job);
}
