"use client";
import { useLayoutEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Crown, Users2, Swords, TrendingUp } from "lucide-react";
import { RiotIdForm } from "@/components/forms";
import { Reveal } from "@/components/kit/motion";
import { Frame } from "@/components/kit/Frame";
import { Gauge } from "@/components/kit/Gauge";
import { WLPills } from "@/components/kit/Badge";
import { champIcon, champName } from "@/lib/format";

/**
 * Commit the landing to the on-brand warm-dark "ember" theme (coral + gold), including the
 * global header/footer, then restore the visitor's own theme when they navigate away. The
 * page wrapper also carries data-theme so the content is correct on first server render.
 */
function useLandingTheme() {
  useLayoutEffect(() => {
    const el = document.documentElement;
    const prev = el.getAttribute("data-theme");
    el.setAttribute("data-theme", "ember");
    return () => {
      if (prev) el.setAttribute("data-theme", prev);
    };
  }, []);
}

export default function Landing() {
  useLandingTheme();
  return (
    <div data-theme="ember" className="relative isolate overflow-hidden">
      <Backdrop />

      {/* ── Hero ── one screen, one action ── */}
      <section className="relative mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-4xl flex-col items-center justify-center px-4 pb-8 pt-10 text-center sm:px-6">
        <h1 className="animate-fade-up font-display text-[clamp(2.9rem,8vw,6rem)] font-extrabold leading-[0.92] tracking-[-0.035em] motion-reduce:animate-none">
          Your whole squad&apos;s League.
          <br />
          <span className="text-primary">On one page.</span>
        </h1>

        <p
          className="animate-fade-up mt-6 max-w-xl text-pretty text-base text-ink-dim [animation-delay:80ms] motion-reduce:animate-none sm:text-lg"
        >
          op.gg is about you. StackGG is about the group.
        </p>

        <div className="animate-fade-up mt-9 w-full max-w-xl [animation-delay:160ms] motion-reduce:animate-none">
          <Frame tone="lit" className="p-2 shadow-[0_0_60px_oklch(var(--primary)/0.25)]">
            <div className="p-1">
              <RiotIdForm size="lg" cta="See your stats" />
            </div>
          </Frame>
          <p className="mt-3 text-2xs text-ink-faint">Free. No signup to see your own stats.</p>
        </div>
      </section>

      {/* ── The product, as the star ── */}
      <section className="relative mx-auto -mt-4 max-w-5xl px-4 pb-24 sm:px-6 lg:-mt-8 lg:pb-32">
        <div className="animate-fade-up [animation-delay:260ms] motion-reduce:animate-none">
          <DashboardShot />
        </div>
      </section>

      {/* ── One concise closer ── */}
      <section className="relative mx-auto max-w-3xl px-4 pb-24 text-center sm:px-6 lg:pb-32">
        <Reveal>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">One link. The whole squad.</h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-ink-dim">
            Make a stack, drop the invite in your Discord, and everyone adds their Riot ID. Every shared game merges into
            one page you all argue over.
          </p>
          <div className="mt-8">
            <Link
              href="/stack/new"
              className="notch inline-flex items-center gap-2 bg-primary px-6 py-3 font-semibold text-primary-on transition-transform hover:-translate-y-0.5"
            >
              Make a stack <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mx-auto mt-10 flex max-w-lg flex-wrap items-center justify-center gap-x-2.5 gap-y-2 text-2xs uppercase tracking-[0.14em] text-ink-faint">
            {["Leaderboard", "Duo synergy", "Records", "Player tags", "Sessions", "Season recap"].map((f, i) => (
              <li key={f} className="flex items-center gap-2.5">
                {i > 0 && <span className="text-primary/50">·</span>}
                {f}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>
    </div>
  );
}

/* ── clean premium backdrop: no 3D map, just controlled light ── */

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-[5] bg-bg">
      {/* coral bloom behind the headline */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_-5%,oklch(var(--primary)/0.22),transparent_65%)]" />
      {/* gold counter-glow, low and off-center */}
      <div className="absolute inset-0 bg-[radial-gradient(45%_40%_at_78%_60%,oklch(var(--gold)/0.1),transparent_60%)]" />
      {/* edge vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_35%,transparent_55%,oklch(0_0_0/0.45))]" />
      {/* film grain */}
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}

/* ── the product shot: a faithful, static StackGG dashboard in an app window ── */

type Row = {
  name: string;
  champ: string;
  tier: string;
  wr: number;
  form: ("W" | "L")[];
  tags: { label: string; tone: "flex" | "shame" | "neutral" }[];
};

const ROWS: Row[] = [
  { name: "Sofía", champ: "MissFortune", tier: "Diamond", wr: 0.67, form: ["W", "W", "L", "W", "W"], tags: [{ label: "Duo Demon", tone: "flex" }, { label: "Lane Bully", tone: "neutral" }] },
  { name: "Mateo", champ: "Leona", tier: "Platinum", wr: 0.58, form: ["W", "L", "W", "W", "L"], tags: [{ label: "Vision Nerd", tone: "neutral" }] },
  { name: "Drei", champ: "LeeSin", tier: "Platinum", wr: 0.52, form: ["L", "W", "W", "L", "W"], tags: [{ label: "Coinflip", tone: "shame" }] },
  { name: "Kasia", champ: "Lux", tier: "Gold", wr: 0.44, form: ["L", "L", "W", "L", "W"], tags: [{ label: "Ping Menace", tone: "shame" }] },
  { name: "Nael", champ: "Yasuo", tier: "Gold", wr: 0.41, form: ["L", "W", "L", "L", "W"], tags: [{ label: "0/10 Power Spike", tone: "shame" }] },
];

const TAG_TONE: Record<"flex" | "shame" | "neutral", string> = {
  flex: "bg-gold/12 text-gold ring-gold/30",
  shame: "bg-loss/12 text-loss ring-loss/25",
  neutral: "bg-primary/12 text-primary ring-primary/30",
};

function ChampAvatar({ champ, size = 28, framed = false }: { champ: string; size?: number; framed?: boolean }) {
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-full ${framed ? "ring-2 ring-gold/60" : "ring-1 ring-line/70"}`}
      style={{ width: size, height: size }}
    >
      <Image src={champIcon(champ)} alt={champName(champ)} fill sizes={`${size}px`} className="scale-110 object-cover" unoptimized />
    </span>
  );
}

function DashboardShot() {
  return (
    <div className="[perspective:2200px]">
      <div className="[transform:rotateX(7deg)] [mask-image:linear-gradient(to_bottom,black_72%,transparent)] motion-reduce:[transform:none]">
        <Frame size="lg" className="shadow-[0_40px_120px_-30px_oklch(0_0_0/0.7)]">
          {/* window chrome */}
          <div className="flex items-center justify-between gap-3 border-b border-line/50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-win/80" />
              <span className="font-display text-lg font-bold tracking-tight">The Bot Lane Diff</span>
              <span className="hidden text-2xs text-ink-faint sm:inline">5 members · 1,208 shared games</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex -space-x-2">
                {ROWS.slice(0, 4).map((r) => (
                  <ChampAvatar key={r.name} champ={r.champ} size={24} />
                ))}
              </span>
              <span className="notch notch-sm hidden bg-primary/15 px-3 py-1.5 text-2xs font-semibold text-primary sm:inline">Invite</span>
            </div>
          </div>

          {/* stat rail */}
          <div className="grid grid-cols-3 gap-px border-b border-line/50 bg-line/40">
            <StatCell icon={<Users2 className="h-3.5 w-3.5" />} label="5-stack winrate" value="61%" note="23 full-stack games" accent />
            <StatCell icon={<Swords className="h-3.5 w-3.5" />} label="Best duo" value="71%" note="Sofía + Mateo · 41g" />
            <StatCell icon={<TrendingUp className="h-3.5 w-3.5" />} label="Games this week" value="34" note="1,208 all-time" />
          </div>

          {/* leaderboard */}
          <div className="p-3 sm:p-4">
            <div className="mb-2.5 flex items-center justify-between px-1">
              <span className="font-display text-sm font-bold tracking-tight">Leaderboard</span>
              <span className="flex gap-1 text-2xs text-ink-faint">
                <span className="text-primary">Ranked</span>
                <span>Flex</span>
                <span>ARAM</span>
                <span>Arena</span>
              </span>
            </div>
            <div className="space-y-1">
              {ROWS.map((r, i) => {
                const top = i === 0;
                return (
                  <div
                    key={r.name}
                    className={`notch notch-sm grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 border px-2.5 py-2 ${
                      top ? "border-gold/40 bg-gold/[0.07]" : "border-line/60 bg-surface-2/40"
                    }`}
                  >
                    <span className="grid h-6 w-6 place-items-center font-mono text-sm tnum">
                      {top ? <Crown className="h-4 w-4 text-gold" /> : <span className="text-ink-faint">{i + 1}</span>}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <ChampAvatar champ={r.champ} framed={top} />
                        <span className="truncate text-sm font-medium">{r.name}</span>
                        <span className="hidden text-2xs text-ink-faint sm:inline">{r.tier}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {r.tags.map((t) => (
                          <span
                            key={t.label}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-tight ring-1 ring-inset ${TAG_TONE[t.tone]}`}
                          >
                            {t.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 shrink-0 text-right font-mono text-sm tnum">{Math.round(r.wr * 100)}%</span>
                      <span className="hidden w-24 sm:block">
                        <Gauge value={r.wr} />
                      </span>
                      <span className="hidden lg:block">
                        <WLPills form={r.form} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Frame>
      </div>
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
  note,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-bg/70 px-4 py-3.5 backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint">
        <span className={accent ? "text-primary" : "text-ink-faint"}>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-1.5 font-display text-2xl font-bold leading-none tnum sm:text-3xl ${accent ? "text-primary" : ""}`}>{value}</div>
      <div className="mt-1.5 truncate text-2xs text-ink-faint">{note}</div>
    </div>
  );
}
