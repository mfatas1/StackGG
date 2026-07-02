# Plan 3 — Recap (Season & Week)

**Goal:** turn the already-strong Wrapped-style story into the product's viral engine —
tighter cut, exportable share cards, and a distribution loop — **not** another rebuild.

**Status quo (audit):** the rebuilt recap is genuinely good: ~22 scenes across 5 acts,
comparison-first (per-metric `Standings` spine), heavy real game art (splash backdrops,
loading-art PlayerCards, real ping sprites, CDragon emotes, Tribunal case files), theme-aware,
reduced-motion-safe. Gaps: only **one** share card exists (the finale identity OG) vs the
spec's 3–4; two built kit pieces (`PingWheel`, `StatSlate`) are never used; Act III has two
back-to-back ping scenes and Act IV three near-identical meter/standings scenes; a 10-member
roster balloons to 6 scenes; every splash loads eagerly; the OG route re-runs the full resolver
per request; `og-theme.ts` hand-mirrors `globals.css`; `nightGames` hardcodes Europe/Paris;
resolver and SQL are untested. `bestGame` is computed but never shown. This is all uncommitted.

## Phase 0 — Ship it

Commit the current tree (recap + migrations 007–009 + dashboard layouts), deploy, and reload a
real stack so the comedy columns backfill. Everything below is iteration on a live feature.

## Phase 1 — Share & export (the viral object)

The single highest-leverage gap. The recap is the product's most screenshot-able surface and
currently exports one card from one scene.

1. **3–4 exportable share cards**, each a `next/og` route sharing layout with its in-page twin:
   - **Archetype card** (per member) — loading art + title + proof stat. Doubles as the
     landing page's peeking artifact and the N=1 single-player card.
   - **Tribunal card** (per crime) — the funniest, most stranger-legible object we have.
   - **Roster/superlatives grid** (1:1) — the whole stack on one poster.
   - **Finale identity** (exists) — keep.
   Every export carries the watermark + recruit hook footer ("Make your group's →
   stackgg.app") — the share *is* the ad.
2. **One source of truth for card layout.** ShareCard-in-page and the OG route currently
   duplicate markup ("keep in sync" comment). Render both from one component tree compatible
   with Satori constraints; same for theme tokens — generate `og-theme.ts`'s hex values from
   `globals.css` (build script) instead of hand-mirroring.
3. **Persistent share affordance.** A small share button on the progress rail (or per
   shareable scene), not only on the finale — people bail mid-story.
4. **Cache the OG routes** (per crew+window+theme, revalidate ~1h, bust on refresh) — today
   each image request re-runs the full resolver.

## Phase 2 — Tighten the cut

- **Merge the ping scenes.** `PingStorm` + `PingReport` → one scene: total + the
  ping-personality ranking, with the unused **`PingWheel`** as its centerpiece visual (it was
  built as exactly this). Per-type detail goes into the expandable.
- **Vary or merge Act IV.** `Outnumbered` / `Flawless` / `ButtonMasher` are three
  meter/standings scenes in a row. Either merge into one "Highlight Reel" scene with three
  distinct visual moments, or give each a distinct kit treatment (visual variety is the
  standing hard requirement). Use `StatSlate` here or delete it.
- **Cap roster scenes.** 2 cards/scene × 10 members = 6 scenes. Switch to 3–4 per scene past
  6 members, or hero-card the top outliers and grid the rest.
- **Surface the wasted data:** `bestGame` (a "The Highlight" scene or fold into RecordBook);
  the ingested-but-unused columns — 1-HP Wonder (`survivedSingleDigitHp`), Yeet & Delete
  (`knockIntoTeam`), and the single most on-brand stat in the product: **"The Disappearing
  Act"** (`had_afk_teammate` joined to our own roster — the AFK was one of *us*). op.gg
  structurally cannot do that one.
- **Week recap identity.** The week cut is currently just "season minus scenes". Give it its
  own opener framing ("Your week: Jun 23–29 · 12–4") and one week-only scene (session-by-
  session night timeline from `sessions.ts`) so the ritual feels distinct from the
  retrospective.

## Phase 3 — Performance & robustness

- **Lazy-load scene media.** All ~22 scenes mount eagerly with full-res splash JPGs. Gate
  splash/loading images on approach (IntersectionObserver already tracks scenes) with a
  low-cost placeholder.
- **Image fallbacks + live ddragon version** (see overview's Asset Kit) — fixed `_0.jpg` +
  pinned version means new champs 404 silently inside a full-bleed background.
- **Timezone:** derive night-owl hours from the crew's region instead of hardcoded
  Europe/Paris.
- **Tests:** the resolver (`resolve.ts`) — shame capping, distinct-archetype assignment,
  gating thresholds — is the comedy engine and is untested. Fixture-based tests before
  touching the archetype logic again.
- Decide `snap-proximity` vs the spec's `snap-mandatory` and document it (proximity was a
  deliberate fix for tall slides — keep it, update the spec).

## Phase 4 — Distribution (the loop)

- **Dashboard entry point** (in Plan 2): the recap banner — without it the recap is a URL
  nobody visits twice.
- **Discord weekly auto-post** (casual-viral-plan Bet 3): a stack registers a channel webhook
  in settings; every Friday the worker (`enqueueWeekly` infra exists) posts the week's roster
  share-card PNG + one-line verdict + link. This is retention (the group piles in to flame
  each other) and acquisition (the watermarked card sits where other groups see it) in one
  feature. v1 = plain webhook URL paste, no OAuth, no bot.
- **N=1 personal recap** (shared with Plan 1): a single-player cut of the recap engine on the
  player page — the on-ramp for people arriving from the landing with no stack.

## Sequencing

Phase 0 now; Phase 1 next (the landing plan depends on it); Phase 2 and 3 interleaved as
polish; Phase 4 after the share cards exist (the Discord post *is* a share card delivery).
