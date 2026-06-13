# CrewStats

*Working name. op.gg tells you how you play. CrewStats tells you how your group plays together.*

## The idea

League of Legends is mostly played in friend groups that live on Discord — but every major stats site (op.gg, u.gg, mobalytics) models the *individual player*. None of them answer the questions friend groups actually argue about:

- Who's the best among us, across ranked, flex, ARAM, **and** Arena?
- Which duo actually wins together — and which one should stop queueing together?
- What's our 5-stack's winrate when X junglas instead of Y?
- What's our head-to-head record when we end up in the same Arena lobby?

CrewStats is a website where any group of friends creates a shared **crew page** that answers exactly these. You sign up, create a crew, drop an invite link in your Discord, and the site continuously ingests everyone's match history from the Riot API — computing stats that only exist *across* the group.

## Why this space is genuinely empty

1. **Wrong unit of analysis for incumbents.** Their data models, UIs, and monetization are built around individuals. Group-relative stats ("you're the worst Jinx in the crew") and team-as-unit analytics (duo synergy, role-assignment winrates) don't fit their architecture or their business.
2. **Distribution is built in.** A crew page is useless alone — every user must invite friends to unlock it, and the invite link naturally lands in a Discord server. Each user is structurally an inviter.
3. **Riot's own policy hollowed out Arena coverage.** Third parties are banned from showing win rates for Arena augments/items — which is what a builds site would build. We compute stats about *players and duos*, which is fully allowed. The mode incumbents neglect is wide open for the group angle.
4. **ARAM/Arena are data-rich but product-poor.** The match-v5 API returns full participant data for both; sites ignore them for business reasons, not technical ones.

## What v1 includes

- **Player snapshot** (no login): enter a Riot ID, see your cross-mode stats in under a minute, plus detected frequent teammates as the "create a crew" hook.
- **Crew dashboard**: cross-mode leaderboard with recent form, metric cards, duo synergy winrates, activity feed of shared games.
- **Crew member pages**: your stats with the crew as the reference set, partner-compatibility ranking.
- **Ingestion engine**: 90-day backfill on join, ~30-minute polling, rate-limit-safe Riot client.

Explicitly **not** in v1: Discord integration (v2 — weekly digest via webhook, then a bot), builds/runes/tier lists, live game pages, individual coaching, public player search. See `PLAN.md` §3.

## How it works (short version)

Next.js 15 + TypeScript monorepo with Postgres. A long-running worker ingests matches through a single rate-limited Riot API client (queues: 420 solo, 440 flex, 450 ARAM, 1700 Arena), deduplicating shared games. Stats (leaderboard, synergy, head-to-head) are pure SQL/TS computations over `match_participants`, cached per crew. Auth is email magic-link; crew membership is claim-by-Riot-ID (all displayed data is public match data — the same basis op.gg operates on). Hosting target: Railway/Fly (~$5–10/mo).

Full detail — data model, endpoints, architecture diagram, milestones, risks, and the parallel-agent work plan — lives in [`PLAN.md`](./PLAN.md).

## Roadmap

| Milestone | Scope | Status |
|---|---|---|
| M0 spike | Verify ARAM/Arena data shapes with a dev key (`spike/spike.mjs`) | ✅ done |
| M1 skeleton | Monorepo scaffold, schema, shared contracts, rate-limited client, backfill job | ✅ done |
| M2 crew core | Auth, crew create/join/invite, dashboard with real data | ✅ done (local) |
| M3 polish | Player snapshot, head-to-head, flex role stats, empty states | ✅ done (local) |
| M4 public | Deploy, disclaimer, production key application, share beyond friends | ⏳ deploy config ready; cloud deploy pending hosting account |
| v2 | Discord webhook digest → bot, RSO login, crew-vs-crew, other Riot titles | — |

## Running the full app (local)

```bash
npm install
cp .env.example .env            # then set RIOT_KEY (and AUTH_SECRET for prod)
createdb crewstats              # local Postgres
npm run db:migrate
./scripts/dev.sh                # runs the worker + web together
# open http://localhost:3000
```

Then: enter a Riot ID on the landing page to see a snapshot, or **Create a crew**
(magic-link sign-in — in dev the link is printed to the server console and returned
in the API response), share the `/join/<code>` link, and watch the dashboard fill in.

Docker (Postgres + web + worker in one project): `docker compose up --build`.

Tests: `npm test`. Typecheck: `npm run typecheck`.

### Implementation notes / deviations from PLAN

- **Auth** is a self-contained magic-link implementation (HMAC-signed session
  cookie) rather than NextAuth, so it works with no external SMTP/credentials.
  In v1 the link is delivered via console (`MAGIC_LINK_TRANSPORT=console`); wiring
  an SMTP transport is a drop-in in `apps/web/lib/session.ts`.
- **Rate limiting** is enforced through a Postgres-coordinated token bucket
  (`riot_request_log`) so the 20 req/s · 100 req/2min limits are **global** across
  the web and worker processes — verified holding at exactly 100/2min under load.
- On a **personal** Riot key, the first backfill of a 5-person crew is rate-limited
  to ~10–20 min of queued ingestion (PLAN §7); recent games appear immediately via a
  synchronous quick-backfill, the rest fills in via the background worker.
- **Deploy**: `Dockerfile` + `docker-compose.yml` are provided. Actual cloud
  deployment (Railway/Fly) needs your hosting account and a managed Postgres.

## Getting started (current state: M0)

```bash
# 1. Get a development key at https://developer.riotgames.com
# 2. Run the spike to inspect real match JSON:
RIOT_KEY=RGAPI-your-key node spike/spike.mjs "YourName#TAG" euw1
# 3. Check spike-out/*.json — confirm Arena has playerSubteamId/subteamPlacement/augments
```

Requires Node 18+. Never commit your key; use `.env` once the app scaffold exists.

## Legal

CrewStats isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and League of Legends are trademarks or registered trademarks of Riot Games, Inc.
