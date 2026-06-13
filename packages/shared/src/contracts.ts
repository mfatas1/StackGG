import { z } from "zod";

/**
 * The contract surface (PLAN §11). DB row types + the result shapes that the
 * stats engine produces and the API returns and the UI consumes. Frozen except
 * by agreement — these are what let ingestion / stats / platform / UI be built
 * independently.
 */

// ---------- DB row types ----------

export interface UserRow {
  id: string;
  email: string;
  created_at: string;
}

export interface RiotAccountRow {
  puuid: string;
  riot_id: string;
  tag: string;
  region: string;
  summoner_id: string | null;
  profile_icon: number | null;
  claimed_by_user_id: string | null;
  last_polled_at: string | null;
  last_backfilled_at: string | null;
  rank_solo: RankInfo | null;
  rank_flex: RankInfo | null;
  is_stale: boolean;
  created_at: string;
}

export interface CrewRow {
  id: string;
  slug: string;
  name: string;
  invite_code: string;
  owner_user_id: string | null;
  created_at: string;
}

export interface CrewMemberRow {
  crew_id: string;
  puuid: string;
  joined_at: string;
  role: "owner" | "member";
}

export interface MatchRow {
  match_id: string;
  queue_id: number;
  game_start: string;
  game_duration: number;
  patch: string | null;
  region: string;
}

export interface MatchParticipantRow {
  match_id: string;
  puuid: string;
  team_id: number;
  subteam_id: number | null;
  placement: number | null;
  champion_id: number;
  champion_name: string;
  role: string | null;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  gold: number;
  damage: number;
  cs: number;
  vision_score: number;
}

// ---------- Shared value types ----------

export const RankInfoSchema = z.object({
  tier: z.string(), // e.g. GOLD
  rank: z.string(), // e.g. II
  lp: z.number(),
  wins: z.number(),
  losses: z.number(),
});
export type RankInfo = z.infer<typeof RankInfoSchema>;

export const QueueSlugSchema = z.enum(["ranked", "flex", "aram", "arena", "all"]);
export type QueueSlug = z.infer<typeof QueueSlugSchema>;

// ---------- Stat result shapes ----------

export const ModeStatsSchema = z.object({
  queueId: z.number(),
  queueSlug: QueueSlugSchema,
  games: z.number(),
  wins: z.number(),
  losses: z.number(),
  winrate: z.number().nullable(), // null when games === 0
  avgKills: z.number(),
  avgDeaths: z.number(),
  avgAssists: z.number(),
  kda: z.number(),
  topChampions: z.array(
    z.object({ championId: z.number(), championName: z.string(), games: z.number(), wins: z.number() }),
  ),
  // Arena only: average subteam placement (1..8). null for non-arena.
  avgPlacement: z.number().nullable(),
});
export type ModeStats = z.infer<typeof ModeStatsSchema>;

export const PlayerIdentitySchema = z.object({
  puuid: z.string(),
  riotId: z.string(),
  tag: z.string(),
  region: z.string(),
  profileIcon: z.number().nullable(),
  isStale: z.boolean(),
});
export type PlayerIdentity = z.infer<typeof PlayerIdentitySchema>;

export const FrequentTeammateSchema = z.object({
  puuid: z.string(),
  riotId: z.string(),
  tag: z.string(),
  gamesTogether: z.number(),
  winsTogether: z.number(),
});
export type FrequentTeammate = z.infer<typeof FrequentTeammateSchema>;

export const PlayerSnapshotSchema = z.object({
  identity: PlayerIdentitySchema,
  rankSolo: RankInfoSchema.nullable(),
  rankFlex: RankInfoSchema.nullable(),
  modes: z.array(ModeStatsSchema),
  recentForm: z.array(z.enum(["W", "L"])), // last N across tracked queues
  frequentTeammates: z.array(FrequentTeammateSchema),
  lastUpdated: z.string().nullable(),
});
export type PlayerSnapshot = z.infer<typeof PlayerSnapshotSchema>;

