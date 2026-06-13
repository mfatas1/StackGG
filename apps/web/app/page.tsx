import Link from "next/link";
import { RiotIdForm } from "@/components/forms";

export default function Landing() {
  return (
    <div className="space-y-16">
      <section className="mx-auto max-w-2xl pt-10 text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          op.gg tells you how <span className="text-ink-dim">you</span> play.
          <br />
          CrewStats tells you how your <span className="text-accent">group</span> plays together.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-ink-dim">
          A shared page for your League friend group: cross-mode leaderboard, duo synergy, and
          head-to-head across Ranked, Flex, ARAM, and Arena. Enter your Riot ID to see your stats —
          no signup.
        </p>
        <div className="mx-auto mt-6 max-w-xl">
          <RiotIdForm />
        </div>
        <div className="mt-4 flex justify-center gap-4 text-sm text-ink-dim">
          <Link href="/crew/new" className="hover:text-ink">
            Create a crew →
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Feature
          title="Cross-mode leaderboard"
          body="Rank everyone in the crew across Ranked, Flex, ARAM and Arena — with recent form and winrate, relative to the crew average."
        />
        <Feature
          title="Duo synergy"
          body="Winrate together vs. apart for every pair. Settle who should queue with whom — sample sizes always shown."
        />
        <Feature
          title="Head-to-head"
          body="Records when crewmates land on opposite sides or different Arena subteams. Bragging rights, quantified."
        />
      </section>

      <section className="card p-6 text-center">
        <h2 className="text-lg font-semibold">Made for the friend group, not the solo player</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-ink-dim">
          Create a crew, drop the invite link in your Discord, and CrewStats backfills everyone&apos;s
          last 90 days and keeps polling for new games. Every stat is computed <em>across</em> the
          group — the thing no other site does.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link href="/crew/new" className="btn-accent">
            Create a crew
          </Link>
          <Link href="/legal" className="btn-ghost">
            Legal &amp; Riot policy
          </Link>
        </div>
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-accent">{title}</h3>
      <p className="mt-2 text-sm text-ink-dim">{body}</p>
    </div>
  );
}
