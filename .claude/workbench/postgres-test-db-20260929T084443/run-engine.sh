#!/usr/bin/env bash
# Corre la suite de @thyrox/store contra un motor: sqlite o postgres.
# En postgres la URL sale del .env (ignorado) y nunca va a la línea de órdenes;
# THYROX_TEST_REQUIRE_POSTGRES=1 convierte un «no medido» en fallo.
set -euo pipefail
engine="$1"
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
out="$(cd "$(dirname "$0")" && pwd)/engine-$engine.log"
cd "$root/src/packages/store"
case "$engine" in
  sqlite)   THYROX_TEST_POSTGRES_URL='' bun test > "$out" 2>&1 ;;
  postgres) THYROX_TEST_POSTGRES_URL="$(sed -n 's/^THYROX_TEST_POSTGRES_URL=//p' "$root/.env" | tail -n 1)" \
            THYROX_TEST_REQUIRE_POSTGRES=1 bun test > "$out" 2>&1 ;;
  *) echo "motor desconocido: $engine" >&2; exit 2 ;;
esac