export const LeaderboardEntrySchema = z.object({
  identity: PlayerIdentitySchema,
  games: z.number(),
  wins: z.number(),
  losses: z.number(),
  winrate: z.number().nullable(),
  winrate7d: z.number().nullable(),
  form: z.array(z.enum(["W", "L"])), // last 5
  rankSolo: RankInfoSchema.nullable(),
  rankFlex: RankInfoSchema.nullable(),
  avgPlacement: z.number().nullable(), // arena tab
  vsCrewAvgWinrate: z.number().nullable(), // this winrate minus crew avg winrate (pp)
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const DuoSynergySchema = z.object({
  a: PlayerIdentitySchema,
  b: PlayerIdentitySchema,
  games: z.number(),
  wins: z.number(),
  winrate: z.number().nullable(),
  // For context: each player's solo winrate apart, so UI can show "together vs apart".
  aWinrateApart: z.number().nullable(),
  bWinrateApart: z.number().nullable(),
});
export type DuoSynergy = z.infer<typeof DuoSynergySchema>;

export const HeadToHeadSchema = z.object({
  a: PlayerIdentitySchema,
  b: PlayerIdentitySchema,
  games: z.number(), // games on opposing sides (or different Arena subteams)
  aWins: z.number(), // games where a's side beat b's side (or better arena placement)
  bWins: z.number(),
});
export type HeadToHead = z.infer<typeof HeadToHeadSchema>;

export const FlexRoleStatSchema = z.object({
  identity: PlayerIdentitySchema,
  role: z.string(), // TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY
  games: z.number(),
  wins: z.number(),
  winrate: z.number().nullable(),
});
export type FlexRoleStat = z.infer<typeof FlexRoleStatSchema>;

export const ActivityMemberSchema = z.object({
  puuid: z.string(),
  riotId: z.string(),
  championName: z.string(),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  win: z.boolean(),
  teamId: z.number(),
  placement: z.number().nullable(),
});
export const ActivityItemSchema = z.object({
  matchId: z.string(),
  queueId: z.number(),
  queueSlug: QueueSlugSchema,
  gameStart: z.string(),
  gameDuration: z.number(),
  members: z.array(ActivityMemberSchema),
});
export type ActivityItem = z.infer<typeof ActivityItemSchema>;

export const MatchHistoryItemSchema = z.object({
  matchId: z.string(),
  queueId: z.number(),
  queueSlug: QueueSlugSchema,
  gameStart: z.string(),
  gameDuration: z.number(),
  championId: z.number(),
  championName: z.string(),
  role: z.string().nullable(),
  win: z.boolean(),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  cs: z.number(),
  visionScore: z.number(),
  placement: z.number().nullable(),
  // crewmates who were in the same match (for crew-context match lists)
  crewmates: z.array(z.object({ riotId: z.string(), championName: z.string(), sameSide: z.boolean() })),
});
export type MatchHistoryItem = z.infer<typeof MatchHistoryItemSchema>;

export const CrewCardsSchema = z.object({
  gamesThisWeek: z.number(),
  fiveStackWinrate: z.number().nullable(),
  fiveStackGames: z.number(),
  bestDuo: DuoSynergySchema.nullable(),
  biggestClimber: z
    .object({ identity: PlayerIdentitySchema, lpDelta: z.number() })
    .nullable(),
  totalSharedGames: z.number(),
});
export type CrewCards = z.infer<typeof CrewCardsSchema>;

export const CrewSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  inviteCode: z.string(),
  memberCount: z.number(),
});
export type CrewSummary = z.infer<typeof CrewSummarySchema>;

export const CrewDashboardSchema = z.object({
  crew: CrewSummarySchema,
  members: z.array(PlayerIdentitySchema),
  cards: CrewCardsSchema,
  leaderboard: z.array(LeaderboardEntrySchema),
  synergies: z.array(DuoSynergySchema),
  headToHead: z.array(HeadToHeadSchema),
  flexRoles: z.array(FlexRoleStatSchema),
  activity: z.array(ActivityItemSchema),
  queue: QueueSlugSchema,
  minSynergyGames: z.number(), // sample-size threshold actually applied
});
export type CrewDashboard = z.infer<typeof CrewDashboardSchema>;

// Crew member page (PLAN §5.5): individual stats contextualized vs the crew.
export const CrewMemberPageSchema = z.object({
  crew: CrewSummarySchema,
  identity: PlayerIdentitySchema,
  rankSolo: RankInfoSchema.nullable(),
  rankFlex: RankInfoSchema.nullable(),
  modes: z.array(ModeStatsSchema),
  percentiles: z.array(z.object({ stat: z.string(), value: z.number(), percentile: z.number() })),
  partnerCompatibility: z.array(DuoSynergySchema), // sorted best->worst with this member
});
export type CrewMemberPage = z.infer<typeof CrewMemberPageSchema>;

// ---------- API request contracts ----------

export const CreateCrewRequestSchema = z.object({
  name: z.string().min(1).max(60),
  riotId: z.string().min(3), // "name#tag"
  region: z.string().min(2),
  email: z.string().email().optional(),
});
export type CreateCrewRequest = z.infer<typeof CreateCrewRequestSchema>;

export const JoinCrewRequestSchema = z.object({
  inviteCode: z.string().min(1),
  riotId: z.string().min(3),
  region: z.string().min(2),
  email: z.string().email().optional(),
});
export type JoinCrewRequest = z.infer<typeof JoinCrewRequestSchema>;

export const SnapshotRequestSchema = z.object({
  riotId: z.string().min(3),
  region: z.string().min(2),
});
export type SnapshotRequest = z.infer<typeof SnapshotRequestSchema>;

export function parseRiotId(riotId: string): { name: string; tag: string } | null {
  const idx = riotId.lastIndexOf("#");
  if (idx <= 0 || idx === riotId.length - 1) return null;
  return { name: riotId.slice(0, idx).trim(), tag: riotId.slice(idx + 1).trim() };
}
