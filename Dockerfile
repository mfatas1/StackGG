# Shared multi-stage build for both the web and worker images.
# Build target is selected with --target web|worker (see docker-compose.yml).
FROM node:22-slim AS base
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY packages/stats/package.json packages/stats/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
RUN npm install --no-audit --no-fund
COPY . .

# ---- Web (Next.js) ----
FROM base AS web-build
RUN npm run build --workspace apps/web

FROM node:22-slim AS web
WORKDIR /app
ENV NODE_ENV=production
COPY --from=web-build /app ./
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "apps/web"]

# ---- Worker (long-running ingestion) ----
FROM base AS worker
ENV NODE_ENV=production
CMD ["npm", "run", "start", "--workspace", "apps/worker"]
