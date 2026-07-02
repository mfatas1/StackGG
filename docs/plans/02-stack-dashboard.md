# Plan 2 — Stack Page / Dashboard

**Goal:** a curated, opinionated home base that a friend group opens weekly to laugh and argue —
visually as League-native as the recap — instead of a long neutral analytics scroll.

**Status quo (audit):** 10 registered panels on a solid 3-layer layout system
(`lib/dashboard.ts` meta → `dashboard-resolve.ts` server validation → `board/registry.tsx`
renderers), with per-crew public config (migration 007) and per-member overrides (008). But:
the default layout hides the three most differentiated panels (tags, sessions,
team-performance); there are **two competing layout editors** (the old list-style
`DashboardEditor` on settings and the newer drag `DashboardCanvas` in-page); winrate-by-group
is told three overlapping ways (stat rail, synergy explorer, team performance); tag-chip code
is duplicated between `Ladder` and `TagsPanel`; and the page is **asset-light** — mostly
numbers, plain bars, and text chips, while `format.ts`'s splash/emote/ping helpers sit unused
outside the recap.

## Logic changes

1. **One editor.** Delete `DashboardEditor.tsx` from the settings page; `DashboardCanvas` is
   the editor. Port the one thing it's missing — the **preset picker** (balanced / competitive
   / casual) — into the Canvas "Add panels" tray. Fix the title mismatch ("Team performance"
   vs "How we do together") by making `PANEL_META` the single source for panel titles.
2. **Casual-first default layout** (implements casual-viral-plan §2 — currently only a preset):
   - `stat-rail` (keep, it's good)
   - **Recap banner** (new, small): "Your week: 12–4, Mateo went nuclear → open recap". The
     recap currently has *no entry point from the dashboard* — this is the retention loop.
   - `tags` → restyled as **Archetypes** (unhide; hero treatment, see design)
   - `records` → restyled as **Hall of Fame & Shame**
   - `leaderboard` → reframed "Who's actually the best"
   - `sessions` (unhide)
   - `recent-games`
   - Demoted to add-from-tray (still available, not deleted): `synergy`, `role-matrix`,
     `team-performance`, `lane-leaders` (slimmed).
   Existing crews with a saved config are untouched; only `DEFAULT_LAYOUT` changes.
3. **Unified locked-state explanation.** Panels currently show inconsistent silent `Empty`
   states (tags need 5×10-game players, synergy needs minGames, sessions need 2 members…).
   Replace with one `LockedPanel` component: what unlocks it + a progress feel ("3 of 5
   players eligible"). For a new stack this turns a dead page into a tease.
4. **Cleanups:** extract the shared tag-chip component (dedupe `TAG_TONE`/`CHIP`); delete dead
   exports (`Lineup` in Awards, unused helpers); move synergy subset-scoring off the client
   render path for big crews (precompute top/worst server-side, keep the interactive picker
   lazy).
5. **Tags engine debt (background):** `tags.ts` is a 380-line monolith feeding both the
   dashboard and the recap roster. Split specs from engine (data table of ~45 tag specs +
   one z-score evaluator) before adding more tags — both surfaces are about to lean harder
   on it.

## Design (League-native)

The recap solved the aesthetic; port it back. Concretely:

- **Archetypes panel = recap `PlayerCard`s.** Champion loading-screen art, `font-display`
  archetype title, proof stat, tone ribbon — a champ-select row for the whole stack. One
  signature archetype per member hero-sized, ≤2 secondary chips (identity over inventory;
  everyone gets one — the inclusivity guarantee).
- **Records → card grid, not table.** Reuse/adapt the recap's `RecordBook`/Tribunal card
  anatomy: opinionated title ("GREY SCREEN ENJOYER", not "Total Time Spent Dead"), holder's
  champ art, huge `tnum` number, one-line roast, link to the match. Shame section first.
  Long tail behind "all records".
- **Leaderboard:** keep rank crests (they're League-native and informative) but crown #1 with
  the gold hero-row treatment and give last place a playful label ("The Anchor") instead of a
  sad grey row. Champion square icons for each player's top champ inline. Default queue tab
  "All".
- **Sessions:** each session row gets the night's most-played champion as a faded splash
  backdrop strip + an emote for the vibe (win streak → thumbs-up emote, 0–5 night → sadface).
- **Panel headers:** small role icons / hextech rules where relevant; empty states get an
  emote + one deadpan line instead of grey text.
- **Splash discipline:** faded/scrimmed backdrops only — the dashboard must stay data-dense
  and readable. Full-bleed splash is the recap's register, not the dashboard's.

## Out of scope

The shelved competitive cockpit and personal-layout expansion (casual-viral-plan §10). The
customizable layout machinery stays as-is — this plan curates the default, it doesn't extend
the editor.

## Sequencing

1. Editor consolidation + title/source-of-truth fix + chip dedupe (small, unblocks restyle).
2. Recap banner entry point (small, high leverage).
3. Archetypes + Hall of Fame & Shame restyles (the big visual lift — reuse recap kit).
4. New default layout + LockedPanel.
5. Leaderboard/sessions polish; synergy server-side precompute.
