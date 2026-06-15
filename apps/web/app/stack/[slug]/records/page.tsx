import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy, Crown, Star } from "lucide-react";
import { getPool } from "@crewstats/shared";
import { getCrewBySlug } from "@/lib/crews";
import { getCrewAwards, getCrewMemberPuuids } from "@crewstats/stats";
import { Frame, PanelHead } from "@/components/kit/Frame";
import { RoutePose } from "@/components/rift/RoutePose";
import { Awards } from "@/components/board/Awards";
import { ProfileIcon } from "@/components/kit/Avatar";
import { PlayerLink } from "@/components/kit/links";

export const dynamic = "force-dynamic";

type StandRow = {
  holder: { puuid: string; riotId: string; tag: string; region: string; profileIcon: number | null };
  firsts: number;
  avg: number;
  appearances: number;
};

function StandingsList({
  rows,
  crewSlug,
  value,
  caption,
  lead,
}: {
  rows: StandRow[];
  crewSlug: string;
  value: (p: StandRow) => string;
  caption: string;
  lead: "crown" | "star";
}) {
  return (
    <div>
      <ol className="space-y-1">
        {rows.map((p, i) => (
          <li key={p.holder.puuid} className={`notch notch-sm flex items-center gap-2.5 px-2.5 py-1.5 ${i === 0 ? "border border-gold/40 bg-gold/10" : ""}`}>
            <span className={`w-4 shrink-0 text-center font-mono text-xs tnum ${i === 0 ? "text-gold" : "text-ink-faint"}`}>{i + 1}</span>
            <ProfileIcon id={p.holder.profileIcon} name={p.holder.riotId} size={22} />
            <PlayerLink riotId={p.holder.riotId} tag={p.holder.tag} region={p.holder.region} crewSlug={crewSlug} className="min-w-0 flex-1 truncate text-sm font-medium" />
            {i === 0 && (lead === "crown" ? <Crown className="h-3.5 w-3.5 shrink-0 text-gold" /> : <Star className="h-3.5 w-3.5 shrink-0 text-gold" />)}
            <span className={`shrink-0 font-display text-lg font-bold tnum ${i === 0 ? "text-gold" : "text-ink-dim"}`}>{value(p)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-2xs text-ink-faint">{caption}</p>
    </div>
  );
}

export default async function StackRecordsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const crew = await getCrewBySlug(slug);
  if (!crew) notFound();

  const puuids = await getCrewMemberPuuids(getPool(), crew.id);
  const awards = await getCrewAwards(getPool(), puuids);
  const basePath = `/stack/${slug}`;

  // Standings across every record: #1 finishes + average placement (lower = better).
  type Stand = { holder: (typeof awards)[number]["holder"]; firsts: number; placeSum: number; appearances: number };
  const stand = new Map<string, Stand>();
  for (const a of awards) {
    for (const e of a.ranking) {
      const s = stand.get(e.holder.puuid) ?? { holder: e.holder, firsts: 0, placeSum: 0, appearances: 0 };
      if (e.rank === 1) s.firsts++;
      s.placeSum += e.rank;
      s.appearances++;
      stand.set(e.holder.puuid, s);
    }
  }
  const players = [...stand.values()].map((s) => ({ ...s, avg: s.placeSum / s.appearances }));
  const byFirsts = [...players].sort((a, b) => b.firsts - a.firsts || a.avg - b.avg);
  const byAvg = [...players].filter((p) => p.appearances >= 3).sort((a, b) => a.avg - b.avg || b.firsts - a.firsts);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <RoutePose name="surface" />

      <Frame as="header">
        <div className="flex flex-wrap items-end justify-between gap-4 p-5">
          <div>
            <Link href={basePath} className="mb-2 inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.12em] text-ink-faint transition-colors hover:text-gold">
              <ArrowLeft className="h-3.5 w-3.5" /> {crew.name}
            </Link>
            <h1 className="flex items-center gap-2.5 font-display text-3xl font-bold tracking-tight">
              <Trophy className="h-7 w-7 text-gold" /> Records
            </h1>
            <p className="mt-1 text-sm text-ink-dim">Every crew superlative on the Rift, with the full top 5 for each.</p>
          </div>
        </div>
      </Frame>

      {players.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Frame>
            <PanelHead title="Most records held" />
            <div className="p-4 pt-3">
              <StandingsList rows={byFirsts} crewSlug={slug} value={(p) => `${p.firsts}`} caption="first-place finishes" lead="crown" />
            </div>
          </Frame>
          <Frame>
            <PanelHead title="Best average finish" />
            <div className="p-4 pt-3">
              <StandingsList rows={byAvg} crewSlug={slug} value={(p) => p.avg.toFixed(2)} caption={`avg place across ${awards.length} records`} lead="star" />
            </div>
          </Frame>
        </div>
      )}

      <Frame>
        <PanelHead title="All records" />
        <div className="grid items-start gap-x-4 gap-y-2 p-4 pt-3 lg:grid-cols-2">
          <Awards awards={awards.slice(0, Math.ceil(awards.length / 2))} crewSlug={slug} defaultOpen />
          <Awards awards={awards.slice(Math.ceil(awards.length / 2))} crewSlug={slug} defaultOpen />
        </div>
      </Frame>
    </div>
  );
}
