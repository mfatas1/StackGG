import Link from "next/link";
import { QUEUE_LABEL } from "@crewstats/shared";
import { getOrBuildSnapshot } from "@/lib/snapshot";
import { ChampIcon, ProfileIcon } from "@/components/Icons";
import { Card, FormBadges, SampleSize, Empty } from "@/components/primitives";
import { pct, rankString, timeAgo, placementSuffix } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PlayerSnapshot({
  params,
}: {
  params: Promise<{ region: string; riotId: string }>;
}) {
  const { region, riotId: raw } = await params;
  const riotId = decodeURIComponent(raw);
  const result = await getOrBuildSnapshot(riotId, region);

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-md pt-10 text-center">
        <h1 className="text-xl font-semibold">Couldn&apos;t load {riotId}</h1>
        <p className="mt-2 text-ink-dim">{result.message}</p>
        <Link href="/" className="btn-ghost mt-4 inline-flex">
          Try another Riot ID
        </Link>
      </div>
    );
  }

  const s = result.snapshot;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <ProfileIcon id={s.identity.profileIcon} name={s.identity.riotId} size={56} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {s.identity.riotId}
            <span className="text-ink-faint">#{s.identity.tag}</span>
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink-dim">
            <span>Solo: {rankString(s.rankSolo)}</span>
            <span>Flex: {rankString(s.rankFlex)}</span>
            <span className="text-ink-faint">updated {timeAgo(s.lastUpdated)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-faint">Recent form</span>
          <FormBadges form={s.recentForm.slice(0, 5)} />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {s.modes.map((m) => (
          <Card key={m.queueId} title={QUEUE_LABEL[m.queueId]}>
            {m.games === 0 ? (
              <Empty>No recent games</Empty>
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-semibold stat-num">
                    {m.queueSlug === "arena" && m.avgPlacement != null
                      ? placementSuffix(Math.round(m.avgPlacement))
                      : pct(m.winrate)}
                  </span>
                  <SampleSize games={m.games} />
                </div>
                <div className="text-xs text-ink-dim stat-num">
                  {m.avgKills}/{m.avgDeaths}/{m.avgAssists} · {m.kda.toFixed(2)} KDA
                </div>
                <div className="space-y-1 pt-1">
                  {m.topChampions.slice(0, 3).map((c) => (
                    <div key={c.championId} className="flex items-center gap-2 text-xs">
                      <ChampIcon name={c.championName} size={18} />
                      <span className="flex-1 truncate">{c.championName}</span>
                      <span className="text-ink-faint">
                        {c.games}g {c.games ? pct(c.wins / c.games) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card title="We found players you queue with often">
        {s.frequentTeammates.length === 0 ? (
          <Empty>
            Once we&apos;ve backfilled more of your history, your frequent teammates will appear here.
          </Empty>
        ) : (
          <>
            <p className="mb-3 text-sm text-ink-dim">
              Create a crew to see how you play <em>together</em> — synergy, head-to-head, and a
              shared leaderboard.
            </p>
            <ul className="flex flex-wrap gap-2">
              {s.frequentTeammates.map((t) => (
                <li key={t.puuid} className="rounded-lg border border-line bg-bg-raised px-3 py-2 text-sm">
                  <span className="font-medium">{t.riotId}</span>
                  <span className="ml-2 text-xs text-ink-faint">
                    {t.gamesTogether}g · {t.gamesTogether ? pct(t.winsTogether / t.gamesTogether) : "—"} together
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/crew/new" className="btn-accent mt-4 inline-flex">
              Create a crew
            </Link>
          </>
        )}
      </Card>

      {result.backfilling && (
        <p className="text-center text-xs text-ink-faint">
          Pulling your full 90-day history in the background. Refresh in a minute for more.
        </p>
      )}
    </div>
  );
}
