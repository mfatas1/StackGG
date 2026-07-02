"use client";
import { useEffect, useState } from "react";
import type { Recap } from "@/lib/recap/types";
import { SceneFrame, ShareCard, Rise, Emote } from "../kit";
import { Lead } from "./_shared";

const ACT = "Act V · Curtain Call";

export function Identity({ recap }: { recap: Recap }) {
  const champ = recap.meta.topChampions[1] ?? recap.meta.topChampions[0] ?? null;
  return (
    <SceneFrame variant="splash" splashChampion={champ} act={ACT}>
      <Rise>
        <p className="text-sm uppercase tracking-[0.3em] text-ink-faint">So what kind of stack are you?</p>
      </Rise>
      <Rise delay={0.15}>
        <h2 className="text-balance font-display font-extrabold uppercase leading-[0.98] tracking-tight text-gold" style={{ fontSize: "clamp(2.5rem, 8vw, 6rem)" }}>
          {recap.identity.name}
        </h2>
      </Rise>
      <Rise delay={0.3}>
        <Lead className="text-center">{recap.identity.blurb}</Lead>
      </Rise>
    </SceneFrame>
  );
}

export function Finale({ recap }: { recap: Recap }) {
  return (
    <SceneFrame variant="panel" act={ACT}>
      <Rise>
        <h2 className="flex items-center justify-center gap-3 text-center font-display text-3xl font-extrabold uppercase text-ink">
          That&apos;s your season. <Emote name="poro" size={40} />
        </h2>
      </Rise>
      <Rise delay={0.1}>
        <Lead className="text-center">Screenshot it. Send it to the group chat. Start the argument.</Lead>
      </Rise>
      <Rise delay={0.2} className="mt-6 flex justify-center">
        <ShareCard recap={recap} />
      </Rise>
      <Rise delay={0.35} className="mt-6 flex justify-center">
        <ShareControls slug={recap.meta.slug} window={recap.meta.window} />
      </Rise>
    </SceneFrame>
  );
}

function ShareControls({ slug, window: win }: { slug: string; window: "season" | "week" }) {
  const [copied, setCopied] = useState(false);
  // Read the active theme only after mount so SSR and first client render agree (no hydration
  // mismatch); the OG link then matches whatever theme the viewer is actually using.
  const [theme, setTheme] = useState("frost");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme ?? "frost");
  }, []);
  const ogHref = `/stack/${slug}/recap/og/identity?window=${win}&theme=${theme}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/stack/${slug}/recap?window=${win}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3" data-no-nav>
      <button onClick={copy} className="rounded-pill border border-gold/50 bg-gold/10 px-5 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/20">
        {copied ? "Link copied ✓" : "Copy share link"}
      </button>
      <a href={ogHref} target="_blank" rel="noopener noreferrer" className="rounded-pill border border-line bg-surface px-5 py-2 text-sm font-semibold text-ink-dim transition-colors hover:text-ink">
        Download image ↗
      </a>
    </div>
  );
}
