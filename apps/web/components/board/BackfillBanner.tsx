"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";

/**
 * Live "downloading your games" signal. The full match-history backfill runs in the
 * background and is rate-limited, so the first view only has the most recent games.
 * This banner periodically refreshes the page so new games stream in, and shows the
 * running count. It stops once the count stops growing (backfill caught up) or after
 * a hard cap. State persists across router.refresh() (which preserves client state),
 * so it keeps running even though the server's `active` flag flips off after load.
 */
export function BackfillBanner({ active, games }: { active: boolean; games: number }) {
  const router = useRouter();
  const [running, setRunning] = useState(active);
  const [justFinished, setJustFinished] = useState(false);
  const lastGames = useRef(games);
  const stalls = useRef(0);

  // Reset the stall counter whenever new games arrive.
  useEffect(() => {
    if (games > lastGames.current) {
      lastGames.current = games;
      stalls.current = 0;
    }
  }, [games]);

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      stalls.current += 1;
      // ~5 refreshes (~30s) with no new games → assume the backfill caught up.
      if (stalls.current > 5) {
        setRunning(false);
        setJustFinished(true);
        return;
      }
      router.refresh();
    }, 6000);
    const cap = setTimeout(() => setRunning(false), 6 * 60 * 1000); // hard stop after 6 min
    return () => {
      clearInterval(tick);
      clearTimeout(cap);
    };
  }, [running, router]);

  // Briefly show a "caught up" confirmation, then disappear.
  useEffect(() => {
    if (!justFinished) return;
    const t = setTimeout(() => setJustFinished(false), 6000);
    return () => clearTimeout(t);
  }, [justFinished]);

  if (justFinished) {
    return (
      <div className="notch notch-sm flex items-center gap-3 border border-win/30 bg-win/10 px-4 py-3 text-sm backdrop-blur">
        <Check className="h-4 w-4 shrink-0 text-win" />
        <span className="text-ink-dim">
          History up to date — <span className="font-semibold text-ink tnum">{games}</span> games loaded.
        </span>
      </div>
    );
  }

  if (!running) return null;

  return (
    <div className="notch notch-sm flex items-center gap-3 border border-primary/30 bg-primary/10 px-4 py-3 text-sm backdrop-blur">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
      <span className="text-ink-dim">
        Downloading your match history from Riot —{" "}
        <span className="font-semibold text-ink tnum">{games}</span> games loaded so far. More appear automatically; this
        can take a few minutes on our current API limits.
      </span>
    </div>
  );
}
