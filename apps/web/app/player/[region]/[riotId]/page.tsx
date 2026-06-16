import Link from "next/link";
import { getPool } from "@crewstats/shared";
import { getMatchHistory, getFilteredStats, getChampionPool, getChampionLanes, getChampionQueues, getPlayerInsights } from "@crewstats/stats";
import { getOrBuildSnapshot } from "@/lib/snapshot";
import { getViewerRelation, getDuoRecord } from "@/lib/viewer";
import { PlayerInsights } from "@/components/board/PlayerInsights";
import { ProfileIcon, RankCrest } from "@/components/kit/Avatar";
import { WLPills, StaleChip } from "@/components/kit/Badge";
import { Frame, Section, PanelHead, Empty } from "@/components/kit/Frame";
import { Button } from "@/components/kit/Button";
import { ModeCards } from "@/components/board/ModeCards";
import { FilteredSummary } from "@/components/board/FilteredSummary";
import { RoleFilter } from "@/components/board/RoleFilter";
import { ChampionFilter } from "@/components/board/ChampionFilter";
import { MatchList } from "@/components/board/MatchList";
import { BackfillBanner } from "@/components/board/BackfillBanner";
import { RefreshProfileButton } from "@/components/board/RefreshProfileButton";
import { parseQueueSlug } from "@/components/kit/Tabs";
import { LANES } from "@/lib/filters";
import { PlayerLink } from "@/components/kit/links";
import { RoutePose } from "@/components/rift/RoutePose";
import { pct, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const QUEUE_FILTER_LABEL: Record<string, string> = {
  all: "All queues",
  ranked: "Ranked Solo",
  flex: "Ranked Flex",
  aram: "ARAM",
  arena: "Arena",
};
const LANE_LABEL: Record<string, string> = Object.fromEntries(LANES.map((l) => [l.key, l.label]));

export default async function PlayerSnapshot({
  params,
  searchParams,
}: {
  params: Promise<{ region: string; riotId: string }>;
  searchParams: Promise<{ q?: string; champ?: string; role?: string; refreshing?: string }>;
}) {
  const { region, riotId: raw } = await params;
  const { q, champ, role, refreshing } = await searchParams;
  const riotId = decodeURIComponent(raw);
  const result = await getOrBuildSnapshot(riotId, region);

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <RoutePose name="surface" />
        <h1 className="font-display text-xl font-bold">Couldn&apos;t load {riotId}</h1>
        <p className="mt-2 text-ink-dim">{result.message}</p>
        <Link href="/" className="mt-5 inline-block">
          <Button variant="ghost">Try another Riot ID</Button>
        </Link>
      </div>
    );
  }

  const s = result.snapshot;
  const queue = parseQueueSlug(q);
  const championId = champ ? Number(champ) : undefined;
  const basePath = `/player/${region}/${encodeURIComponent(riotId)}`;
  const roleKey = role && LANE_LABEL[role] ? role : undefined;

  // Who's looking: self (their own linked account), a stackmate (shares a stack), or a
  // stranger. This drives which private/crew sections appear.
  const relation = await getViewerRelation(s.identity.puuid);
  const isSelf = relation.tier === "self";
  const isStackmate = relation.tier === "stackmate";

  // history + champion pool + total-game count all depend only on the puuid — parallel.
  const [history, champions, totalRes] = await Promise.all([
    getMatchHistory(getPool(), s.identity.puuid, { slug: queue, championId, role: roleKey, limit: 20, crewPuuids: relation.sharedCrewPuuids }),
    getChampionPool(getPool(), s.identity.puuid, { slug: queue, role: roleKey, limit: 12 }),
    getPool().query<{ n: number }>(`SELECT count(*)::int AS n FROM match_participants WHERE puuid = $1`, [s.identity.puuid]),
  ]);
  const duo = isStackmate ? await getDuoRecord(relation.viewerPuuids, s.identity.puuid) : null;
  const insights = await getPlayerInsights(getPool(), s.identity.puuid);
  const champName = championId ? (history[0]?.championName ?? champions.find((c) => c.championId === championId)?.championName) : undefined;
  const champLanes = championId != null ? await getChampionLanes(getPool(), s.identity.puuid, championId, { slug: queue }) : undefined;
  const champQueues = championId != null ? await getChampionQueues(getPool(), s.identity.puuid, championId) : undefined;
  const totalGames = totalRes.rows[0]?.n ?? 0;

  // Aggregate for the current view (queue + lane + champion) — always shown; with nothing
  // selected it's the overall summary.
  const filteredStats = await getFilteredStats(getPool(), s.identity.puuid, { slug: queue, championId, role: roleKey });
  const filterLabel = [QUEUE_FILTER_LABEL[queue], roleKey ? LANE_LABEL[roleKey] : null].filter(Boolean).join(" · ") || "All queues";

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <RoutePose name="surface" />

      <BackfillBanner active={result.backfilling || refreshing === "1"} games={totalGames} />

      <Frame as="header">
        <div className="flex flex-wrap items-center gap-4 p-5">
          <ProfileIcon id={s.identity.profileIcon} name={s.identity.riotId} size={64} framed />
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              <span>
                {s.identity.riotId}
                <span className="text-ink-faint">#{s.identity.tag}</span>
              </span>
              {isSelf && <span className="notch notch-sm bg-gold/15 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-gold">You</span>}
              {isStackmate && (
                <span className="notch notch-sm bg-primary/15 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-primary">
                  {relation.sharedCrews.length === 1 ? `In ${relation.sharedCrews[0]!.name}` : "In your stacks"}
                </span>
              )}
              {s.identity.isStale && <StaleChip />}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-2xs uppercase tracking-wide text-ink-faint">Solo</span>
                <RankCrest rank={s.rankSolo} size={20} />
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-2xs uppercase tracking-wide text-ink-faint">Flex</span>
                <RankCrest rank={s.rankFlex} size={20} />
              </span>
              <span className="text-2xs text-ink-faint">updated {timeAgo(s.lastUpdated)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xs text-ink-faint">Form</span>
            <WLPills form={s.recentForm.slice(0, 5)} />
          </div>
          {(isSelf || isStackmate) && <RefreshProfileButton riotId={riotId} region={region} />}
        </div>
      </Frame>

      <ModeCards modes={s.modes} basePath={basePath} active={queue} champ={champ} role={roleKey} champQueues={champQueues} />

      {/* Scouting insights — shown on every profile. */}
      <PlayerInsights insights={insights} self={isSelf} />

      {/* Stackmate: your shared context with this player — a full-width strip, not a rail. */}
      {isStackmate && (
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Frame>
            <PanelHead title="You two together" />
            <div className="p-4 pt-3">
              {duo && duo.games > 0 ? (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className={`font-display text-3xl font-bold ${duo.wins / duo.games >= 0.5 ? "text-win" : "text-loss"}`}>
                    {pct(duo.wins / duo.games)}
                  </span>
                  <span className="font-mono text-2xs text-ink-faint tnum">
                    {duo.wins}W {duo.games - duo.wins}L · {duo.games}g on the same team
                  </span>
                  <span className="w-full text-2xs text-ink-faint">Your shared games are highlighted in the match history below.</span>
                </div>
              ) : (
                <Empty>You haven&apos;t shared a tracked game yet.</Empty>
              )}
            </div>
          </Frame>
          <Frame>
            <PanelHead title="Shared stacks" />
            <ul className="flex flex-wrap gap-1.5 p-4 pt-3">
              {relation.sharedCrews.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/stack/${c.slug}/player/${encodeURIComponent(riotId)}`}
                    className="notch notch-sm inline-flex items-center gap-1.5 border border-line/60 bg-surface-2/40 px-3 py-1.5 text-sm font-medium transition-colors hover:text-gold"
                  >
                    {c.name} <span className="text-2xs text-ink-faint">view →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Frame>
        </div>
      )}

      {/* Self: your private "who you queue with" funnel — full-width, wraps into columns. */}
      {isSelf && s.frequentTeammates.length > 0 && (
        <Frame>
          <PanelHead title="Players you queue with" />
          <div className="p-4 pt-3">
            <p className="mb-3 text-sm text-ink-dim">
              <span className="font-semibold text-ink">{s.frequentTeammates.length}</span> players you queue with often — create a stack to see how you play <em>together</em>.
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {s.frequentTeammates.slice(0, 6).map((t) => (
                <li key={t.puuid} className="notch notch-sm flex items-center justify-between gap-2 border border-line/60 bg-surface-2/40 px-3 py-2 text-sm">
                  <PlayerLink riotId={t.riotId} tag={t.tag} region={region} className="min-w-0 truncate font-medium" />
                  <span className="shrink-0 text-2xs text-ink-faint tnum">
                    {t.gamesTogether}g · {t.gamesTogether ? pct(t.winsTogether / t.gamesTogether) : "—"}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/stack/new" className="mt-4 inline-block">
              <Button>Create a stack</Button>
            </Link>
          </div>
        </Frame>
      )}

      <Section title="Match history" action={<RoleFilter basePath={basePath} active={roleKey} q={queue} champ={champ} availableRoles={champLanes} />}>
        <div className="mb-3 space-y-3">
          <ChampionFilter champions={champions} basePath={basePath} activeId={championId} q={queue} role={roleKey} />
          <FilteredSummary stats={filteredStats} champName={champName} label={filterLabel} />
        </div>
        <MatchList items={history} basePath={basePath} crewSlug={isStackmate ? relation.sharedCrews[0]?.slug : undefined} mePuuid={s.identity.puuid} />
      </Section>
    </div>
  );
}
