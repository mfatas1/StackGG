import Link from "next/link";
import { notFound } from "next/navigation";
import { getPool, parseRiotId, findAccountByRiotId, QUEUE_LABEL } from "@crewstats/shared";
import { getCrewBySlug } from "@/lib/crews";
import { getCrewMemberPage } from "@crewstats/stats";
import { ChampIcon, ProfileIcon } from "@/components/Icons";
import { Card, SampleSize, Empty } from "@/components/primitives";
import { pct, rankString, placementSuffix } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ slug: string; riotId: string }>;
}) {
  const { slug, riotId: raw } = await params;
  const riotId = decodeURIComponent(raw);
  const parsed = parseRiotId(riotId);
  if (!parsed) notFound();

  const crew = await getCrewBySlug(slug);
  if (!crew) notFound();
  const account = await findAccountByRiotId(parsed.name, parsed.tag);
  if (!account) notFound();

  const page = await getCrewMemberPage(getPool(), crew.id, account.puuid);
  if (!page) notFound();

  return (
    <div className="space-y-6">
      <div className="text-sm text-ink-dim">
        <Link href={`/crew/${slug}`} className="hover:text-ink">
          ← {page.crew.name}
        </Link>
      </div>

      <header className="flex flex-wrap items-center gap-4">
        <ProfileIcon id={page.identity.profileIcon} name={page.identity.riotId} size={56} />
        <div>
          <h1 className="text-2xl font-bold">
            {page.identity.riotId}
            <span className="text-ink-faint">#{page.identity.tag}</span>
          </h1>
          <div className="mt-1 flex gap-3 text-sm text-ink-dim">
            <span>Solo: {rankString(page.rankSolo)}</span>
            <span>Flex: {rankString(page.rankFlex)}</span>
          </div>
        </div>
      </header>

      <Card title="Where they rank in the crew">
        {page.percentiles.length === 0 ? (
          <Empty>Not enough games to rank against the crew yet.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {page.percentiles.map((p) => (
              <div key={p.stat}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-ink-dim">{p.stat}</span>
                  <span className="stat-num">
                    {p.stat === "Win rate" ? pct(p.value) : p.value.toFixed(2)}
                    <span className="ml-2 text-xs text-ink-faint">{p.percentile}th pctl</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg-hover">
                  <div className="h-full bg-accent" style={{ width: `${p.percentile}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {page.modes.map((m) => (
          <Card key={m.queueId} title={QUEUE_LABEL[m.queueId]}>
            {m.games === 0 ? (
              <Empty>No games</Empty>
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
                {m.topChampions.slice(0, 3).map((c) => (
                  <div key={c.championId} className="flex items-center gap-2 text-xs">
                    <ChampIcon name={c.championName} size={18} />
                    <span className="flex-1 truncate">{c.championName}</span>
                    <span className="text-ink-faint">{c.games}g</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card title="Partner compatibility">
        {page.partnerCompatibility.length === 0 ? (
          <Empty>No shared games with crewmates yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {page.partnerCompatibility.map((s) => {
              const partner = s.a.puuid === account.puuid ? s.b : s.a;
              return (
                <li key={partner.puuid} className="flex items-center justify-between rounded-lg border border-line bg-bg-raised px-3 py-2 text-sm">
                  <span className="font-medium">{partner.riotId}</span>
                  <span className="stat-num">
                    {pct(s.winrate)} <SampleSize games={s.games} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
