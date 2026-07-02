# Plan 1 — Landing Page

**Goal:** a 2-screen casual front door that makes a stranger think *"I need to run this on MY
group"* in under 5 seconds — by **showing the funny artifact**, not describing the product.

**Status quo (audit):** the current `apps/web/app/page.tsx` still sells the old competitive
positioning — hero copy is a positioning statement ("Your whole squad's League. On one page."),
the centerpiece is a *leaderboard mock* (tiers, winrates, gauges), there are two competing
hero-weight CTAs ("See your stats" form + "Make a stack" button), and the expensive 3D Rift is
mounted on `/` but fully hidden behind the page's own opaque `<Backdrop>`. The live deploy is
even older. `docs/landing-redesign-spec.md` already diagnosed all of this — this plan adopts it
and adds the League-native visual layer.

## Logic changes

1. **One CTA intent.** Hero = single Riot-ID input (`RiotIdForm`), button **"See your year"**
   (stop overriding its default back to "See your stats"). "Make a stack" demotes to a quiet
   text link under the form and in the footer. Micro-line stays: "Free. No login. Public match
   data only."
2. **N=1 flow behind the CTA** (casual-viral-plan Bet 4). Riot ID submit →
   `/player/[region]/[riotId]` should land on a **personal mini-recap** (their archetype +
   2–3 comedy stats, built from the recap kit) with the recruit hook: "Add your friends to
   unlock the group recap." This is the activation wall fix — the landing promise ("see your
   year") and the landing's product shot must be the *same object* the user actually receives.
3. **Kill dead weight on `/`:** either (a) remove the opaque `<Backdrop>` so the 3D Rift
   actually shows (preferred, see design), or (b) don't mount `RiftWorld` on `/` at all and
   keep the cheap CSS backdrop. Paying for WebGL nobody sees is the worst of both.
4. **Deploy hygiene:** the live site is a stale build with different copy. Ship current main
   first so iteration happens against reality.

## Design (League-native)

**Screen 1 — the hook.**
- Deadpan headline, no exclamation marks: **"Find out who's actually inting."** (spec's
  recommendation; alternates: "Your duo is not the problem. You are." / "Settle the 1am
  Discord argument.")
- Riot-ID form as sole focal point in the lit `Frame`.
- **The peeking artifact** replaces the leaderboard mock: one real **Tribunal case card** or
  **archetype PlayerCard** from the recap kit (champion *loading-screen art*, "THE GREY SCREEN
  ENJOYER", proof stat, GUILTY stamp), tilted and partially cropped at the screen edge so it
  reads as "there's more". Reuse `components/recap/kit` — do not build a new mock.
- **Background:** let the 3D Rift breathe (it's the most League-native thing the site owns),
  darkened with the existing vignette so the form stays legible. If perf-tier is static, fall
  back to a CDragon **uncentered champion splash** with a heavy gradient scrim (the
  dpm.lol/League of Graphs recipe) instead of the current abstract CSS glow.
- Sprinkle one CDragon **emote** inline in the sub-copy (the recap's `<Emote>` component) —
  instant "this is made by people who play" signal.

**Screen 2 — show, don't tell.**
- 2–3 real artifact cards side by side: a Tribunal card, an archetype card, one Hall-of-Fame
  record card. Each with its own mini `stackgg.app` watermark (they're literally the share
  cards). No feature word-list, no benefit copy — captions at most.
- Quiet closer: "One link. The whole squad." + secondary "Make a stack" link.
- Footer: legal links + Riot disclaimer + Legal Jibber Jabber line.

**OG image:** rebuild `opengraph-image.tsx` to be an artifact card (champion splash + archetype
title), not a text lockup. The link preview is the first impression in Discord — it should look
like the product's output.

**Demo data honesty:** the artifact cards should render from a real (anonymizable) stack's
data, exported to a fixture — the plan doc's own warning applies: synthetic data makes every
render lie.

## Out of scope

Social proof theatre, testimonials, pricing, multi-page marketing. Two screens, one voice.

## Sequencing

1. Deploy current main (unblocks everything).
2. Build the shared artifact-card exports in the recap plan (dependency — the landing shows
   them).
3. Rewrite `page.tsx` to the 2-screen spec; fix CTA copy + backdrop/Rift decision.
4. New OG image; verify in Discord/Twitter preview.
5. N=1 personal mini-recap on the player page (can trail the landing ship; until then the CTA
   lands on the existing player page).
