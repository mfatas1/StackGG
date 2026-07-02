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
    // Extra stats for the records board (all participant-level, no timeline):
    totalTimeSpentDead: z.number().int().optional().default(0),
    longestTimeSpentLiving: z.number().int().optional().default(0),
    largestKillingSpree: z.number().int().optional().default(0),
    largestMultiKill: z.number().int().optional().default(0),
    pentaKills: z.number().int().optional().default(0),
    totalDamageTaken: z.number().int().optional().default(0),
    damageSelfMitigated: z.number().int().optional().default(0),
    totalHealsOnTeammates: z.number().int().optional().default(0),
    totalDamageShieldedOnTeammates: z.number().int().optional().default(0),
    timeCCingOthers: z.number().int().optional().default(0),
    largestCriticalStrike: z.number().int().optional().default(0),
    objectivesStolen: z.number().int().optional().default(0),
    // Ping wheel counts (recap "comedy" fuel, migration 009). All participant-level.
    allInPings: z.number().int().optional().default(0),
    assistMePings: z.number().int().optional().default(0),
    baitPings: z.number().int().optional().default(0),
    basicPings: z.number().int().optional().default(0),
    commandPings: z.number().int().optional().default(0),
    dangerPings: z.number().int().optional().default(0),
    enemyMissingPings: z.number().int().optional().default(0),
    enemyVisionPings: z.number().int().optional().default(0),
    getBackPings: z.number().int().optional().default(0),
    holdPings: z.number().int().optional().default(0),
    needVisionPings: z.number().int().optional().default(0),
    onMyWayPings: z.number().int().optional().default(0),
    pushPings: z.number().int().optional().default(0),
    visionClearedPings: z.number().int().optional().default(0),
    // Surrender flags.
    gameEndedInSurrender: z.boolean().optional().default(false),
    gameEndedInEarlySurrender: z.boolean().optional().default(false),
    challenges: z
      .object({
        soloKills: z.number().optional(),
        teamDamagePercentage: z.number().optional(),
        skillshotsDodged: z.number().optional(),
        killsNearEnemyTurret: z.number().optional(),
        takedownsInEnemyFountain: z.number().optional(),
        epicMonsterStolenWithoutSmite: z.number().optional(),
        saveAllyFromDeath: z.number().optional(),
        // Comedy challenges (migration 009).
        killsUnderOwnTurret: z.number().optional(),
        outnumberedKills: z.number().optional(),
        perfectGame: z.number().optional(),
        abilityUses: z.number().optional(),
        dancedWithRiftHerald: z.number().optional(),
        survivedSingleDigitHpCount: z.number().optional(),
        knockEnemyIntoTeamAndKill: z.number().optional(),
        fistBumpParticipation: z.number().optional(),
      })
      .passthrough()
      .optional(),
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
