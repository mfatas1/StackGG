"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Crown, ArrowUp, ArrowDown } from "lucide-react";
import type { LeaderboardEntry, QueueSlug } from "@crewstats/shared";
import type { PlayerTag } from "@crewstats/stats";
import { ProfileIcon, RankCrest } from "../kit/Avatar";
import { WLPills, SampleSize, StaleChip } from "../kit/Badge";
import { Gauge } from "../kit/Gauge";
import { Empty } from "../kit/Frame";
import { playerHref } from "../kit/links";
import { pct, placementSuffix, rankScore } from "@/lib/format";

type SortKey = "rank" | "wr" | "place";
type Dir = "asc" | "desc";

const COLS =
  "grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:grid-cols-[2.5rem_minmax(0,1fr)_9rem_11rem] lg:grid-cols-[2.5rem_minmax(0,1fr)_9.5rem_12rem_8rem]";

/**
 * The crew Ladder — the centerpiece. Sortable header buttons (aria-sort); rows
 * physically reorder (Framer layout) when the sort changes. #1 sits in a gold
 * crest. Mobile collapses to stacked rows, never a horizontal scroll of doom.
 */
export function Ladder({
  entries,
  queue,
  crewSlug,
  tags,
}: {
  entries: LeaderboardEntry[];
  queue: QueueSlug;
  crewSlug: string;
  tags?: Record<string, PlayerTag[]>;
}) {
  const isArena = queue === "arena";
  const reduce = useReducedMotion();
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({
    key: isArena ? "place" : "wr",
    dir: isArena ? "asc" : "desc",
  });
  const [tip, setTip] = useState<{ items: PlayerTag[]; x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const hover = (items: PlayerTag[], rect: DOMRect) => setTip({ items, x: rect.left + rect.width / 2, y: rect.top });
  const unhover = () => setTip(null);

  const sorted = useMemo(() => {
    const val = (e: LeaderboardEntry) =>
      sort.key === "wr" ? (e.winrate ?? -1)
      : sort.key === "rank" ? rankScore(queue === "flex" ? e.rankFlex : e.rankSolo)
      : (e.avgPlacement ?? 999);
    const arr = [...entries].sort((a, b) => val(a) - val(b));
    return sort.dir === "desc" ? arr.reverse() : arr;
  }, [entries, sort, queue]);

  if (!entries.length) return <Empty>No games ingested yet for this mode.</Empty>;

  const toggle = (key: SortKey, d: Dir) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: d }));

  return (
    <div role="table" aria-label="Stack standings" className="text-sm">
      <div role="row" className={`grid ${COLS} items-center gap-3 px-3 pb-2.5 text-2xs uppercase tracking-[0.12em] text-ink-faint`}>
        <span role="columnheader">#</span>
        <span role="columnheader">Player</span>
        <Sort className="hidden sm:flex" label="Rank" active={sort.key === "rank"} dir={sort.dir} onClick={() => toggle("rank", "desc")} />
        <Sort label={isArena ? "Avg place" : "Winrate"} active={sort.key === (isArena ? "place" : "wr")} dir={sort.dir} onClick={() => (isArena ? toggle("place", "asc") : toggle("wr", "desc"))} />
        <span role="columnheader" className="hidden lg:block">Form</span>
      </div>

      <div role="rowgroup" className="space-y-1">
        {sorted.map((e, i) => {
          const top = i === 0;
          return (
            <motion.div
              key={e.identity.puuid}
              layout={!reduce}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              role="row"
              className={`notch notch-sm grid ${COLS} items-center gap-3 border px-3 py-2.5 transition-colors ${
                top ? "border-gold/40 bg-gold/[0.07]" : "border-line/60 bg-surface-2/40 hover:bg-surface-3/50"
              }`}
            >
              <span role="cell" className="grid h-7 w-7 place-items-center font-mono tnum">
                {top ? <Crown className="h-4 w-4 text-gold" aria-label="Top of the stack" /> : <span className="text-ink-faint">{i + 1}</span>}
              </span>
              <div role="cell" className="flex min-w-0 flex-col gap-1">
                <Link href={playerHref({ riotId: e.identity.riotId, tag: e.identity.tag, region: e.identity.region, crewSlug })} className="flex min-w-0 items-center gap-2.5 font-medium transition-colors hover:text-primary">
                  <ProfileIcon id={e.identity.profileIcon} name={e.identity.riotId} size={28} framed={top} />
                  <span className="truncate">{e.identity.riotId}</span>
                  {e.identity.isStale && <StaleChip />}
                </Link>
                {tags?.[e.identity.puuid]?.length ? (
                  <PlayerTags tags={tags[e.identity.puuid]!} onHover={hover} onLeave={unhover} />
                ) : null}
              </div>
              <span role="cell" className="hidden sm:block">
                <RankCrest rank={queue === "flex" ? e.rankFlex : e.rankSolo} size={20} />
              </span>
              <span role="cell">
                {isArena ? (
                  <span className="font-mono tnum">{e.avgPlacement != null ? placementSuffix(Math.round(e.avgPlacement)) : "—"}</span>
                ) : (
                  <span className="flex items-center gap-2.5">
                    <span className="w-9 shrink-0 font-mono tnum">{pct(e.winrate)}</span>
                    <span className="hidden flex-1 sm:block">
                      <Gauge value={e.winrate} />
                    </span>
                    <SampleSize games={e.games} />
                  </span>
                )}
              </span>
              <span role="cell" className="hidden lg:block">
                <WLPills form={e.form} />
              </span>
            </motion.div>
          );
        })}
      </div>
      {mounted && tip && tip.items.length > 0 && <TagTooltip tip={tip} />}
    </div>
  );
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const TAG_TONE: Record<PlayerTag["tone"], string> = {
  shame: "bg-loss/12 text-loss ring-loss/25",
  flex: "bg-gold/12 text-gold ring-gold/30",
  neutral: "bg-primary/12 text-primary ring-primary/30",
};
const TAG_TEXT: Record<PlayerTag["tone"], string> = {
  shame: "text-loss",
  flex: "text-gold",
  neutral: "text-primary",
};

