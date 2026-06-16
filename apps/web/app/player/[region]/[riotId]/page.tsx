import Link from "next/link";
import { getPool } from "@crewstats/shared";
import { getMatchHistory, getFilteredStats, getChampionPool, getChampionLanes, getChampionQueues } from "@crewstats/stats";
import { getOrBuildSnapshot } from "@/lib/snapshot";
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
  // history + champion pool + total-game count all depend only on the puuid — parallel.
  const [history, champions, totalRes] = await Promise.all([
    getMatchHistory(getPool(), s.identity.puuid, { slug: queue, championId, role: roleKey, limit: 20 }),
    getChampionPool(getPool(), s.identity.puuid, { slug: queue, role: roleKey, limit: 12 }),
    getPool().query<{ n: number }>(`SELECT count(*)::int AS n FROM match_participants WHERE puuid = $1`, [s.identity.puuid]),
  ]);
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
          <RefreshProfileButton riotId={riotId} region={region} />
        </div>
      </Frame>

      <ModeCards modes={s.modes} basePath={basePath} active={queue} champ={champ} role={roleKey} champQueues={champQueues} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Section title="Match history" action={<RoleFilter basePath={basePath} active={roleKey} q={queue} champ={champ} availableRoles={champLanes} />}>
          <div className="mb-3 space-y-3">
            <ChampionFilter champions={champions} basePath={basePath} activeId={championId} q={queue} role={roleKey} />
            <FilteredSummary stats={filteredStats} champName={champName} label={filterLabel} />
          </div>
          <MatchList items={history} basePath={basePath} mePuuid={s.identity.puuid} />
        </Section>

        <aside>
          <Frame>
            <PanelHead title="Players you queue with" />
            <div className="p-4 pt-3">
              {s.frequentTeammates.length === 0 ? (
                <Empty>Once more of your history is in, your frequent teammates appear here.</Empty>
              ) : (
                <>
                  <p className="mb-3 text-sm text-ink-dim">
                    We found <span className="font-semibold text-ink">{s.frequentTeammates.length}</span> players you queue with often. Create a stack to see how you play <em>together</em>.
                  </p>
                  <ul className="space-y-1.5">
                    {s.frequentTeammates.map((t) => (
                      <li key={t.puuid} className="notch notch-sm flex items-center justify-between border border-line/60 bg-surface-2/40 px-3 py-2 text-sm">
                        <PlayerLink riotId={t.riotId} tag={t.tag} region={region} className="font-medium" />
                        <span className="text-2xs text-ink-faint tnum">
                          {t.gamesTogether}g · {t.gamesTogether ? pct(t.winsTogether / t.gamesTogether) : "—"} together
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/stack/new" className="mt-4 block">
                    <Button className="w-full">Create a stack</Button>
                  </Link>
                </>
              )}
            </div>
          </Frame>
        </aside>
      </div>

    </div>
  );
}
