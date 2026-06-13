import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MatchDtoSchema, type MatchDto } from "../src/riot/types.js";

/**
 * Real match JSONs captured from the live Riot API during M0 (PLAN §11 Phase 0).
 * Used to seed the test DB and as expected-value inputs for stats unit tests.
 * Never call Riot from tests — these are the boundary.
 */
const dir = join(dirname(fileURLToPath(import.meta.url)), "matches");

export function loadFixtureMatches(): MatchDto[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => MatchDtoSchema.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))));
}

export function loadFixtureMatch(name: string): MatchDto {
  return MatchDtoSchema.parse(JSON.parse(readFileSync(join(dir, `${name}.json`), "utf8")));
}

/** The 5 friends used for fixtures / live e2e (StackMember1's flex crew). */
export interface FixtureMember {
  riotId: string;
  tag: string;
  region: string;
  puuid: string;
}
export function loadCrewManifest(): FixtureMember[] {
  const p = join(dirname(fileURLToPath(import.meta.url)), "crew-manifest.json");
  return JSON.parse(readFileSync(p, "utf8"));
}
