# Medusa backend image.
#
# Build context is the REPO ROOT, not apps/backend, because this is an npm-workspace
# monorepo: the lockfile and hoisted node_modules live at the root.
#   docker build -f apps/backend/Dockerfile .

# ---------- Stage 1: install + build ----------
FROM node:22-alpine AS builder

# node-gyp needs a toolchain for native modules (sharp, argon2, etc.)
RUN apk add --no-cache python3 make g++

WORKDIR /repo

# Copy only the manifests first so dependency installation is cached and does not
# re-run on every source change. Every workspace package.json referenced by the
# lockfile must be present for `npm ci` to resolve the workspace graph.
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/storefront/package.json apps/storefront/

# Install the backend workspace plus the root. Dev dependencies are required here:
# `medusa build` needs typescript and the SWC toolchain.
RUN npm ci --include-workspace-root --workspace @dtc/backend

COPY apps/backend apps/backend

WORKDIR /repo/apps/backend

# Produces a self-contained server bundle (including the admin dashboard) in
# .medusa/server, with its own package.json.
RUN npx medusa build

# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runtime

RUN apk add --no-cache python3 make g++

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /repo/apps/backend/.medusa/server ./

# `medusa build` copies apps/backend/package.json verbatim into the bundle, which carries
# an `overrides` block for react alongside react in BOTH dependencies (pinned) and
# devDependencies (caret). npm refuses that combination with EOVERRIDE. Neither field is
# needed at runtime — the admin dashboard was already compiled in the builder stage and
# devDependencies are omitted anyway — so drop both before installing.
RUN node -e "\
const fs = require('fs'); \
const p = './package.json'; \
const j = JSON.parse(fs.readFileSync(p, 'utf8')); \
delete j.overrides; \
delete j.devDependencies; \
fs.writeFileSync(p, JSON.stringify(j, null, 2)); \
"

# Runtime dependencies only — no typescript, no build tooling.
RUN npm install --omit=dev && npm cache clean --force

COPY apps/backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npx", "medusa", "start", "-H", "0.0.0.0"]
