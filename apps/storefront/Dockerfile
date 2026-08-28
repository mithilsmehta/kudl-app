# Next.js storefront image.
#
# Build context is the REPO ROOT, not apps/storefront, because this is an npm-workspace
# monorepo: the lockfile and hoisted node_modules live at the root.
#   docker build -f apps/storefront/Dockerfile .

# ---------- Stage 1: install + build ----------
FROM node:22-alpine AS builder

WORKDIR /repo

# Manifests first, so dependency installation is cached and does not re-run on every
# source change. Every workspace package.json referenced by the lockfile must be
# present for `npm ci` to resolve the workspace graph.
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/storefront/package.json apps/storefront/

RUN npm ci --include-workspace-root --workspace @dtc/storefront

COPY apps/storefront apps/storefront

# NEXT_PUBLIC_* values are INLINED INTO THE CLIENT BUNDLE AT BUILD TIME. They are not
# read from the environment when the container starts, so they have to arrive here as
# build args — setting them only in docker-compose's `environment:` would leave the
# browser calling http://localhost:9000 with no publishable key, and every product
# request would fail with a 401.
#
# This is also why changing either value needs a rebuild, not just a restart.
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID
ARG MEDUSA_IMAGE_HOSTNAME

# Also a build arg, despite not being NEXT_PUBLIC_, and this one is easy to get
# wrong: Next evaluates `rewrites()` at BUILD time and bakes the resulting
# destination into the routes manifest. It is NOT re-read when the container
# starts. Supply it only as a runtime environment variable and the proxy is baked
# as the public URL — inside the container that resolves to the container itself,
# and every /api/medusa request dies with ECONNREFUSED while the pages still
# render, which looks like the backend is down.
#
# lib/api.ts reads the same variable at runtime for server-side fetches, so
# docker-compose.yml passes it BOTH as a build arg and as an environment variable.
ARG MEDUSA_BACKEND_INTERNAL_URL

ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL \
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY \
    NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID \
    MEDUSA_IMAGE_HOSTNAME=$MEDUSA_IMAGE_HOSTNAME \
    MEDUSA_BACKEND_INTERNAL_URL=$MEDUSA_BACKEND_INTERNAL_URL \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /repo/apps/storefront

# `output: "standalone"` in next.config.js makes this emit .next/standalone — the
# server plus only the node_modules it actually imports.
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

# Run as a non-root user. The image serves the public internet and never writes to
# its own filesystem, so there is no reason for it to have root.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# The standalone output mirrors the monorepo layout, so the server ends up at
# apps/storefront/server.js with node_modules hoisted alongside it. Copying the
# directory contents (note the trailing /.) preserves that shape.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/storefront/.next/standalone/./ ./

# Static assets are deliberately NOT included in the standalone bundle; Next expects
# them to be placed back alongside it. Miss these two and the site renders as
# unstyled HTML with every image broken.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/storefront/public ./apps/storefront/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/storefront/server.js"]
