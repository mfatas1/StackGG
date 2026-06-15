// The carry/MVP formula lives in @crewstats/shared so ingestion (worker) and the web
// app compute identical scores. Imported via the pure ./carry subpath (not the package
// barrel) so client components don't pull in the server-only db/pg modules.
export { carryScores, mvpOf, type CarryStats } from "@crewstats/shared/carry";
