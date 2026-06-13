// Ingestion core lives in @crewstats/shared so both the worker and the web app
// (on-demand snapshot lookups) can use the single RiotClient path.
export { backfillMember, pollMember, refreshAccountRanks } from "@crewstats/shared";
export type { BackfillOptions, BackfillResult } from "@crewstats/shared";
