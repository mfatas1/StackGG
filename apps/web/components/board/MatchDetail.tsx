import { Crown, Coins, Flame, Eye, Castle, Users2, ChevronDown } from "lucide-react";
import { QUEUE_LABEL, QUEUES } from "@crewstats/shared";
import type { MatchDetailData, MatchPlayer, TeamSummary, MatchTimeline, GoldFrame, TeamObjectives } from "@/lib/match";
import { ChampIcon, RoleIcon } from "../kit/Avatar";
import { PlayerLink } from "../kit/links";
import { mvpOf } from "@/lib/carry";
import { timeAgo, gameDuration, placementSuffix, itemIcon } from "@/lib/format";

const short = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`);
const kdaRatio = (k: number, d: number, a: number) => (d === 0 ? k + a : (k + a) / d);
const kdaText = (k: number, d: number, a: number) => (d === 0 ? "Perfect" : ((k + a) / d).toFixed(2));
// Top tier is blue (primary), not gold — gold is reserved for the MVP crown so it doesn't
// read as a middle "warning yellow" between the red/green tiers.
const kdaTone = (r: number) => (r >= 5 ? "text-elite" : r >= 3 ? "text-win" : r >= 1.8 ? "text-ink" : "text-loss");

// Shared widths so the column labels line up with the rows beneath them. The damage and
// damage-taken columns flex-grow to soak up the middle space (no big empty gap).
const COL = { name: "w-32 sm:w-44", kda: "w-24", cs: "w-14", gold: "w-14", vis: "w-10", build: "w-[52px]" };

// How the signed-in viewer relates to a player in this lobby.
type Relation = "you" | "stack" | "tracked" | "none";

export function MatchDetail({
  data,
  tracked,
  stack = [],
  me = [],
  timeline,
}: {
  data: MatchDetailData;
  tracked: string[];
  stack?: string[]; // viewer's stackmate puuids (signed in)
  me?: string[]; // viewer's own puuids (signed in)
  timeline?: MatchTimeline;
}) {
  const trackedSet = new Set(tracked);
  const meSet = new Set(me);
  const stackSet = new Set(stack);
  const signedIn = stackSet.size > 0; // we know who the viewer is (and which players are theirs)
  // Remap each lobby player's (possibly old-key) puuid to the current one via the live
  // timeline's slot map, so "in your stack" resolves on older games (e.g. from records) too.
  const slot = timeline?.puuidBySlot ?? {};
  // When signed in, only the viewer's own accounts / stackmates are flagged. When not, fall
  // back to the generic "tracked" tint so known players still stand out for anonymous visitors.
  const relationOf = (p: MatchPlayer): Relation => {
    const puuid = slot[p.participantId] ?? p.puuid;
    return meSet.has(puuid) ? "you" : stackSet.has(puuid) ? "stack" : !signedIn && trackedSet.has(puuid) ? "tracked" : "none";
  };

  const arena = data.queueId === QUEUES.ARENA;
  const mins = data.gameDuration / 60;
  const maxDmg = Math.max(1, ...data.players.map((p) => p.damage));
  const maxTaken = Math.max(1, ...data.players.map((p) => p.damageTaken ?? 0));

  return (
    <div className="space-y-4">
      <Header data={data} />
      {timeline && timeline.gold.length > 1 && <GoldGraph gold={timeline.gold} />}
      {arena ? (
        <ArenaBoard data={data} mins={mins} maxDmg={maxDmg} rel={relationOf} items={timeline?.itemsByParticipant} />
      ) : (
        <div className="space-y-3">
          {data.teams.map((team) => (
            <TeamBlock
              key={team.teamId}
              team={team}
              roster={data.players.filter((p) => p.teamId === team.teamId)}
              region={data.region}
              mins={mins}
              maxDmg={maxDmg}
              maxTaken={maxTaken}
              rel={relationOf}
              dragons={timeline?.dragonsByTeam[team.teamId]}
              objectives={timeline?.objectivesByTeam[team.teamId]}
              items={timeline?.itemsByParticipant}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Header({ data }: { data: MatchDetailData }) {
  const queue = QUEUE_LABEL[data.queueId] ?? "Custom";
  return (
    <div className="notch border border-line/60 bg-surface-2/40 p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-xl font-bold">{queue}</h1>
        <span className="text-sm text-ink-faint">{gameDuration(data.gameDuration)}</span>
        {data.gameStart && <span className="text-sm text-ink-faint">· {timeAgo(data.gameStart)}</span>}
        {data.patch && <span className="text-2xs text-ink-faint">· Patch {data.patch}</span>}
      </div>
    </div>
  );
}

const goldK = (g: number) => `${g >= 0 ? "+" : "−"}${Math.abs(Math.round(g / 100) / 10)}k`;

/** Team gold advantage over time — blue above the line, red below. */
function GoldGraph({ gold }: { gold: GoldFrame[] }) {
  const W = 100;
  const H = 40;
  const n = gold.length;
  const maxGold = Math.max(1, ...gold.map((g) => Math.abs(g.goldDiff))) * 1.12;
  const x = (i: number) => (i / (n - 1)) * W;
  const yg = (v: number) => H / 2 - (v / maxGold) * (H / 2);
  const goldLine = gold.map((g, i) => `${x(i)},${yg(g.goldDiff)}`).join(" L ");
  const area = `M0,${H / 2} L ${goldLine} L ${W},${H / 2} Z`;
  const peak = gold.reduce((m, g) => (Math.abs(g.goldDiff) > Math.abs(m.goldDiff) ? g : m), gold[0]!);
  const peakSide = peak.goldDiff >= 0 ? "Blue" : "Red";

  return (
    <Panel title="Gold advantage" right={`Peak ${peakSide} ${goldK(Math.abs(peak.goldDiff))} @ ${peak.min}:00`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-32 w-full">
        <defs>
          <linearGradient id="adv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary, #6aa3ff)" stopOpacity="0.45" />
            <stop offset="50%" stopColor="var(--primary, #6aa3ff)" stopOpacity="0.05" />
            <stop offset="50%" stopColor="var(--loss, #e0566b)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--loss, #e0566b)" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="currentColor" strokeWidth="0.25" className="text-line" vectorEffect="non-scaling-stroke" />
        <path d={area} fill="url(#adv)" />
        <polyline points={goldLine} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex items-center justify-end text-[10px] text-ink-faint">
        <span>0:00 — {gold[n - 1]?.min}:00</span>
      </div>
    </Panel>
  );
}

function Panel({ title, right, children }: { title: string; right?: string; children: React.ReactNode }) {
  return (
    <div className="notch border border-line/60 bg-surface-2/30 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{title}</span>
        {right && <span className="text-2xs text-ink-faint tnum">{right}</span>}
      </div>
      {children}
    </div>
  );
}

// Real in-game objective art, bundled in /public/objectives. Bump ASSET_V when the art
// changes so browsers re-fetch instead of serving a cached image at the same filename.
const ASSET_V = "3";
function ObjImg({ file, name, size }: { file: string; name: string; size: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/objectives/${file}.png?v=${ASSET_V}`} alt={name} title={name} width={size} height={size} />;
}

