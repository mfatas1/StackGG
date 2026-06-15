import type pg from "pg";
import type { Queryable } from "./db.js";
import { isArena } from "./riot/regions.js";
import type { MatchDto, ParticipantDto } from "./riot/types.js";

/**
 * Pure mapping + persistence of a match into the schema (PLAN §8). Shared by the
 * ingestion worker and the stats test-seed so both produce identical rows.
 *
 * Dedup (PLAN hard rule #5): each match is inserted once (ON CONFLICT DO NOTHING);
 * match_participants rows are written only for tracked puuids present in the match.
 */

export interface ParticipantRowInput {
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
  // Records-board stats (participant-level; see migration 002):
  time_dead: number;
  longest_life: number;
  killing_spree: number;
  multikill: number;
  pentakills: number;
  damage_taken: number;
  self_mitigated: number;
  heal_teammates: number;
  shield_teammates: number;
  cc_time: number;
  largest_crit: number;
  objectives_stolen: number;
  solo_kills: number;
  // Challenge-derived (migration 003); null when the match has no challenges block.
  team_damage_pct: number | null;
  skillshots_dodged: number | null;
  kills_near_enemy_turret: number | null;
  fountain_takedowns: number | null;
  smiteless_steals: number | null;
  ally_saves: number | null;
}

export function mapParticipant(matchId: string, queueId: number, p: ParticipantDto): ParticipantRowInput {
  const arena = isArena(queueId);
  return {
    match_id: matchId,
    puuid: p.puuid,
    team_id: p.teamId,
    subteam_id: arena ? p.playerSubteamId ?? null : null,
    placement: arena ? p.subteamPlacement ?? p.placement ?? null : null,
    champion_id: p.championId,
    champion_name: p.championName,
    role: p.teamPosition || null,
    win: p.win,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    gold: p.goldEarned,
    damage: p.totalDamageDealtToChampions,
    cs: p.totalMinionsKilled + (p.neutralMinionsKilled ?? 0),
    vision_score: p.visionScore ?? 0,
    time_dead: p.totalTimeSpentDead ?? 0,
    longest_life: p.longestTimeSpentLiving ?? 0,
    killing_spree: p.largestKillingSpree ?? 0,
    multikill: p.largestMultiKill ?? 0,
    pentakills: p.pentaKills ?? 0,
    damage_taken: p.totalDamageTaken ?? 0,
    self_mitigated: p.damageSelfMitigated ?? 0,
    heal_teammates: p.totalHealsOnTeammates ?? 0,
    shield_teammates: p.totalDamageShieldedOnTeammates ?? 0,
    cc_time: p.timeCCingOthers ?? 0,
    largest_crit: p.largestCriticalStrike ?? 0,
    objectives_stolen: p.objectivesStolen ?? 0,
    solo_kills: p.challenges?.soloKills ?? 0,
    team_damage_pct: p.challenges?.teamDamagePercentage ?? null,
    skillshots_dodged: p.challenges?.skillshotsDodged ?? null,
    kills_near_enemy_turret: p.challenges?.killsNearEnemyTurret ?? null,
    fountain_takedowns: p.challenges?.takedownsInEnemyFountain ?? null,
    smiteless_steals: p.challenges?.epicMonsterStolenWithoutSmite ?? null,
    ally_saves: p.challenges?.saveAllyFromDeath ?? null,
  };
}

export interface PersistResult {
  matchInserted: boolean;
  participantsWritten: number;
}

/**
 * Insert a match and the participant rows for any tracked puuid in it.
 * @param trackedPuuids if null, writes rows for ALL participants (used only for
 *   single-match fixture seeding); normally pass the crew/player puuid set.
 */
export async function persistMatch(
  client: Queryable,
  match: MatchDto,
  trackedPuuids: Set<string> | null,
  opts: { storeRaw?: boolean } = {},
): Promise<PersistResult> {
  const matchId = match.metadata.matchId;
  const info = match.info;
  const startMs = info.gameStartTimestamp ?? info.gameCreation;
  const patch = info.gameVersion ?? null;
  const region = info.platformId ?? "UNKNOWN";

  const ins = await client.query(
    `INSERT INTO matches (match_id, queue_id, game_start, game_duration, patch, region, raw)
     VALUES ($1, $2, to_timestamp($3::double precision / 1000.0), $4, $5, $6, $7)
     ON CONFLICT (match_id) DO NOTHING`,
    [
      matchId,
      info.queueId,
      startMs,
      info.gameDuration,
      patch,
      region,
      opts.storeRaw ? JSON.stringify(match) : null,
    ] as never[],
  );
  const matchInserted = (ins as pg.QueryResult).rowCount === 1;

  let participantsWritten = 0;
  for (const p of info.participants) {
    if (trackedPuuids && !trackedPuuids.has(p.puuid)) continue;
    const r = mapParticipant(matchId, info.queueId, p);
    const res = await client.query(
      `INSERT INTO match_participants
         (match_id, puuid, team_id, subteam_id, placement, champion_id, champion_name,
          role, win, kills, deaths, assists, gold, damage, cs, vision_score,
          time_dead, longest_life, killing_spree, multikill, pentakills, damage_taken,
          self_mitigated, heal_teammates, shield_teammates, cc_time, largest_crit,
          objectives_stolen, solo_kills,
          team_damage_pct, skillshots_dodged, kills_near_enemy_turret, fountain_takedowns,
          smiteless_steals, ally_saves)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
               $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,
               $30,$31,$32,$33,$34,$35)
       ON CONFLICT (match_id, puuid) DO NOTHING`,
      [
        r.match_id, r.puuid, r.team_id, r.subteam_id, r.placement, r.champion_id, r.champion_name,
        r.role, r.win, r.kills, r.deaths, r.assists, r.gold, r.damage, r.cs, r.vision_score,
        r.time_dead, r.longest_life, r.killing_spree, r.multikill, r.pentakills, r.damage_taken,
        r.self_mitigated, r.heal_teammates, r.shield_teammates, r.cc_time, r.largest_crit,
        r.objectives_stolen, r.solo_kills,
        r.team_damage_pct, r.skillshots_dodged, r.kills_near_enemy_turret, r.fountain_takedowns,
        r.smiteless_steals, r.ally_saves,
      ] as never[],
    );
    participantsWritten += (res as pg.QueryResult).rowCount ?? 0;
  }
  return { matchInserted, participantsWritten };
}
