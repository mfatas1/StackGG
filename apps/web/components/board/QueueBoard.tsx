"use client";
import { createContext, useCallback, useContext, useState } from "react";
import type { QueueSlug, LeaderboardEntry, ActivityItem } from "@crewstats/shared";
import type { PlayerTag } from "@crewstats/stats";
import { Ladder } from "./Ladder";
import { Activity } from "./Activity";

/** All queues' leaderboard + activity, loaded once so tab switches are client-only. */
export type QueueBoards = Record<QueueSlug, { leaderboard: LeaderboardEntry[]; activity: ActivityItem[] }>;

const TABS: { slug: QueueSlug; label: string }[] = [
  { slug: "all", label: "SR" },
  { slug: "ranked", label: "Ranked" },
  { slug: "flex", label: "Flex" },
  { slug: "aram", label: "ARAM" },
  { slug: "arena", label: "Arena" },
];

const QueueCtx = createContext<{ queue: QueueSlug; setQueue: (q: QueueSlug) => void }>({
  queue: "all",
  setQueue: () => {},
});

/**
 * Holds the active queue in client state so switching the leaderboard never hits the
 * server. Keeps ?q= in the URL via a shallow history update (no navigation), so the
 * tab stays shareable/bookmarkable and the back button still works.
 */
export function QueueProvider({
  initial,
  basePath,
  children,
}: {
  initial: QueueSlug;
  basePath: string;
  children: React.ReactNode;
}) {
  const [queue, setQueueState] = useState<QueueSlug>(initial);
  const setQueue = useCallback(
    (q: QueueSlug) => {
      setQueueState(q);
      if (typeof window !== "undefined") {
        window.history.replaceState(window.history.state, "", q === "all" ? basePath : `${basePath}?q=${q}`);
      }
    },
    [basePath],
  );
  return <QueueCtx.Provider value={{ queue, setQueue }}>{children}</QueueCtx.Provider>;
}

/** Queue filter — toggles in the browser, zero round-trips. */
export function QueueTabsClient() {
  const { queue, setQueue } = useContext(QueueCtx);
  return (
    <div className="notch notch-sm inline-flex gap-0.5 border border-line bg-bg/60 p-0.5 backdrop-blur">
      {TABS.map((t) => {
        const on = t.slug === queue;
        return (
          <button
            key={t.slug}
            type="button"
            onClick={() => setQueue(t.slug)}
            aria-current={on ? "page" : undefined}
            className={`notch notch-sm px-3 py-1.5 text-sm font-medium transition-colors ${
              on
                ? "bg-surface-3 text-ink shadow-[inset_0_-2px_0_oklch(var(--primary)/0.7)]"
                : "text-ink-dim hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function LadderForQueue({
  boards,
  crewSlug,
  tags,
}: {
  boards: QueueBoards;
  crewSlug: string;
  tags?: Record<string, PlayerTag[]>;
}) {
  const { queue } = useContext(QueueCtx);
  return <Ladder entries={boards[queue].leaderboard} queue={queue} crewSlug={crewSlug} tags={tags} />;
}

export function ActivityForQueue({ boards, crewSlug }: { boards: QueueBoards; crewSlug?: string }) {
  const { queue } = useContext(QueueCtx);
  return <Activity items={boards[queue].activity} crewSlug={crewSlug} />;
}
