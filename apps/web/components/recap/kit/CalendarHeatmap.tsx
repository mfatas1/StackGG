"use client";
import { motion, useReducedMotion } from "motion/react";

/**
 * GitHub-style calendar grid of the window's days, cells lit in the theme primary by games
 * played that day. Intuitive and pretty — "your rift nights" at a glance.
 */
export function CalendarHeatmap({ days, peak }: { days: { date: string; count: number }[]; peak: { date: string; count: number } | null }) {
  const reduce = useReducedMotion();
  if (!days.length) return null;

  const counts = new Map(days.map((d) => [d.date, d.count]));
  const start = new Date(days[0]!.date + "T00:00:00Z");
  const end = new Date(days[days.length - 1]!.date + "T00:00:00Z");
  // pad start back to Monday
  const startDow = (start.getUTCDay() + 6) % 7; // Mon=0
  const gridStart = new Date(start);
  gridStart.setUTCDate(gridStart.getUTCDate() - startDow);
  const max = Math.max(...days.map((d) => d.count), 1);

  const weeks: { date: string; count: number }[][] = [];
  const cur = new Date(gridStart);
  while (cur <= end) {
    const week: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = cur.toISOString().slice(0, 10);
      week.push({ date: iso, count: counts.get(iso) ?? 0 });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(week);
  }

  const intensity = (c: number) => (c === 0 ? 0 : 0.18 + (c / max) * 0.82);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell) => {
              const a = intensity(cell.count);
              const isPeak = peak && cell.date === peak.date;
              return (
                <motion.div
                  key={cell.date}
                  title={`${cell.date}: ${cell.count} games`}
                  className={`h-[11px] w-[11px] rounded-[2px] ${isPeak ? "ring-2 ring-gold" : ""}`}
                  style={{ background: a === 0 ? "oklch(var(--surface-2) / 0.6)" : `oklch(var(--primary) / ${a.toFixed(2)})` }}
                  initial={reduce ? false : { opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.25, delay: Math.min(wi * 0.02, 0.6) }}
                />
              );
            })}
          </div>
        ))}
      </div>
      {peak && (
        <p className="text-sm text-ink-dim">
          Most degenerate day: <span className="font-bold text-gold">{new Date(peak.date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span> — {peak.count} games.
        </p>
      )}
    </div>
  );
}
