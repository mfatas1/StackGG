"use client";
import { motion, useReducedMotion } from "motion/react";

/** The announcer banner aesthetic for the pentakill / glory reveal. */
export function PentakillBanner({ count, total }: { count: number; total: number }) {
  const reduce = useReducedMotion();
  void count;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.7 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ type: "spring", stiffness: 200, damping: 14 }}
      className="relative flex flex-col items-center"
    >
      <div
        className="relative px-10 py-4"
        style={{
          clipPath: "polygon(6% 0, 94% 0, 100% 50%, 94% 100%, 6% 100%, 0 50%)",
          background: "linear-gradient(180deg, oklch(var(--gold-light)) 0%, oklch(var(--gold)) 45%, oklch(var(--gold-dark)) 100%)",
        }}
      >
        <span className="font-display text-4xl font-extrabold uppercase tracking-[0.15em] text-bg sm:text-6xl">Pentakill</span>
      </div>
      <p className="mt-5 text-base text-ink-dim">
        Your stack hit <span className="font-bold text-gold">{total}</span> of them this season.
      </p>
    </motion.div>
  );
}
