"use client";
import { motion, useReducedMotion } from "motion/react";
import { champName } from "@/lib/format";
import type { Crime } from "@/lib/recap/types";
import { ChampMug } from "./atoms";

/**
 * A League Tribunal case file — the Wall of Shame reimagined as a courtroom dossier. Case number,
 * defendant (their most-played champ as the mugshot), the charge, the damning stat, the evidence,
 * and a stamped GUILTY verdict. Reads clearly and stays theme-aware (loss accent).
 */
export function TribunalCase({ crime, delay = 0 }: { crime: Crime; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.figure
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="notch relative w-full max-w-sm overflow-hidden border border-loss/40 bg-surface shadow-pop"
    >
      {/* dossier header */}
      <div className="flex items-center justify-between border-b border-loss/30 bg-loss/5 px-4 py-2 font-mono text-2xs uppercase tracking-widest text-loss">
        <span>⚖ The Tribunal</span>
        <span>Case No. {crime.caseNo}</span>
      </div>

      <div className="flex flex-col gap-3 p-5">
        {/* defendant */}
        <div className="flex items-center gap-3">
          <ChampMug champion={crime.champion} size={54} tone="shame" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold leading-tight text-ink">{crime.name}</p>
            <p className="truncate font-mono text-2xs uppercase tracking-wide text-ink-faint">
              defendant · mains {champName(crime.champion) || "?"}
            </p>
          </div>
        </div>

        {/* charge + stat */}
        <div className="border-t border-line/50 pt-3">
          <p className="font-mono text-2xs uppercase tracking-widest text-ink-faint">Charge — {crime.crime}</p>
          <p className="mt-0.5 text-sm text-ink-dim">{crime.charge}.</p>
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-extrabold leading-none text-loss">{crime.stat}</span>
            <span className="font-mono text-2xs uppercase tracking-wide text-loss/70">{crime.unit}</span>
          </div>
        </div>
        <p className="font-mono text-2xs uppercase tracking-wide text-ink-faint">Evidence: {crime.evidence}</p>

        {/* verdict */}
        <div className="mt-1 flex items-center justify-between border-t border-line/50 pt-3">
          <span className="font-mono text-2xs uppercase tracking-widest text-ink-faint">Verdict</span>
          <span className="rotate-[-4deg] rounded-sm border-2 border-loss/70 px-3 py-0.5 font-display text-sm font-extrabold uppercase tracking-widest text-loss/90">
            ■ Guilty ■
          </span>
        </div>
      </div>
    </motion.figure>
  );
}
