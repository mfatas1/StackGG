/**
 * "Who really carried" — a single, role-fair carry score, replacing the old
 * KDA-only heuristics scattered across the match views.
 *
 * The problem with KDA: it crowns assassins and punishes tanks/supports who win games
 * without big kill counts. So we score the *ways* a game is actually carried and
 * normalize each within the game's roster (so the best tank, the best support, and the
 * best damage dealer are all measured against their lobby). A tank who soaks the most
 * damage can out-carry an ADC with a flashier KDA.
 *
 * Inputs are best-effort: any missing stat is treated as 0, so callers with only a few
 * fields still get a sensible (KDA + damage-ish) score, and callers with the full Riot
 * payload get the rich version. (Riot's turret/structure-damage field isn't in our
 * schema yet — add it to the weights here once it's stored.)
 */
export interface CarryStats {
  kills: number;
  deaths: number;
  assists: number;
  damage?: number; // damage to champions
  teamDamagePct?: number; // 0..1 share of team champ damage — the strongest single signal
  damageTaken?: number;
  selfMitigated?: number;
  healTeammates?: number;
  shieldTeammates?: number;
  ccTime?: number; // seconds CC'ing enemies
  visionScore?: number;
  gold?: number;
  killingSpree?: number;
  multikill?: number; // largest multikill (2..5)
  soloKills?: number;
  objectivesStolen?: number;
  allySaves?: number;
}

const n = (v: number | undefined) => v ?? 0;

// Weights — positives sum ≈ 0.92, with a death penalty on top. Damage share and kill
// participation lead; frontline (tank) and enabling (support) carry real weight so
// non-fed roles aren't invisible; economy/vision are minor tiebreakers.
const W = {
  killParticipation: 0.22,
  damageShare: 0.32,
  clutch: 0.1, // sprees, multikills, solo kills, objective steals
  tank: 0.1, // damage taken + self-mitigated
  support: 0.1, // heals + shields + ally saves
  cc: 0.04,
  vision: 0.03,
  gold: 0.02,
  deathPenalty: 0.18,
};

/** Score every player in a roster, normalized within that roster. Higher = carried harder. */
export function carryScores<T extends CarryStats>(roster: T[]): Map<T, number> {
  const out = new Map<T, number>();
  if (roster.length === 0) return out;

  const max = (f: (p: CarryStats) => number) => Math.max(1, ...roster.map((p) => f(p)));
  const clutchRaw = (p: CarryStats) => n(p.killingSpree) + 2 * n(p.multikill) + 2 * n(p.soloKills) + 3 * n(p.objectivesStolen);
  const tankRaw = (p: CarryStats) => n(p.damageTaken) + n(p.selfMitigated);
  const supRaw = (p: CarryStats) => n(p.healTeammates) + n(p.shieldTeammates) + 1500 * n(p.allySaves);

  const mKP = max((p) => p.kills + p.assists);
  const mDmg = max((p) => n(p.damage));
  const mTeamDmg = max((p) => n(p.teamDamagePct));
  const mClutch = max(clutchRaw);
  const mTank = max(tankRaw);
  const mSup = max(supRaw);
  const mCC = max((p) => n(p.ccTime));
  const mVis = max((p) => n(p.visionScore));
  const mGold = max((p) => n(p.gold));
  const mDeath = max((p) => p.deaths);

  for (const p of roster) {
    // Prefer team damage share (already role-fair); fall back to raw damage if absent.
    const dmg = n(p.teamDamagePct) > 0 ? n(p.teamDamagePct) / mTeamDmg : n(p.damage) / mDmg;
    const score =
      W.killParticipation * ((p.kills + p.assists) / mKP) +
      W.damageShare * dmg +
      W.clutch * (clutchRaw(p) / mClutch) +
      W.tank * (tankRaw(p) / mTank) +
      W.support * (supRaw(p) / mSup) +
      W.cc * (n(p.ccTime) / mCC) +
      W.vision * (n(p.visionScore) / mVis) +
      W.gold * (n(p.gold) / mGold) -
      W.deathPenalty * (p.deaths / mDeath);
    out.set(p, score);
  }
  return out;
}

/** The single biggest carry in a roster (e.g. a team, for the MVP crown). */
export function mvpOf<T extends CarryStats>(roster: T[]): T | null {
  if (roster.length === 0) return null;
  const scores = carryScores(roster);
  return roster.reduce((best, p) => ((scores.get(p) ?? 0) > (scores.get(best) ?? 0) ? p : best), roster[0]!);
}
