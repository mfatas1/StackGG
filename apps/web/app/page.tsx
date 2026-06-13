import Link from "next/link";
import { ArrowRight, Swords, Users, Crosshair, TrendingDown } from "lucide-react";
import { RiotIdForm } from "@/components/forms";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { Reveal } from "@/components/landing/Reveal";
import { MiniStandings } from "@/components/landing/MiniStandings";

export const metadata = { title: "StackGG — how your group plays together" };

export default function Landing() {
  return (
    <>
      <SmoothScroll />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* warm coral glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full opacity-50 blur-[120px]"
          style={{ background: "radial-gradient(closest-side, oklch(0.73 0.17 45 / 0.55), transparent)" }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-36">
          <div>
            <p
              className="font-sans text-lg text-ink-dim animate-fade-up"
              style={{ animationDelay: "40ms" }}
            >
              op.gg tells you how <span className="text-ink">you</span> play.
            </p>
            <h1
              className="mt-2 font-display text-[clamp(2.5rem,6vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.03em] animate-fade-up"
              style={{ animationDelay: "120ms" }}
            >
              StackGG tells you how your <span className="text-primary">group</span> plays together.
            </h1>
            <p
              className="mt-5 max-w-xl text-pretty text-base text-ink-dim sm:text-lg animate-fade-up"
              style={{ animationDelay: "200ms" }}
            >
              One shared page for your League squad: a cross-mode leaderboard, duo synergy, and
              head-to-head records. Built for the argument in your Discord at 1am.
            </p>
            <div className="mt-7 max-w-xl animate-fade-up" style={{ animationDelay: "280ms" }}>
              <RiotIdForm size="lg" />
              <p className="mt-2.5 text-2xs text-ink-faint">
                No signup to see your own stats. Create a crew when you want the group view.
              </p>
            </div>
          </div>

          <div className="animate-fade-up lg:translate-y-2" style={{ animationDelay: "360ms" }}>
            <div className="lg:rotate-[1.5deg] lg:transition-transform lg:duration-500 lg:hover:rotate-0">
              <MiniStandings />
            </div>
          </div>
        </div>
      </section>

      {/* The questions */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <Reveal>
          <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            The questions your group actually argues about.
          </h2>
          <p className="mt-3 max-w-xl text-ink-dim">
            Every other stats site models one player. None of them answer these.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-6">
          <Reveal className="sm:col-span-4" delay={0}>
            <QCard
              icon={<Swords className="h-5 w-5" />}
              big
              q="Who's actually the best among us?"
              a="A live leaderboard across Ranked, Flex, ARAM and Arena, ranked relative to the crew, with recent form and winrate. Not your global rank. Your standing in this group."
            />
          </Reveal>
          <Reveal className="sm:col-span-2" delay={80}>
            <QCard icon={<Users className="h-5 w-5" />} q="Which duo is cracked?" a="Winrate together vs. apart for every pair, with sample sizes." />
          </Reveal>
          <Reveal className="sm:col-span-2" delay={0}>
            <QCard icon={<TrendingDown className="h-5 w-5" />} q="Who should stop queueing together?" a="The duos dragging each other down, quantified." />
          </Reveal>
          <Reveal className="sm:col-span-4" delay={80}>
            <QCard
              icon={<Crosshair className="h-5 w-5" />}
              big
              q="What's our head-to-head when we land on opposite sides?"
              a="Records from games where crewmates ended up enemies, including different Arena subteams. Pure bragging rights."
            />
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line/60 bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <Reveal>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Up and running in a minute.</h2>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { n: "01", t: "Enter your Riot ID", d: "See your own cross-mode stats instantly. No account needed." },
              { n: "02", t: "Create a crew, drop the link", d: "One invite link, straight into your Discord. Friends join with a Riot ID." },
              { n: "03", t: "Watch the standings", d: "We backfill 90 days and keep pulling new games. The roasting writes itself." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div>
                  <span className="font-mono text-sm text-primary">{s.n}</span>
                  <h3 className="mt-2 text-lg font-semibold">{s.t}</h3>
                  <p className="mt-1.5 text-sm text-ink-dim">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-lg border border-primary/30 bg-primary/10 px-6 py-12 text-center sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-[36rem] rounded-full opacity-40 blur-[90px]"
              style={{ background: "radial-gradient(closest-side, oklch(0.73 0.17 45 / 0.5), transparent)" }}
            />
            <h2 className="relative font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Start the argument.
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-ink-dim">
              Make a crew page, drop it in the server, and find out who&apos;s carrying whom.
            </p>
            <Link
              href="/crew/new"
              className="relative mt-6 inline-flex h-12 items-center gap-2 rounded bg-primary px-6 font-semibold text-primary-on transition-colors hover:bg-primary-strong"
            >
              Create your crew
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function QCard({
  icon,
  q,
  a,
  big = false,
}: {
  icon: React.ReactNode;
  q: string;
  a: string;
  big?: boolean;
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-line bg-surface-2/60 p-5 transition-colors hover:border-line-strong hover:bg-surface-2">
      <span className="grid h-9 w-9 place-items-center rounded bg-primary/15 text-primary">{icon}</span>
      <h3 className={`mt-4 font-semibold tracking-tight ${big ? "text-xl" : "text-base"}`}>{q}</h3>
      <p className="mt-2 text-sm text-ink-dim">{a}</p>
    </div>
  );
}
