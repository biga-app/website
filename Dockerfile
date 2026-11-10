# syntax=docker/dockerfile:1

# The site and viewer as a self-contained Node server (Next's standalone
# output). Sessions live in the Go server; put a reverse proxy in front of
# both that sends /api/sessions/* to it (see github.com/biga-app/docker).
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN npm install --global corepack@latest && corepack enable
WORKDIR /repo

# Dependencies: fetched from the lockfile alone, so this layer is reused
# until the lockfile changes.
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN corepack install
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile --filter "web..."

# NEXT_PUBLIC_ values are compiled into the client bundle.
ARG NEXT_PUBLIC_SITE_URL=http://localhost
ARG NEXT_PUBLIC_BIGA_API_URL=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_BIGA_API_URL=$NEXT_PUBLIC_BIGA_API_URL \
    NEXT_OUTPUT=standalone
RUN pnpm turbo run build --filter=web

FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/robots.txt || exit 1
CMD ["node", "apps/web/server.js"]
