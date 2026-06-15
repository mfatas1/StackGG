"use client";
import { useEffect, useState } from "react";

/** The "you're in" arrival — a confetti-free Hextech ring igniting beside the message. */
export function JoinWelcome({ mode }: { mode: "created" | "joined" }) {
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setLit(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className="notch flex items-center gap-4 border border-primary/30 bg-primary/10 px-4 py-3.5 text-sm backdrop-blur">
      <span aria-hidden className="relative grid h-9 w-9 shrink-0 place-items-center">
        <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full">
          <circle cx="20" cy="20" r="17" fill="none" stroke="oklch(var(--gold))" strokeWidth="2" pathLength={1} strokeDasharray={1} strokeDashoffset={lit ? 0 : 1} style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
        </svg>
        <span className={`h-2.5 w-2.5 rounded-full bg-gold transition-all duration-700 ${lit ? "shadow-[0_0_12px_oklch(var(--gold))]" : "opacity-30"}`} />
      </span>
      <p>
        <span className="font-semibold">{mode === "created" ? "Stack created. " : "You're in. "}</span>
        Drop the invite link in Discord to bring in the rest of the squad.
      </p>
    </div>
  );
}