const DRAKE_FILE: Record<string, string> = {
  Infernal: "infernal",
  Mountain: "mountain",
  Cloud: "cloud",
  Ocean: "ocean",
  Chemtech: "chemtech",
  Hextech: "hextech",
  Elder: "elder",
};
function DrakeIcon({ name, size = 16 }: { name: string; size?: number }) {
  const file = DRAKE_FILE[name];
  if (!file) return <Flame style={{ width: size, height: size }} aria-label={name} />; // unknown drake
  return <ObjImg file={`drake-${file}`} name={name} size={size} />;
}

function TeamBlock({
  team,
  roster,
  region,
  mins,
  maxDmg,
  maxTaken,
  rel,
  dragons,
  objectives,
  items,
}: {
  team: TeamSummary;
  roster: MatchPlayer[];
  region: string;
  mins: number;
  maxDmg: number;
  maxTaken: number;
  rel: (p: MatchPlayer) => Relation;
  dragons?: string[];
  objectives?: TeamObjectives;
  items?: Record<number, number[]>;
}) {
  const mvpPuuid = mvpOf(roster)?.puuid;
  const teamTone = team.teamId === 100 ? "text-primary" : "text-loss";
  // Prefer timeline-derived objective counts (reliable on raw-less matches); fall back to
  // the match payload's team totals.
  const barons = objectives?.barons ?? team.barons;
  const heralds = objectives?.heralds ?? team.heralds;
  const towers = objectives?.towers ?? team.towers;
  return (
    <div className="notch overflow-hidden border border-line/60 bg-surface-2/30">
      {/* Team header: result + totals + objectives (no "Blue/Red Team" label) */}
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 ${team.win ? "bg-win/10" : "bg-loss/10"}`}>
        <span className={`text-sm font-bold uppercase tracking-wide ${team.win ? "text-win" : "text-loss"}`}>
          {team.win ? "Victory" : "Defeat"}
        </span>
        <span className="font-mono text-xs text-ink-dim tnum">
          {team.kills} / {team.deaths} / {team.assists}
        </span>
        <span className="flex items-center gap-1 font-mono text-xs text-ink-dim tnum" title="Team gold">
          <Coins className="h-3.5 w-3.5 text-gold" /> {short(team.gold)}
        </span>
        <div className={`flex flex-wrap items-center gap-2.5 ${teamTone}`}>
          {barons > 0 && <Obj icon={<ObjImg file="baron" name="Baron" size={16} />} n={barons} label="Barons" />}
          {dragons && dragons.length > 0 ? (
            <span className="flex items-center gap-1" title={`Drakes: ${dragons.join(", ")}`}>
              {dragons.map((d, i) => (
                <DrakeIcon key={i} name={d} size={18} />
              ))}
            </span>
          ) : (
            team.dragons > 0 && <Obj icon={<Flame className="h-3.5 w-3.5" />} n={team.dragons} label="Dragons" />
          )}
          {heralds > 0 && <Obj icon={<Eye className="h-3.5 w-3.5" />} n={heralds} label="Rift Heralds" />}
          {towers > 0 && <Obj icon={<Castle className="h-3.5 w-3.5" />} n={towers} label="Towers" />}
        </div>
      </div>

      {/* Column labels */}
      <div className="flex items-center gap-3 px-3 py-1 text-[10px] uppercase tracking-wide text-ink-faint">
        <span className="w-8 shrink-0" />
        <span className={`${COL.name} shrink-0`}>Player</span>
        <span className={`${COL.kda} shrink-0 text-center`}>KDA</span>
        <span className="flex-1">Damage</span>
        <span className="hidden flex-1 lg:block">Taken</span>
        <span className={`${COL.cs} shrink-0 text-right`}>CS</span>
        <span className={`${COL.gold} shrink-0 text-right`}>Gold</span>
        <span className={`${COL.vis} shrink-0 text-right`}>Vis</span>
        <span className="w-4 shrink-0" />
      </div>

      <div className="divide-y divide-line/40">
        {roster.map((p) => (
          <PlayerRow
            key={p.puuid}
            p={p}
            region={region}
            mins={mins}
            maxDmg={maxDmg}
            maxTaken={maxTaken}
            mvp={p.puuid === mvpPuuid}
            relation={rel(p)}
            items={items?.[p.participantId]}
          />
        ))}
      </div>
    </div>
  );
}

function PlayerRow({
  p,
  region,
  mins,
  maxDmg,
  maxTaken,
  mvp,
  relation,
  items,
}: {
  p: MatchPlayer;
  region: string;
  mins: number;
  maxDmg: number;
  maxTaken: number;
  mvp: boolean;
  relation: Relation;
  items?: number[];
}) {
  const ratio = kdaRatio(p.kills, p.deaths, p.assists);
  const csPerMin = mins > 0 ? (p.cs / mins).toFixed(1) : "0";
  const linkable = p.riotId !== "Player" && p.tag.length > 0;
  const mine = relation === "you" || relation === "stack";
  // MVP glow wins the row background; stack/you/tracked tint it otherwise.
  const rowTone = mvp
    ? "bg-gold/10 ring-1 ring-inset ring-gold/40 shadow-[inset_0_0_18px_rgba(202,168,90,0.18)]"
    : relation === "you"
      ? "bg-primary/15 ring-1 ring-inset ring-primary/40"
      : relation === "stack"
        ? "bg-primary/10"
        : relation === "tracked"
          ? "bg-primary/[0.06]"
          : "";
  return (
    <details className="group">
      {/* Click the row to reveal the full per-player breakdown below it. */}
      <summary className={`flex cursor-pointer list-none items-center gap-3 px-3 py-1.5 text-sm marker:hidden hover:bg-surface-2/50 [&::-webkit-details-marker]:hidden ${rowTone}`}>
        {/* champ + level + role */}
        <span className="relative shrink-0">
          <ChampIcon name={p.championName} size={32} />
          {p.champLevel != null && (
            <span className="absolute -bottom-1 -left-1 grid h-4 min-w-4 place-items-center rounded-full bg-bg px-0.5 text-[9px] font-semibold text-ink-dim ring-1 ring-line tnum">
              {p.champLevel}
            </span>
          )}
          {p.role && (
            <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-bg ring-1 ring-line">
              <RoleIcon role={p.role} size={10} />
            </span>
          )}
        </span>

        {/* name + champion */}
        <div className={`${COL.name} min-w-0 shrink-0`}>
          <div className="flex items-center gap-1.5">
            {linkable ? (
              <PlayerLink riotId={p.riotId} tag={p.tag} region={region} className={`min-w-0 truncate ${mine || mvp ? "font-semibold text-ink" : "font-medium"}`}>
                {p.riotId}
              </PlayerLink>
            ) : (
              <span className="min-w-0 truncate font-medium text-ink-dim">{p.riotId}</span>
            )}
            {relation === "you" ? (
              <span className="shrink-0 rounded bg-primary/20 px-1 text-[9px] font-semibold uppercase tracking-wide text-primary">You</span>
            ) : relation === "stack" ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-primary/15 px-1 text-[9px] font-semibold uppercase tracking-wide text-primary" title="In your stack">
                <Users2 className="h-2.5 w-2.5" /> Stack
              </span>
            ) : null}
          </div>
          <span className="flex items-center gap-1 truncate text-2xs text-ink-faint">
            {p.championName}
            {mvp && <span className="inline-flex items-center gap-0.5 text-gold"><Crown className="h-3 w-3" /> MVP</span>}
          </span>
        </div>

        {/* KDA (deaths not coloured) */}
        <div className={`${COL.kda} shrink-0 text-center`}>
          <div className="font-mono text-xs tnum">
            {p.kills} / {p.deaths} / {p.assists}
          </div>
          <div className={`font-mono text-2xs tnum ${kdaTone(ratio)}`}>{kdaText(p.kills, p.deaths, p.assists)} KDA</div>
        </div>

        {/* Damage dealt — bar grows to fill space, number on the right */}
        <div className="flex flex-1 items-center gap-2" title={`${p.damage.toLocaleString()} to champions`}>
          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-pill bg-surface-3">
            <span className="block h-full bg-loss/70" style={{ width: `${(p.damage / maxDmg) * 100}%` }} />
          </span>
          <span className="w-10 shrink-0 text-right font-mono text-2xs text-ink-dim tnum">{short(p.damage)}</span>
        </div>

        {/* Damage taken — now with the number too */}
        <div className="hidden flex-1 items-center gap-2 lg:flex" title={`${(p.damageTaken ?? 0).toLocaleString()} taken`}>
          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-pill bg-surface-3">
            <span className="block h-full bg-ink-faint/50" style={{ width: `${((p.damageTaken ?? 0) / maxTaken) * 100}%` }} />
          </span>
          <span className="w-10 shrink-0 text-right font-mono text-2xs text-ink-faint tnum">{short(p.damageTaken ?? 0)}</span>
        </div>

        <div className={`${COL.cs} shrink-0 text-right`}>
          <div className="font-mono text-xs tnum">{p.cs}</div>
          <div className="font-mono text-2xs text-ink-faint tnum">{csPerMin}/m</div>
        </div>
        <div className={`${COL.gold} shrink-0 text-right font-mono text-xs text-ink-dim tnum`}>{short(p.gold)}</div>
        <div className={`${COL.vis} shrink-0 text-right font-mono text-xs text-ink-faint tnum`}>{p.visionScore}</div>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-open:rotate-180" />
      </summary>

      <PlayerDetail p={p} items={items} mins={mins} />
    </details>
  );
}

/** The full per-player breakdown shown when a scoreboard row is expanded. */
function PlayerDetail({ p, items, mins }: { p: MatchPlayer; items?: number[]; mins: number }) {
  const stats: { label: string; value: string }[] = [
    { label: "To champions", value: short(p.damage) },
    { label: "To turrets", value: short(p.damageToTurrets) },
    { label: "To objectives", value: short(p.damageToObjectives) },
    { label: "Damage taken", value: short(p.damageTaken ?? 0) },
    { label: "Self-mitigated", value: short(p.selfMitigated ?? 0) },
    { label: "Healing (allies)", value: short(p.healTeammates ?? 0) },
    { label: "Shielding (allies)", value: short(p.shieldTeammates ?? 0) },
    { label: "CC time", value: `${Math.round(p.ccTime ?? 0)}s` },
    { label: "Vision", value: `${p.visionScore}` },
    { label: "Wards placed", value: `${p.wardsPlaced}` },
    { label: "CS", value: `${p.cs} (${mins > 0 ? (p.cs / mins).toFixed(1) : "0"}/m)` },
    { label: "Gold", value: short(p.gold) },
    { label: "Solo kills", value: `${p.soloKills ?? 0}` },
    { label: "Best spree", value: `${p.killingSpree ?? 0}` },
    { label: "Largest multikill", value: `${p.multikill ?? 0}` },
    { label: "Objectives stolen", value: `${p.objectivesStolen ?? 0}` },
  ];
  const build = (items ?? []).slice(0, 7);
  return (
    <div className="border-t border-line/40 bg-bg/30 px-3 py-3">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="notch notch-sm bg-surface-2/40 px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-ink-faint">{s.label}</div>
            <div className="font-mono text-sm font-semibold tnum">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-ink-faint">Final build</span>
        <div className="flex flex-wrap gap-1">
          {build.length ? (
            build.map((id, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={itemIcon(id)} alt="" width={22} height={22} className="rounded-sm bg-surface-3 ring-1 ring-line/50" />
            ))
          ) : (
            <span className="text-2xs text-ink-faint">—</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Obj({ icon, n, label }: { icon: React.ReactNode; n: number; label: string }) {
  return (
    <span className="flex items-center gap-0.5 text-xs" title={`${n} ${label}`}>
      {icon}
      <span className="font-mono tnum">{n}</span>
    </span>
  );
}

/** Arena: 2-player subteams ordered by placement. */
function ArenaBoard({
  data,
  mins,
  maxDmg,
  rel,
  items,
}: {
  data: MatchDetailData;
  mins: number;
  maxDmg: number;
  rel: (p: MatchPlayer) => Relation;
  items?: Record<number, number[]>;
}) {
  const subteams = [...new Set(data.players.map((p) => p.subteamId))].sort((a, b) => {
    const pa = data.players.find((p) => p.subteamId === a)?.placement ?? 9;
    const pb = data.players.find((p) => p.subteamId === b)?.placement ?? 9;
    return pa - pb;
  });
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {subteams.map((st) => {
        const roster = data.players.filter((p) => p.subteamId === st);
        const place = roster[0]?.placement ?? null;
        return (
          <div key={st ?? "?"} className="notch border border-line/60 bg-surface-2/30 p-2">
            <div className={`mb-1 text-xs font-bold uppercase tracking-wide ${place != null && place <= 4 ? "text-win" : "text-loss"}`}>
              {place != null ? placementSuffix(place) : "—"}
            </div>
            <div className="divide-y divide-line/40">
              {roster.map((p) => (
                <PlayerRow key={p.puuid} p={p} region={data.region} mins={mins} maxDmg={maxDmg} maxTaken={maxDmg} mvp={false} relation={rel(p)} items={items?.[p.participantId]} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
