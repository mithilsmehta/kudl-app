#!/bin/sh
# Prepares the database, then hands off to the container CMD (medusa start).
#
# Safe to run on every boot: each step is idempotent, so restarting the container
# never duplicates data or fails on an already-provisioned database.
set -e

log() { echo "[entrypoint] $*"; }

if [ -z "$DATABASE_URL" ]; then
  log "ERROR: DATABASE_URL is not set."
  exit 1
fi

# ---- 1. Wait for Postgres ------------------------------------------------------
log "Waiting for Postgres..."
i=0
until node -e "
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(() => c.end()).then(() => process.exit(0)).catch(() => process.exit(1));
" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    log "ERROR: Postgres was not reachable after 60 attempts."
    exit 1
  fi
  sleep 2
done
log "Postgres is up."

# ---- 2. Migrations -------------------------------------------------------------
# Creates the schema and, on a fresh database, the Default Sales Channel and the
# Default Publishable API Key. Re-running is a no-op.
log "Running migrations..."
npx medusa db:migrate

# ---- 3. Seed the catalogue (only when the catalogue is empty) -------------------
# The seed creates 11 products, so guard on product count to keep restarts clean.
PRODUCT_COUNT=$(node -e "
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect()
  .then(() => c.query('select count(*)::int as n from product'))
  .then((r) => { console.log(r.rows[0].n); return c.end(); })
  .catch(() => { console.log('-1'); process.exit(0); });
" 2>/dev/null || echo "-1")

if [ "$PRODUCT_COUNT" = "0" ]; then
  log "Catalogue is empty - seeding KUDL pets data..."
  if [ -f ./src/scripts/seed-kudl-pets.js ]; then
    npx medusa exec ./src/scripts/seed-kudl-pets.js
  elif [ -f ./src/scripts/seed-kudl-pets.ts ]; then
    npx medusa exec ./src/scripts/seed-kudl-pets.ts
  else
    log "WARNING: seed script not found in the image, skipping."
  fi
else
  log "Catalogue already has $PRODUCT_COUNT products - skipping seed."
fi

# ---- 4. Shared admin user ------------------------------------------------------
# Every environment gets the same login, so the whole team signs in identically.
# Fails harmlessly once the user already exists.
if [ -n "$MEDUSA_ADMIN_EMAIL" ] && [ -n "$MEDUSA_ADMIN_PASSWORD" ]; then
  log "Ensuring admin user $MEDUSA_ADMIN_EMAIL exists..."
  npx medusa user -e "$MEDUSA_ADMIN_EMAIL" -p "$MEDUSA_ADMIN_PASSWORD" 2>/dev/null \
    && log "Admin user created." \
    || log "Admin user already exists - skipping."
else
  log "MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD not set - no admin user created."
fi

# ---- 5. Report the publishable key --------------------------------------------
# The mobile app needs this. Printing it on boot saves digging through the dashboard.
node -e "
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect()
  .then(() => c.query(\"select token from api_key where type='publishable' limit 1\"))
  .then((r) => {
    if (r.rows[0]) {
      console.log('[entrypoint] Publishable API key: ' + r.rows[0].token);
      console.log('[entrypoint] Put this in apps/mobile/.env as EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY');
    }
    return c.end();
  })
  .catch(() => process.exit(0));
" 2>/dev/null || true

log "Starting Medusa..."
exec "$@"
