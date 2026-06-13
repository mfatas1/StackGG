import { getPool } from "@crewstats/shared";

export function pool() {
  return getPool();
}

export async function resetDb() {
  await getPool().query(`TRUNCATE
    match_participants, matches, crew_members, crews, riot_accounts, users,
    stat_snapshots, crew_stat_cache, magic_links, sessions, riot_request_log
    RESTART IDENTITY CASCADE`);
}

export async function insertAccount(
  puuid: string,
  riotId: string,
  tag = "EUW",
  opts: { region?: string; rankSolo?: unknown; rankFlex?: unknown; profileIcon?: number } = {},
) {
  await getPool().query(
    `INSERT INTO riot_accounts (puuid, riot_id, tag, region, profile_icon, rank_solo, rank_flex)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (puuid) DO UPDATE SET riot_id = EXCLUDED.riot_id, rank_solo = EXCLUDED.rank_solo, rank_flex = EXCLUDED.rank_flex`,
    [
      puuid,
      riotId,
      tag,
      opts.region ?? "euw1",
      opts.profileIcon ?? 1,
      opts.rankSolo ? JSON.stringify(opts.rankSolo) : null,
      opts.rankFlex ? JSON.stringify(opts.rankFlex) : null,
    ],
  );
}

export interface SynthParticipant {
  puuid: string;
  teamId: number;
  win: boolean;
  subteamId?: number | null;
  placement?: number | null;
  championName?: string;
  championId?: number;
  role?: string | null;
  kills?: number;
  deaths?: number;
  assists?: number;
  gold?: number;
  damage?: number;
  cs?: number;
  vision?: number;
}

/** Insert a synthetic match with controlled participants. daysAgo offsets game_start. */
export async function insertMatch(
  matchId: string,
  queueId: number,
  participants: SynthParticipant[],
  daysAgo = 1,
) {
  const p = getPool();
  await p.query(
    `INSERT INTO matches (match_id, queue_id, game_start, game_duration, patch, region)
     VALUES ($1,$2, now() - ($3 || ' days')::interval, 1800, '14.12.1', 'EUW1')
     ON CONFLICT (match_id) DO NOTHING`,
    [matchId, queueId, String(daysAgo)],
  );
  for (const x of participants) {
    await p.query(
      `INSERT INTO match_participants
        (match_id, puuid, team_id, subteam_id, placement, champion_id, champion_name,
         role, win, kills, deaths, assists, gold, damage, cs, vision_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (match_id, puuid) DO NOTHING`,
      [
        matchId, x.puuid, x.teamId, x.subteamId ?? null, x.placement ?? null,
        x.championId ?? 1, x.championName ?? "Ahri", x.role ?? null, x.win,
        x.kills ?? 0, x.deaths ?? 0, x.assists ?? 0, x.gold ?? 10000, x.damage ?? 15000,
        x.cs ?? 150, x.vision ?? 20,
      ],
    );
  }
}