const CHIP = "inline-flex cursor-default items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-tight ring-1 ring-inset";
const INLINE_TAGS = 5;

function TagChip({ tag, onEnter, onLeave }: { tag: PlayerTag; onEnter: (rect: DOMRect) => void; onLeave: () => void }) {
  return (
    <span
      onMouseEnter={(e) => onEnter(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={onLeave}
      className={`${CHIP} ${TAG_TONE[tag.tone]}`}
    >
      {tag.label}
    </span>
  );
}

function PlayerTags({ tags, onHover, onLeave }: { tags: PlayerTag[]; onHover: (items: PlayerTag[], rect: DOMRect) => void; onLeave: () => void }) {
  const visible = tags.slice(0, INLINE_TAGS);
  const extra = tags.slice(INLINE_TAGS);
  const cells: ({ tag: PlayerTag } | { more: PlayerTag[] })[] = [...visible.map((t) => ({ tag: t })), ...(extra.length ? [{ more: extra }] : [])];
  return (
    <div className="flex flex-col gap-1">
      {chunk(cells, 3).map((row, ri) => (
        <div key={ri} className="flex flex-wrap gap-1">
          {row.map((c) =>
            "tag" in c ? (
              <TagChip key={c.tag.key} tag={c.tag} onEnter={(rect) => onHover([c.tag], rect)} onLeave={onLeave} />
            ) : (
              <span
                key="more"
                onMouseEnter={(e) => onHover(c.more, e.currentTarget.getBoundingClientRect())}
                onMouseLeave={onLeave}
                className={`${CHIP} border-line/60 bg-surface-3/60 text-ink-dim`}
              >
                +{c.more.length}
              </span>
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function TagTooltip({ tip }: { tip: { items: PlayerTag[]; x: number; y: number } }) {
  const single = tip.items.length === 1 ? tip.items[0]! : null;
  return createPortal(
    <div className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-full" style={{ left: tip.x, top: tip.y - 8 }}>
      <div className="notch notch-sm max-w-[16rem] border border-line bg-bg/95 p-2.5 shadow-xl backdrop-blur-md">
        {single ? (
          <>
            <div className={`text-2xs font-bold uppercase tracking-wide ${TAG_TEXT[single.tone]}`}>{single.label}</div>
            <div className="mt-1 text-xs leading-snug text-ink-dim">{single.meaning}</div>
            <div className="mt-1.5 font-mono text-2xs text-ink-faint">{single.detail}</div>
          </>
        ) : (
          <ul className="space-y-1.5">
            {tip.items.map((t) => (
              <li key={t.key} className="flex items-baseline justify-between gap-3">
                <span className={`text-2xs font-bold uppercase tracking-wide ${TAG_TEXT[t.tone]}`}>{t.label}</span>
                <span className="shrink-0 font-mono text-2xs text-ink-faint">{t.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Sort({ label, active, dir, onClick, className = "" }: { label: string; active: boolean; dir: Dir; onClick: () => void; className?: string }) {
  return (
    <button role="columnheader" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"} onClick={onClick} className={`flex items-center gap-1 text-2xs uppercase tracking-[0.12em] transition-colors hover:text-ink ${active ? "text-primary" : "text-ink-faint"} ${className}`}>
      {label}
      {active && (dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  );
}
