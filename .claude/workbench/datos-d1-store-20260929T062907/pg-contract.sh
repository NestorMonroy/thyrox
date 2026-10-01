#!/usr/bin/env bash
# Corre la suite de contrato de @thyrox/store contra el PostgreSQL 16 local:
# levanta el clúster, crea un rol y una base de pruebas desechables y exige postgres.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
sudo pg_ctlcluster 16 main start 2>/dev/null || true
pg_isready -t 20
PASS=$(head -c 18 /dev/urandom | base64 | tr -dc 'A-Za-z0-9')
sudo -u postgres psql -v ON_ERROR_STOP=1 -q -c "DROP DATABASE IF EXISTS thyrox_store_test" -c "DROP ROLE IF EXISTS thyrox_store_test" -c "CREATE ROLE thyrox_store_test LOGIN PASSWORD '$PASS'" -c "CREATE DATABASE thyrox_store_test OWNER thyrox_store_test" < /dev/null
cd src/packages/store
THYROX_TEST_POSTGRES_URL="postgres://thyrox_store_test:$PASS@127.0.0.1:5432/thyrox_store_test" THYROX_TEST_REQUIRE_POSTGRES=1 bun test < /dev/null
