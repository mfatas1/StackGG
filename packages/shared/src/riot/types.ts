import { z } from "zod";

/**
 * Zod schemas for the Riot API responses we consume. We validate the fields we
 * persist and `.passthrough()` the rest so Riot adding fields never breaks us.
 * CLAUDE.md: zod-validate all external data at the boundary.
 */

export const AccountDtoSchema = z
  .object({
    puuid: z.string(),
    gameName: z.string().nullish(),
    tagLine: z.string().nullish(),
  })
  .passthrough();
export type AccountDto = z.infer<typeof AccountDtoSchema>;

export const SummonerDtoSchema = z
  .object({
    id: z.string().optional(), // encrypted summonerId (may be omitted on newer responses)
    puuid: z.string(),
    profileIconId: z.number().int().optional(),
    summonerLevel: z.number().int().optional(),
  })
  .passthrough();
export type SummonerDto = z.infer<typeof SummonerDtoSchema>;

export const LeagueEntryDtoSchema = z
  .object({
    queueType: z.string(), // RANKED_SOLO_5x5 / RANKED_FLEX_SR
    tier: z.string(),
    rank: z.string(),
    leaguePoints: z.number().int(),
    wins: z.number().int(),
    losses: z.number().int(),
  })
  .passthrough();
export type LeagueEntryDto = z.infer<typeof LeagueEntryDtoSchema>;

export const LeagueEntriesSchema = z.array(LeagueEntryDtoSchema);

export const MatchIdsSchema = z.array(z.string());

/** A single participant row from match-v5. Only fields we persist are validated. */
export const ParticipantDtoSchema = z
  .object({
    puuid: z.string(),
    teamId: z.number().int(),
    championId: z.number().int(),
    championName: z.string(),
    teamPosition: z.string().optional().default(""),
    win: z.boolean(),
    kills: z.number().int(),
    deaths: z.number().int(),
    assists: z.number().int(),
    goldEarned: z.number().int(),
    totalDamageDealtToChampions: z.number().int(),
    totalMinionsKilled: z.number().int(),
    neutralMinionsKilled: z.number().int().optional().default(0),
    visionScore: z.number().int().optional().default(0),
    riotIdGameName: z.string().optional(),
    riotIdTagline: z.string().optional(),
    // Arena-specific (queue 1700):
    playerSubteamId: z.number().int().optional(),
    subteamPlacement: z.number().int().optional(),
    placement: z.number().int().optional(),
  })
  .passthrough();
export type ParticipantDto = z.infer<typeof ParticipantDtoSchema>;

export const MatchDtoSchema = z
  .object({
    metadata: z
      .object({
        matchId: z.string(),
        participants: z.array(z.string()),
      })
      .passthrough(),
    info: z
      .object({
        gameCreation: z.number(),
        gameStartTimestamp: z.number().optional(),
        gameEndTimestamp: z.number().optional(),
        gameDuration: z.number(),
        gameVersion: z.string().optional(),
        queueId: z.number().int(),
        platformId: z.string().optional(),
        participants: z.array(ParticipantDtoSchema),
      })
      .passthrough(),
  })
  .passthrough();
export type MatchDto = z.infer<typeof MatchDtoSchema>;
