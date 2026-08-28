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

# The built image ships compiled .js; the .ts fallback is for a native (non-Docker)
# run where the sources are present.
run_seed() {
  name=$1
  if [ -f "./src/scripts/$name.js" ]; then
    npx medusa exec "./src/scripts/$name.js"
  elif [ -f "./src/scripts/$name.ts" ]; then
    npx medusa exec "./src/scripts/$name.ts"
  else
    log "WARNING: $name not found in the image, skipping."
  fi
}

if [ "$PRODUCT_COUNT" = "0" ]; then
  # Two scripts, in this order, and BOTH are required for a usable store.
  #
  # seed-kudl-pets builds the India infrastructure only — currency, region, tax
  # region, stock location, fulfilment and shipping options. It creates no
  # products at all; its own closing log line says to run the catalog next.
  log "Catalogue is empty - seeding KUDL India infrastructure..."
  run_seed seed-kudl-pets

  # seed-kudl-catalog is what actually fills the shop: the category tree and the
  # products. Without it a fresh install comes up with a working checkout and an
  # empty storefront, which reads as a broken deployment.
  log "Seeding KUDL catalogue (categories + products)..."
  run_seed seed-kudl-catalog
else
  log "Catalogue already has $PRODUCT_COUNT products - skipping product seed."
fi

# Seeding is guarded on the product count rather than run unconditionally, and that
# guard is the point: a seed that runs on every boot cannot tell "never existed"
# from "deliberately deleted", so a product removed in Medusa Admin would come
# straight back on the next deploy. Guarded this way, deletions stick — and an
# existing store is never touched.
#
# To re-run the catalogue by hand on a store that already has products:
#   docker compose exec backend npx medusa exec ./src/scripts/seed-kudl-catalog.js

# ---- 4. Shared admin user ------------------------------------------------------
# Every environment gets the same login, so the whole team signs in identically.
# Fails harmlessly once the user already exists.
if [ -n "$MEDUSA_ADMIN_EMAIL" ] && [ -n "$MEDUSA_ADMIN_PASSWORD" ]; then
  log "Ensuring admin user $MEDUSA_ADMIN_EMAIL exists..."
  # `medusa user` only CREATES. It errors on an existing email and never updates the
  # password, so changing MEDUSA_ADMIN_PASSWORD after first boot has no effect on the
  # stored credential — the old password keeps working and the new one does not.
  #
  # The output is kept (not sent to /dev/null) and the two outcomes are told apart, so
  # a genuine failure is not reported as the reassuring "already exists".
  user_output=$(npx medusa user -e "$MEDUSA_ADMIN_EMAIL" -p "$MEDUSA_ADMIN_PASSWORD" 2>&1) || true
  if echo "$user_output" | grep -qi "created successfully"; then
    log "Admin user created."
  elif echo "$user_output" | grep -qiE "already exist|duplicate|unique"; then
    log "Admin user already exists - password NOT changed."
    log "  To change it: delete the user, then redeploy. See apps/backend/.env.template."
  else
    log "WARNING: could not ensure the admin user. Output was:"
    echo "$user_output" | tail -5
  fi
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
