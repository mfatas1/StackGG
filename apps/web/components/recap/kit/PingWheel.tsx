"use client";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { pingIcon } from "@/lib/format";
import { ChampMug } from "./atoms";

/**
 * The in-game ping radial repurposed: a player's ping breakdown laid out on a wheel with the
 * real ping-wheel sprites, the dominant ping enlarged and lit. The player's champ sits in the
 * hub. Communication, visualised.
 */
export function PingWheel({
  champion,
  breakdown,
  size = 320,
}: {
  champion: string;
  breakdown: { key: string; label: string; count: number }[];
  size?: number;
}) {
  const reduce = useReducedMotion();
  const items = breakdown.slice(0, 8);
  const max = Math.max(...items.map((i) => i.count), 1);
  const radius = size * 0.38;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* wheel backing */}
      <div className="absolute inset-0 rounded-full border border-line/60" style={{ background: "radial-gradient(circle, oklch(var(--surface) / 0.6), transparent 70%)" }} />
      <div className="absolute rounded-full border border-line/40" style={{ inset: size * 0.12 }} />

      {/* hub */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <ChampMug champion={champion} size={size * 0.26} tone="neutral" />
      </div>

      {items.map((it, i) => {
        const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        const strength = it.count / max;
        const dim = 30 + strength * 30; // 30–60px
        const dominant = i === 0;
        return (
          <motion.div
            key={it.key}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
            style={{ left: x, top: y }}
            initial={reduce ? false : { opacity: 0, scale: 0.4 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, delay: i * 0.06, type: "spring", stiffness: 240, damping: 16 }}
          >
            <div
              className={`relative grid place-items-center rounded-full ${dominant ? "ring-2 ring-primary bg-primary/15" : "bg-surface-2/70"}`}
              style={{ width: dim + 14, height: dim + 14 }}
            >
              <Image src={pingIcon(it.key)} alt={it.label} width={dim} height={dim} className="object-contain" unoptimized />
            </div>
            <span className={`tnum text-2xs font-bold ${dominant ? "text-primary" : "text-ink-faint"}`}>{it.count.toLocaleString()}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
