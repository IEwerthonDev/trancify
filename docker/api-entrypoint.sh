#!/bin/sh
set -eu

echo "[api] Waiting for PostgreSQL..."
i=0
until pnpm --filter @workspace/db exec node --input-type=module -e "
import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.end();
" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "[api] Database not ready after 60s" >&2
    exit 1
  fi
  sleep 1
done

echo "[api] Applying database schema..."
pnpm --filter @workspace/db run push-force

echo "[api] Seeding demo data (idempotent)..."
pnpm --filter @workspace/scripts run seed || true

echo "[api] Starting server on port ${PORT}..."
exec node --enable-source-maps ./artifacts/api-server/dist/index.mjs
