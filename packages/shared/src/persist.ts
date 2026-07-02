import type pg from "pg";
import type { Queryable } from "./db.js";
import { isArena } from "./riot/regions.js";
import type { MatchDto, ParticipantDto } from "./riot/types.js";
import { carryScores, type CarryStats } from "./carry.js";

/** Map a raw participant to the carry-formula inputs. */
function carryStatsOf(p: ParticipantDto): CarryStats {
  return {
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    damage: p.totalDamageDealtToChampions,
    teamDamagePct: p.challenges?.teamDamagePercentage,
    damageTaken: p.totalDamageTaken,
    selfMitigated: p.damageSelfMitigated,
    healTeammates: p.totalHealsOnTeammates,
    shieldTeammates: p.totalDamageShieldedOnTeammates,
    ccTime: p.timeCCingOthers,
    visionScore: p.visionScore,
    gold: p.goldEarned,
    killingSpree: p.largestKillingSpree,
    multikill: p.largestMultiKill,
    soloKills: p.challenges?.soloKills,
    objectivesStolen: p.objectivesStolen,
    allySaves: p.challenges?.saveAllyFromDeath,
  };
}

/** Carry score per puuid, normalized within each team, plus the per-team MVP flag. */
export function teamCarry(participants: ParticipantDto[]): Map<string, { score: number; mvp: boolean }> {
  const out = new Map<string, { score: number; mvp: boolean }>();
  const teams = new Map<number, ParticipantDto[]>();
  for (const p of participants) {
    const arr = teams.get(p.teamId) ?? [];
    arr.push(p);
    teams.set(p.teamId, arr);
  }
  for (const roster of teams.values()) {
    const stats = roster.map(carryStatsOf);
    const scores = carryScores(stats);
    let max = -Infinity;
    stats.forEach((s) => {
      const v = scores.get(s) ?? -Infinity;
      if (v > max) max = v;
    });
    roster.forEach((p, i) => {
      const v = scores.get(stats[i]!) ?? 0;
      out.set(p.puuid, { score: v, mvp: v === max });
    });
  }
  return out;
}

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
  // Recap "comedy" fuel (migration 009): ping wheel counts.
  all_in_pings: number;
  assist_me_pings: number;
  bait_pings: number;
  basic_pings: number;
  command_pings: number;
  danger_pings: number;
  enemy_missing_pings: number;
  enemy_vision_pings: number;
  get_back_pings: number;
  hold_pings: number;
  need_vision_pings: number;
  on_my_way_pings: number;
  push_pings: number;
  vision_cleared_pings: number;
  // Comedy challenges (null when the match has no challenges block).
  kills_under_own_turret: number | null;
  outnumbered_kills: number | null;
  perfect_game: number | null;
  ability_uses: number | null;
  danced_with_herald: number | null;
  survived_single_digit_hp: number | null;
  knock_into_team_kills: number | null;
  fist_bump_participation: number | null;
  // Surrender flags.
  ended_in_surrender: boolean;
  team_early_surrendered: boolean;
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
    all_in_pings: p.allInPings ?? 0,
    assist_me_pings: p.assistMePings ?? 0,
    bait_pings: p.baitPings ?? 0,
    basic_pings: p.basicPings ?? 0,
    command_pings: p.commandPings ?? 0,
    danger_pings: p.dangerPings ?? 0,
    enemy_missing_pings: p.enemyMissingPings ?? 0,
    enemy_vision_pings: p.enemyVisionPings ?? 0,
    get_back_pings: p.getBackPings ?? 0,
    hold_pings: p.holdPings ?? 0,
    need_vision_pings: p.needVisionPings ?? 0,
    on_my_way_pings: p.onMyWayPings ?? 0,
    push_pings: p.pushPings ?? 0,
    vision_cleared_pings: p.visionClearedPings ?? 0,
    kills_under_own_turret: p.challenges?.killsUnderOwnTurret ?? null,
    outnumbered_kills: p.challenges?.outnumberedKills ?? null,
    perfect_game: p.challenges?.perfectGame ?? null,
    ability_uses: p.challenges?.abilityUses ?? null,
    danced_with_herald: p.challenges?.dancedWithRiftHerald ?? null,
    survived_single_digit_hp: p.challenges?.survivedSingleDigitHpCount ?? null,
    knock_into_team_kills: p.challenges?.knockEnemyIntoTeamAndKill ?? null,
    fist_bump_participation: p.challenges?.fistBumpParticipation ?? null,
    ended_in_surrender: p.gameEndedInSurrender ?? false,
    team_early_surrendered: p.gameEndedInEarlySurrender ?? false,
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

  // Carry score is computed over the FULL team (all players are present here), then
  // stored per tracked player so every view reads the same team-MVP.
  const carry = teamCarry(info.participants);

  let participantsWritten = 0;
  for (const p of info.participants) {
    if (trackedPuuids && !trackedPuuids.has(p.puuid)) continue;
    const r = mapParticipant(matchId, info.queueId, p);
    const c = carry.get(p.puuid);
    const res = await client.query(
      `INSERT INTO match_participants
         (match_id, puuid, team_id, subteam_id, placement, champion_id, champion_name,
          role, win, kills, deaths, assists, gold, damage, cs, vision_score,
          time_dead, longest_life, killing_spree, multikill, pentakills, damage_taken,
          self_mitigated, heal_teammates, shield_teammates, cc_time, largest_crit,
          objectives_stolen, solo_kills,
          team_damage_pct, skillshots_dodged, kills_near_enemy_turret, fountain_takedowns,
          smiteless_steals, ally_saves, carry_score, is_team_mvp,
          all_in_pings, assist_me_pings, bait_pings, basic_pings, command_pings, danger_pings,
          enemy_missing_pings, enemy_vision_pings, get_back_pings, hold_pings, need_vision_pings,
          on_my_way_pings, push_pings, vision_cleared_pings,
          kills_under_own_turret, outnumbered_kills, perfect_game, ability_uses, danced_with_herald,
          survived_single_digit_hp, knock_into_team_kills, fist_bump_participation,
          ended_in_surrender, team_early_surrendered)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
               $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,
               $30,$31,$32,$33,$34,$35,$36,$37,
               $38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,
               $52,$53,$54,$55,$56,$57,$58,$59,$60,$61)
       ON CONFLICT (match_id, puuid) DO UPDATE SET
         all_in_pings = EXCLUDED.all_in_pings, assist_me_pings = EXCLUDED.assist_me_pings,
         bait_pings = EXCLUDED.bait_pings, basic_pings = EXCLUDED.basic_pings,
         command_pings = EXCLUDED.command_pings, danger_pings = EXCLUDED.danger_pings,
         enemy_missing_pings = EXCLUDED.enemy_missing_pings, enemy_vision_pings = EXCLUDED.enemy_vision_pings,
         get_back_pings = EXCLUDED.get_back_pings, hold_pings = EXCLUDED.hold_pings,
         need_vision_pings = EXCLUDED.need_vision_pings, on_my_way_pings = EXCLUDED.on_my_way_pings,
         push_pings = EXCLUDED.push_pings, vision_cleared_pings = EXCLUDED.vision_cleared_pings,
         kills_under_own_turret = EXCLUDED.kills_under_own_turret, outnumbered_kills = EXCLUDED.outnumbered_kills,
         perfect_game = EXCLUDED.perfect_game, ability_uses = EXCLUDED.ability_uses,
         danced_with_herald = EXCLUDED.danced_with_herald, survived_single_digit_hp = EXCLUDED.survived_single_digit_hp,
         knock_into_team_kills = EXCLUDED.knock_into_team_kills, fist_bump_participation = EXCLUDED.fist_bump_participation,
         ended_in_surrender = EXCLUDED.ended_in_surrender, team_early_surrendered = EXCLUDED.team_early_surrendered`,
      [
        r.match_id, r.puuid, r.team_id, r.subteam_id, r.placement, r.champion_id, r.champion_name,
        r.role, r.win, r.kills, r.deaths, r.assists, r.gold, r.damage, r.cs, r.vision_score,
        r.time_dead, r.longest_life, r.killing_spree, r.multikill, r.pentakills, r.damage_taken,
        r.self_mitigated, r.heal_teammates, r.shield_teammates, r.cc_time, r.largest_crit,
        r.objectives_stolen, r.solo_kills,
        r.team_damage_pct, r.skillshots_dodged, r.kills_near_enemy_turret, r.fountain_takedowns,
        r.smiteless_steals, r.ally_saves, c?.score ?? null, c?.mvp ?? null,
        r.all_in_pings, r.assist_me_pings, r.bait_pings, r.basic_pings, r.command_pings, r.danger_pings,
        r.enemy_missing_pings, r.enemy_vision_pings, r.get_back_pings, r.hold_pings, r.need_vision_pings,
        r.on_my_way_pings, r.push_pings, r.vision_cleared_pings,
        r.kills_under_own_turret, r.outnumbered_kills, r.perfect_game, r.ability_uses, r.danced_with_herald,
        r.survived_single_digit_hp, r.knock_into_team_kills, r.fist_bump_participation,
        r.ended_in_surrender, r.team_early_surrendered,
      ] as never[],
    );
    participantsWritten += (res as pg.QueryResult).rowCount ?? 0;
  }
  return { matchInserted, participantsWritten };
}
