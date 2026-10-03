#!/usr/bin/env bash
# Cross-app E2E: Postgres (migrations 0001-0005) + PostgREST + mock Auth (email OTP code 123456)
# + customer pass on :8081 + merchant terminal on :8080 (path to its repo in MERCHANT_DIR).
# The customer's rendered QR is decoded with OpenCV and played to the merchant's fake camera.
# Needs: psql to a local Postgres, ./postgrest (v14+), python3 + playwright + opencv-python.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/.."
MERCHANT_DIR="${MERCHANT_DIR:?set MERCHANT_DIR to the merchant-countertop-scanner checkout}"
PSQL="${E2E_PSQL:-psql -d e2e}"; DB_ADMIN="${E2E_DB_ADMIN:-psql -d postgres}"

$DB_ADMIN -qc "drop database if exists e2e" -c "create database e2e"
for f in "$HERE/stub_e2e.sql" "$ROOT"/supabase/migrations/*.sql "$HERE/seed_e2e.sql"; do $PSQL -q -v ON_ERROR_STOP=1 -f "$f"; done

KEY=sb_publishable_e2etestkey
VITE_SUPABASE_URL=http://localhost:8081 VITE_SUPABASE_PUBLISHABLE_KEY=$KEY npx --prefix "$ROOT" vite build "$ROOT" --outDir "$HERE/cdist" --emptyOutDir >/dev/null
VITE_SUPABASE_URL=http://localhost:8080 VITE_SUPABASE_PUBLISHABLE_KEY=$KEY VITE_CUSTOMER_APP_URL=http://localhost:8081 \
  npx --prefix "$MERCHANT_DIR" vite build "$MERCHANT_DIR" --outDir "$HERE/mdist" --emptyOutDir >/dev/null

"$HERE/postgrest" "$HERE/postgrest.conf" > "$HERE/pgrst.log" 2>&1 & PG=$!
node "$HERE/gateway.mjs" "$HERE/mdist" 8080 > "$HERE/gw8080.log" 2>&1 & G1=$!
node "$HERE/gateway.mjs" "$HERE/cdist" 8081 > "$HERE/gw8081.log" 2>&1 & G2=$!
trap 'kill $PG $G1 $G2 2>/dev/null || true' EXIT
sleep 3
E2E_PSQL="$PSQL" python3 "$HERE/customer_e2e.py"
