# Deploying StackGG to Railway

StackGG is three pieces: **Postgres**, the **web** app (Next.js), and a long-running
**worker** (pg-boss ingestion). The worker is why we use Railway rather than a
serverless-only host — it can't go on Vercel. All three live in one Railway project.

Build inputs are already in the repo:

- `Dockerfile.web` — the Next.js web image (honors Railway's `$PORT`).
- `Dockerfile.worker` — the ingestion worker (runs via `tsx`).
- `.env.production.example` — every variable each service needs.

## 1. Create the project

1. Railway → **New Project → Deploy from GitHub repo** → pick `mfatas1/StackGG`.
2. When it imports, you'll configure services below. Railway auto-redeploys on every push to `main`.

## 2. Add Postgres

- **New → Database → Add PostgreSQL.** Railway exposes its connection string as
  `${{ Postgres.DATABASE_URL }}` — reference that from the other services (don't paste a literal).

## 3. Web service

- Source: this repo. **Settings → Build → Dockerfile Path = `Dockerfile.web`**.
- **Settings → Networking → Generate Domain** (and later add the custom domain `stackgg.app`).
- **Variables** (see `.env.production.example`):
  - `DATABASE_URL = ${{ Postgres.DATABASE_URL }}`
  - `AUTH_SECRET` = a fresh `openssl rand -hex 32` (NOT the dev value)
  - `NEXT_PUBLIC_BASE_URL = https://stackgg.app` — set this **before the first build**; it's
    inlined into the client bundle at build time and also flips session cookies to `Secure`.
  - `RIOT_KEY`, `DEFAULT_PLATFORM=euw1`
  - `MAGIC_LINK_TRANSPORT=resend`, `RESEND_API_KEY`, `MAGIC_LINK_FROM=StackGG <no-reply@stackgg.app>`

## 4. Worker service

- **New → GitHub Repo → same repo.** **Dockerfile Path = `Dockerfile.worker`**. No domain (background service).
- **Variables:** `DATABASE_URL = ${{ Postgres.DATABASE_URL }}`, `RIOT_KEY`, `DEFAULT_PLATFORM=euw1`.

## 5. Run migrations

Migrations are not run automatically. Once Postgres is up, run once:

```bash
railway run --service web npm run db:migrate
```

(or set it as the web service's **Pre-Deploy Command**: `npm run db:migrate`).
Then kick off ingestion from the app (refresh your stack) so the live DB has data.

## 6. DNS

Point `stackgg.app` at the web service: copy Railway's CNAME target into your DNS provider,
then add `stackgg.app` under the web service's custom domains.

## 7. Production Riot key

With the site live at `https://stackgg.app` (carrying the "not endorsed by Riot" disclaimer),
apply for a production key at https://developer.riotgames.com. It removes the 24h dev-key expiry.
Note: it does **not** raise rate limits (still 20/s, 100/2min) unless Riot separately approves.

## Local parity

`docker compose up --build` runs the same three images locally (web on :3100).
