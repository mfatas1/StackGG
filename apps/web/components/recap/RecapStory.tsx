"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import Link from "next/link";
import type { Recap, RecapWindow } from "@/lib/recap/types";
import { getVisibleScenes } from "@/lib/recap/scenes";
import { ProgressRail } from "./ProgressRail";

/**
 * The scroll-snap story engine. Renders the window's scene list as full-screen snap sections,
 * tracks the active scene for the rail + background, and drives keyboard/tap navigation. The
 * recap renders inside the app's active theme (no override) — a solid --bg canvas takes over the
 * viewport so the persistent 3D Rift doesn't bleed through the story.
 */
export function RecapStory({ recap }: { recap: Recap }) {
  const scenes = getVisibleScenes(recap);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);

  const jumpTo = useCallback((i: number) => {
    const el = sectionRefs.current[Math.max(0, Math.min(scenes.length - 1, i))];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scenes.length]);

  // active-scene tracking
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    // Center-band detection: whichever section crosses the viewport's middle is "active".
    // Height-independent, so it works for tall (expanded) slides too.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        }
      },
      { root, rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    sectionRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [scenes.length]);

  // keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        jumpTo(active + 1);
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        jumpTo(active - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        jumpTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        jumpTo(scenes.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, jumpTo, scenes.length]);

  // lock the page behind the takeover so there's no double-scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // tap navigation — advance on lower-half tap, go back on upper-half; ignore interactive targets
  const onTap = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a,button,[data-no-nav]")) return;
    const y = e.clientY;
    if (y > window.innerHeight * 0.55) jumpTo(active + 1);
    else if (y < window.innerHeight * 0.45) jumpTo(active - 1);
  };

  const otherWindow: RecapWindow = recap.meta.window === "season" ? "week" : "season";

  return (
    <MotionConfig reducedMotion="user">
    <div
      ref={containerRef}
      onClick={onTap}
      className="recap-scroll fixed inset-0 z-40 snap-y snap-proximity overflow-y-scroll overflow-x-hidden bg-bg text-ink"
      style={{ scrollbarWidth: "none" }}
    >
      {/* persistent controls */}
      <div className="pointer-events-none fixed left-4 top-3 z-30 flex items-center gap-2" data-no-nav>
        <Link href={`/stack/${recap.meta.slug}`} className="pointer-events-auto rounded-pill border border-line bg-surface/80 px-3 py-1 text-xs font-semibold text-ink-dim backdrop-blur transition-colors hover:text-ink">
          ← {recap.meta.stackName}
        </Link>
      </div>
      <div className="pointer-events-none fixed right-4 top-3 z-30 hidden items-center gap-1.5 md:flex" data-no-nav>
        <Link
          href={`/stack/${recap.meta.slug}/recap?window=${otherWindow}`}
          className="pointer-events-auto rounded-pill border border-line bg-surface/80 px-3 py-1 text-xs font-semibold text-ink-dim backdrop-blur transition-colors hover:text-gold"
        >
          {otherWindow === "week" ? "This week →" : "Full season →"}
        </Link>
      </div>

      {scenes.map((scene, i) => {
        const Comp = scene.Component;
        return (
          <section
            key={scene.id}
            ref={(el) => {
              sectionRefs.current[i] = el;
            }}
            data-index={i}
            className="snap-start"
          >
            <Comp recap={recap} />
          </section>
        );
      })}

      <ProgressRail scenes={scenes.map((s) => ({ id: s.id, act: s.act }))} active={active} onJump={jumpTo} />
    </div>
    </MotionConfig>
  );
}
