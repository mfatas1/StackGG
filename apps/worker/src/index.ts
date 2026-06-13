import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

import PgBoss from "pg-boss";
import { databaseUrl, JOB } from "@crewstats/shared";
import type { BackfillMemberJob, PollCrewJob, RefreshRanksJob, ComputeWeeklySnapshotJob } from "@crewstats/shared";
import {
  handleBackfillMember,
  handlePollCrew,
  handlePollAll,
  handleRefreshRanks,
  handleComputeWeeklySnapshot,
} from "./jobs.js";

const QUEUES = [
  JOB.BACKFILL_MEMBER,
  JOB.POLL_CREW,
  JOB.POLL_ALL,
  JOB.REFRESH_RANKS,
  JOB.COMPUTE_WEEKLY_SNAPSHOT,
];

// pg-boss v10 hands the work callback an array of jobs.
function single<T>(handler: (data: T) => Promise<unknown>) {
  return async (jobs: PgBoss.Job<T>[]) => {
    for (const job of jobs) await handler(job.data);
  };
}

async function main() {
  const boss = new PgBoss({ connectionString: databaseUrl() });
  boss.on("error", (err) => console.error("[pg-boss]", err.message));
  await boss.start();
  for (const q of QUEUES) await boss.createQueue(q);

  await boss.work<BackfillMemberJob>(JOB.BACKFILL_MEMBER, { batchSize: 1 }, single(handleBackfillMember));
  await boss.work<PollCrewJob>(JOB.POLL_CREW, { batchSize: 1 }, single(handlePollCrew));
  await boss.work<RefreshRanksJob>(JOB.REFRESH_RANKS, { batchSize: 1 }, single(handleRefreshRanks));
  await boss.work<ComputeWeeklySnapshotJob>(JOB.COMPUTE_WEEKLY_SNAPSHOT, { batchSize: 1 }, single(handleComputeWeeklySnapshot));

  // poll_all fans out to one poll_crew job per crew.
  await boss.work(JOB.POLL_ALL, { batchSize: 1 }, async () => {
    const crewIds = await handlePollAll();
    for (const crewId of crewIds) await boss.send(JOB.POLL_CREW, { crewId });
    console.log(`[poll_all] queued ${crewIds.length} crew(s)`);
  });

  // Cron: poll every 30 minutes (PLAN §9).
  await boss.schedule(JOB.POLL_ALL, "*/30 * * * *");

  console.log("CrewStats worker running. Queues:", QUEUES.join(", "));

  const shutdown = async () => {
    console.log("worker shutting down…");
    await boss.stop({ graceful: true });
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("worker failed to start:", err);
  process.exit(1);
});
