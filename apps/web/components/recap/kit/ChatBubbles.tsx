"use client";
import { motion, useReducedMotion } from "motion/react";
import type { RComparison } from "@/lib/recap/types";
import { ChampMug } from "./atoms";

/**
 * The comms channel: each member's ping rate as a chat/speech bubble, sized by how much they
 * spam. The loudest bubble is biggest and lit. Playful replacement for a bar chart.
 */
export function ChatBubbles({ data, max = 7 }: { data: RComparison; max?: number }) {
  const reduce = useReducedMotion();
  const rows = data.entries.slice(0, max);
  const maxV = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-4">
      {rows.map((r, i) => {
        const lead = i === 0;
        const scale = 0.82 + (r.value / maxV) * 0.5;
        return (
          <motion.div
            key={r.puuid}
            className="flex flex-col items-center gap-1.5"
            initial={reduce ? false : { opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, delay: i * 0.07, type: "spring", stiffness: 220, damping: 16 }}
          >
            <div
              className={`relative rounded-2xl border px-4 py-2 ${lead ? "border-primary/60 bg-primary/15" : "border-line bg-surface-2/70"}`}
              style={{ transform: `scale(${scale})` }}
            >
              <span className={`tnum font-display text-lg font-extrabold ${lead ? "text-primary" : "text-ink-dim"}`}>{r.display}</span>
              {/* bubble tail */}
              <span
                className={`absolute -bottom-1.5 left-5 h-3 w-3 rotate-45 border-b border-r ${lead ? "border-primary/60 bg-primary/15" : "border-line bg-surface-2"}`}
              />
            </div>
            <ChampMug champion={r.champion} size={30} tone={lead ? "neutral" : "neutral"} />
            <span className="max-w-[84px] truncate text-2xs text-ink-dim">{r.name}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
