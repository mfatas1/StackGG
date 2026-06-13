import Link from "next/link";
import { X } from "lucide-react";
import { getPool, QUEUE_LABEL } from "@crewstats/shared";
import { getMatchHistory } from "@crewstats/stats";
import { getOrBuildSnapshot } from "@/lib/snapshot";
import { ChampIcon, ProfileIcon } from "@/components/Icons";
import { Panel, PanelHeader, FormPills, SampleSize, Empty, Button } from "@/components/ui";
import { MatchHistory } from "@/components/MatchHistory";
import { QueueTabs, parseQueueSlug } from "@/components/QueueTabs";
import { PlayerLink } from "@/components/links";
import { pct, rankString, timeAgo, placementSuffix } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PlayerSnapshot({
  params,
  searchParams,
}: {
  params: Promise<{ region: string; riotId: string }>;
  searchParams: Promise<{ q?: string; champ?: string }>;
}) {
  const { region, riotId: raw } = await params;
  const { q, champ } = await searchParams;
  const riotId = decodeURIComponent(raw);
  const result = await getOrBuildSnapshot(riotId, region);

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
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
  const history = await getMatchHistory(getPool(), s.identity.puuid, { slug: queue, championId, limit: 20 });
  const champName = championId ? history[0]?.championName : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center gap-4">
        <ProfileIcon id={s.identity.profileIcon} name={s.identity.riotId} size={60} />
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {s.identity.riotId}
            <span className="text-ink-faint">#{s.identity.tag}</span>
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-dim">
            <span>Solo: {rankString(s.rankSolo)}</span>
            <span className="text-line-strong">|</span>
            <span>Flex: {rankString(s.rankFlex)}</span>
            <span className="text-2xs text-ink-faint">updated {timeAgo(s.lastUpdated)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xs text-ink-faint">Recent form</span>
          <FormPills form={s.recentForm.slice(0, 5)} />
        </div>
      </header>

      {/* Mode summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {s.modes.map((m) => (
          <div key={m.queueId} className="rounded-lg border border-line bg-surface-2/60 p-4">
            <div className="text-2xs font-medium uppercase tracking-wide text-ink-faint">{QUEUE_LABEL[m.queueId]}</div>
            {m.games === 0 ? (
              <div className="mt-3 text-sm text-ink-faint">No recent games</div>
            ) : (
              <>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-display text-2xl font-bold tnum">
                    {m.queueSlug === "arena" && m.avgPlacement != null
                      ? placementSuffix(Math.round(m.avgPlacement))
                      : pct(m.winrate)}
                  </span>
                  <SampleSize games={m.games} />
                </div>
                <div className="mt-1 font-mono text-2xs text-ink-dim tnum">
                  {m.avgKills}/{m.avgDeaths}/{m.avgAssists} · {m.kda.toFixed(2)} KDA
                </div>
                <div className="mt-3 space-y-1.5">
                  {m.topChampions.slice(0, 3).map((c) => (
                    <div key={c.championId} className="flex items-center gap-2 text-2xs">
                      <ChampIcon name={c.championName} size={18} />
                      <span className="flex-1 truncate text-ink-dim">{c.championName}</span>
                      <span className="text-ink-faint tnum">
                        {c.games}g {c.games ? pct(c.wins / c.games) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Match history */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold">Match history</h2>
            <QueueTabs basePath={basePath} active={queue} preserve={{ champ }} />
          </div>
          {champName && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3 py-1 text-xs">
              <ChampIcon name={champName} size={16} />
              <span>{champName} only</span>
              <Link href={queue === "all" ? basePath : `${basePath}?q=${queue}`} aria-label="Clear champion filter">
                <X className="h-3.5 w-3.5 text-ink-faint hover:text-ink" />
              </Link>
            </div>
          )}
          <MatchHistory items={history} basePath={basePath} region={region} />
        </section>

        {/* Frequent teammates / crew hook */}
        <aside>
          <Panel className="p-4">
            <PanelHeader title="You queue with these players" />
            <div className="px-1 pt-3">
              {s.frequentTeammates.length === 0 ? (
                <Empty>Once more of your history is in, your frequent teammates appear here.</Empty>
              ) : (
                <>
                  <p className="mb-3 text-sm text-ink-dim">
                    Make a crew to see how you play <em>together</em>.
                  </p>
                  <ul className="space-y-1.5">
                    {s.frequentTeammates.map((t) => (
                      <li
                        key={t.puuid}
                        className="flex items-center justify-between rounded border border-line bg-surface-2/60 px-3 py-2 text-sm"
                      >
                        <PlayerLink riotId={t.riotId} tag={t.tag} region={region} className="font-medium" />
                        <span className="text-2xs text-ink-faint tnum">
                          {t.gamesTogether}g · {t.gamesTogether ? pct(t.winsTogether / t.gamesTogether) : "—"} together
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/crew/new" className="mt-4 block">
                    <Button className="w-full">Create a crew</Button>
                  </Link>
                </>
              )}
            </div>
          </Panel>
        </aside>
      </div>

      {result.backfilling && (
        <p className="text-center text-2xs text-ink-faint">
          Pulling your full 90-day history in the background. Refresh in a minute for more.
        </p>
      )}
    </div>
  );
}
