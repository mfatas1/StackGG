"use client";
import { useState } from "react";
import type { Award, AwardCategory } from "@crewstats/shared";
import { Awards } from "./Awards";

const TABS: { key: AwardCategory; label: string }[] = [
  { key: "pergame", label: "Per game" },
  { key: "alltime", label: "All-time" },
  { key: "perminute", label: "Per minute" },
];

/** Records split into per-game bests, all-time totals, and per-minute rates. */
export function RecordsTabs({ groups, crewSlug }: { groups: Record<AwardCategory, Award[]>; crewSlug: string }) {
  const [tab, setTab] = useState<AwardCategory>("pergame");
  const awards = groups[tab];
  return (
    <div>
      <div className="notch notch-sm mb-4 inline-flex gap-0.5 border border-line bg-bg/60 p-0.5 backdrop-blur">
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={on ? "page" : undefined}
              className={`notch notch-sm flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium transition-colors ${
                on ? "bg-surface-3 text-ink shadow-[inset_0_-2px_0_oklch(var(--primary)/0.7)]" : "text-ink-dim hover:text-ink"
              }`}
            >
              {t.label}
              <span className="text-2xs text-ink-faint tnum">{groups[t.key].length}</span>
            </button>
          );
        })}
      </div>
      {awards.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-faint">No records here yet — keep playing.</p>
      ) : (
        <div className="grid items-start gap-x-4 gap-y-2 lg:grid-cols-2">
          <Awards awards={awards.slice(0, Math.ceil(awards.length / 2))} crewSlug={crewSlug} defaultOpen />
          <Awards awards={awards.slice(Math.ceil(awards.length / 2))} crewSlug={crewSlug} defaultOpen />
        </div>
      )}
    </div>
  );
}
