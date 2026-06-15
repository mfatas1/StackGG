// The carry/MVP formula lives in @crewstats/shared so ingestion (worker) and the web
// app compute identical scores. Re-exported here so existing `@/lib/carry` imports work.
export { carryScores, mvpOf, type CarryStats } from "@crewstats/shared";
