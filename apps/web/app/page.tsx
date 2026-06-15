"use client";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Swords, Users, Plus, Crown } from "lucide-react";
import { RiotIdForm } from "@/components/forms";
import { SmoothScroll } from "@/components/kit/SmoothScroll";
import { Reveal } from "@/components/kit/motion";
import { Frame } from "@/components/kit/Frame";
import { WLPills } from "@/components/kit/Badge";
import { Gauge } from "@/components/kit/Gauge";
import { POSES, lerpPose, setPose } from "@/components/rift/riftStore";

/** Drives the camera from the hero pose down onto the deck as you scroll fold 1. */
function useScrollDescent() {
  useEffect(() => {
    setPose(POSES.hero!);
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const p = Math.min(1, window.scrollY / (window.innerHeight * 0.9));
        setPose(lerpPose(POSES.hero!, POSES.dive!, p));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
}

export default function Landing() {
  useScrollDescent();
  return (
    <>
      <SmoothScroll />

      {/* Global legibility veil over the Rift so copy on every fold reads. Flat + fixed
          so it's consistent at any scroll position; the Rift still shows through. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-[2] bg-bg/55" />

      {/* Fold 1 — the descent */}
      <section className="relative mx-auto grid min-h-[92vh] max-w-6xl items-center gap-12 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Hero scrim — FULL-BLEED (breaks out of the centered container) so it never
            cuts off with a hard edge on wide screens. Fades right so the ladder shows Rift. */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 -z-[1] w-screen -translate-x-1/2 bg-[radial-gradient(58%_92%_at_30%_46%,oklch(var(--bg)/0.9),oklch(var(--bg)/0.5)_46%,transparent_72%)]" />
        <div>
          <h1 className="font-display text-[clamp(2.5rem,6.5vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.03em]">
            Settle it. <span className="text-primary">As a stack.</span>
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-base text-ink-dim sm:text-lg">
            One shared page for your League squad: a cross-mode leaderboard and duo synergy for your 5-stack. Built
            for the argument in your Discord at 1am.
          </p>
          <div className="mt-7 max-w-xl">
            <Frame tone="lit" className="p-2 shadow-[0_0_40px_oklch(var(--primary)/0.18)]">
              <div className="p-1">
                <RiotIdForm size="lg" />
              </div>
            </Frame>
            <p className="mt-2.5 text-2xs text-ink-faint">No signup to see your own stats. Create a stack when you want the group view.</p>
          </div>
        </div>
        <div className="lg:translate-y-2">
          <DemoLadder />
        </div>
      </section>

      {/* Fold 2 — we model the group */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <Reveal>
          <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            op.gg models <span className="text-ink-dim">you</span>. We model the <span className="text-primary">group</span>.
          </h2>
          <p className="mt-3 max-w-xl text-ink-dim">The unit of analysis is the friend group, not the player. That&apos;s the whole difference.</p>
        </Reveal>
        <Reveal className="mt-10 grid items-center gap-6 lg:grid-cols-[0.8fr_auto_1.2fr]" delay={80}>
          <Frame className="mx-auto w-full max-w-xs opacity-90">
            <div className="p-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-3 text-2xs font-semibold text-ink-dim">YOU</span>
                <div>
                  <div className="text-sm font-medium">Your solo page</div>
                  <div className="text-2xs text-ink-faint">every other stats site</div>
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="font-display text-3xl font-bold tnum">58%</span>
                <WLPills form={["W", "L", "W", "W", "L"]} />
              </div>
              <p className="mt-3 text-2xs text-ink-faint">Ranked Solo · 142 games · Platinum II</p>
              <div className="mt-3 border-t border-line/50 pt-3 text-2xs text-ink-faint">A number with no one to argue with.</div>
            </div>
          </Frame>
          <div className="mx-auto hidden h-9 w-9 place-items-center rounded-full border border-line text-ink-faint lg:grid">
            <ArrowRight className="h-4 w-4" />
          </div>
          <DemoLadder />
        </Reveal>
      </section>

      {/* Fold 3 — three proofs */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <Reveal>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Two things no other site shows you.</h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-6">
          <Reveal className="sm:col-span-4" delay={0}>
            <Proof big icon={<Swords className="h-5 w-5" />} title="Who's actually the best among us" body="A live leaderboard across Ranked, Flex, ARAM and Arena — ranked relative to the stack, with form, 7-day winrate, and how far each of you sits above or below the stack average. Your standing in this group, not the world." />
          </Reveal>
          <Reveal className="sm:col-span-2" delay={80}>
            <Proof icon={<Users className="h-5 w-5" />} title="Which duo is cracked" body="Winrate together vs. apart for every pair, with honest sample sizes." />
          </Reveal>
        </div>
      </section>

      {/* Fold 4 — cold start */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">We already know who you queue with.</h2>
            <p className="mt-3 max-w-md text-ink-dim">Enter your Riot ID and we surface the players you stack with most, from your own match history. One link in the server and the stack assembles itself.</p>
          </Reveal>
          <Reveal delay={100}>
            <Frame>
              <div className="p-6">
                <p className="mb-4 text-2xs font-medium uppercase tracking-[0.14em] text-ink-faint">Detected from your recent games</p>
                <div className="flex flex-wrap items-center gap-3">
                  {["Sofía", "Mateo", "Drei", "Kasia", "Nael"].map((n, i) => (
                    <div key={n} className="notch notch-sm flex animate-[fade-up_0.5s_both] items-center gap-2 border border-line/60 bg-surface-2/50 py-1.5 pl-1.5 pr-3.5" style={{ animationDelay: `${i * 110}ms` }}>
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-3 text-2xs font-semibold text-ink-dim">{n.slice(0, 2)}</span>
                      <span className="text-sm font-medium">{n}</span>
                    </div>
                  ))}
                  <div className="notch notch-sm flex items-center gap-1.5 border border-dashed border-primary/50 bg-primary/10 py-1.5 pl-3 pr-3.5 text-primary">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-semibold">your stack</span>
                  </div>
                </div>
              </div>
            </Frame>
          </Reveal>
        </div>
      </section>

      {/* Fold 5 — close */}
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-4 sm:px-6">
        <Reveal>
          <Frame tone="gold">
            <div className="relative px-6 py-12 text-center sm:px-12">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Start the argument.</h2>
              <p className="mx-auto mt-3 max-w-md text-ink-dim">Drop in your Riot ID, make a stack page, and find out who&apos;s carrying whom.</p>
              <div className="mx-auto mt-6 max-w-xl">
                <RiotIdForm />
              </div>
              <Link href="/stack/new" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-dim transition-colors hover:text-ink">
                or create a stack directly <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Frame>
        </Reveal>
      </section>
    </>
  );
}

function Proof({ icon, title, body, big = false }: { icon: React.ReactNode; title: string; body: string; big?: boolean }) {
  return (
    <Frame className="h-full">
      <div className="flex h-full flex-col p-5">
        <span className="notch notch-sm grid h-9 w-9 place-items-center bg-primary/15 text-primary">{icon}</span>
        <h3 className={`mt-4 font-semibold tracking-tight ${big ? "text-xl" : "text-base"}`}>{title}</h3>
        <p className="mt-2 text-sm text-ink-dim">{body}</p>
      </div>
    </Frame>
  );
}

const DEMO = [
  { name: "Sofía", tier: "Diamond", wr: 0.67, form: ["W", "W", "L", "W", "W"], vs: "+12pp", up: true },
  { name: "Mateo", tier: "Platinum", wr: 0.58, form: ["W", "L", "W", "W", "L"], vs: "+3pp", up: true },
  { name: "Drei", tier: "Platinum", wr: 0.52, form: ["L", "W", "W", "L", "W"], vs: "−1pp", up: false },
  { name: "Kasia", tier: "Gold", wr: 0.44, form: ["L", "L", "W", "L", "W"], vs: "−9pp", up: false },
] as const;

function DemoLadder() {
  return (
    <Frame size="lg" className="w-full">
      <div className="flex items-center justify-between border-b border-line/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-win" />
          <span className="text-sm font-semibold">The Bot Lane Diff</span>
        </div>
        <span className="text-2xs text-ink-faint tnum">312 shared games</span>
      </div>
      <div className="divide-y divide-line/40">
        {DEMO.map((r, i) => (
          <div key={r.name} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 px-4 py-2.5">
            <span className={`text-center font-mono text-sm ${i === 0 ? "text-gold" : "text-ink-faint"}`}>{i === 0 ? <Crown className="mx-auto h-4 w-4" /> : i + 1}</span>
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-3 text-2xs font-semibold text-ink-dim">{r.name.slice(0, 2)}</span>
              <span className="truncate text-sm font-medium">{r.name}</span>
              <span className="text-2xs text-ink-faint">{r.tier}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden w-24 sm:block">
                <Gauge value={r.wr} />
              </div>
              <span className="w-10 text-right font-mono text-sm tnum">{Math.round(r.wr * 100)}%</span>
              <span className={`w-12 text-right font-mono text-2xs ${r.up ? "text-win" : "text-loss"}`}>{r.vs}</span>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}
