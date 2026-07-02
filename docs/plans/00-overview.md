# StackGG — Future Plans (2026-07-02)

Three separate, independently shippable plans, in priority order:

1. **[Landing page](./01-landing-page.md)** — the front door. Currently sells the old
   competitive positioning; must become the 2-screen casual hook that shows the funny artifact.
2. **[Stack page / dashboard](./02-stack-dashboard.md)** — the home base. Over-built,
   under-curated, and visually the least "League" surface in the product.
3. **[Recap](./03-recap.md)** — the viral engine. Already rebuilt and strong; needs share/export,
   trimming, and distribution — not another rebuild.

## The one goal everything serves

**Be as League-native as possible, visually** — splash art, loading screens, champion icons,
emotes, ping sprites, ranked crests, hextech chrome — **while staying a genuinely useful tool**
for friend groups to compare, laugh at each other, and (later) get better together.

The recap already nailed this. The rule for the other two surfaces: **port the recap's visual
language backwards** into the dashboard and landing, don't invent a third language.

## Where we are (audit summary, July 2026)

- **Live site is a stale deploy.** stackgg.app still shows the old "Settle it. As a stack."
  landing; local `main` has "Your whole squad's League." — and a large uncommitted tree
  (dashboard layouts, the whole recap rebuild, migrations 007–009). First action of any plan:
  commit + deploy what exists.
- **Strategy docs are ahead of the product.** `casual-viral-plan.md` and
  `landing-redesign-spec.md` already made the key calls (casual-first, share-driven, Wrapped
  mechanic, N=1 onboarding). The landing and dashboard haven't caught up.
- **The recap rebuild proved the League-native aesthetic works** (splash backdrops, loading-art
  player cards, real ping sprites, CDragon emotes, Tribunal case files). The dashboard uses
  almost none of it — `format.ts` defines `emote()`, `pingIcon()`, `champSplash()` that only
  the recap consumes.

## Cross-cutting: the League Asset Kit

One small shared layer, used by all three surfaces (mostly exists in `apps/web/lib/format.ts`
— finish and formalize it):

- **Version pinning:** `DDRAGON_VERSION` is a hardcoded string (`16.12.1`). Fetch
  `https://ddragon.leagueoflegends.com/api/versions.json` at build time (or a daily revalidated
  route) and thread it through, with the hardcoded value as fallback. New champs currently 404.
- **Image fallbacks:** `ChampIcon`/splash components need an `onError` fallback (generic
  hextech frame) — fixed skin `_0.jpg` + stale version means silent broken images today.
- **Asset inventory** (all verified URL patterns, see research):
  - ddragon: champ squares, splash `_0.jpg`, loading screens, item icons, profile icons,
    summoner spells, ability icons.
  - CommunityDragon: numeric-ID champ icons/splashes (incl. *uncentered* splashes — better for
    wide banners), **summoner emotes**, **ping-wheel sprites**, **modern ranked crests**, ward
    skins, hextech client UI chrome.
  - No voice lines — champion VO isn't on CDragon; don't plan audio around it.
- **Legal:** add the "Legal Jibber Jabber" sentence to the footer/legal page alongside the
  existing Riot disclaimer: *"StackGG was created under Riot Games' 'Legal Jibber Jabber'
  policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this
  project."* Keep the existing hard rules (no Arena augment/item winrates).
- **Fonts:** keep Cinzel as the Beaufort stand-in; don't ship Riot's licensed fonts.

## Sequencing across the three plans

1. Commit + deploy the current tree (recap, dashboard layouts) — everything below builds on it.
2. Recap plan phase 1 (share cards + dashboard entry point) — the viral object must exist
   before the landing shows it.
3. Landing rebuild (shows real recap artifacts).
4. Dashboard curation + League-native reskin.
5. Distribution (Discord weekly post) + N=1 onboarding.
