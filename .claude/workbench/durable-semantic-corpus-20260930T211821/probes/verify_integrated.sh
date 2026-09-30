#!/usr/bin/env bash
# Verificación en el árbol principal de lo integrado de 0682: la suite del
# paquete contra PostgreSQL real (URL del .env, no versionado) y su typecheck,
# cada una con su propio código de salida.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
THYROX_TEST_POSTGRES_URL="$(grep '^THYROX_TEST_POSTGRES_URL=' .env | cut -d= -f2-)"
test -n "$THYROX_TEST_POSTGRES_URL" || { echo "sin THYROX_TEST_POSTGRES_URL: no se mide" >&2; exit 2; }
export THYROX_TEST_POSTGRES_URL
OUT=$(dirname "$0")/../outputs/verify-integrated; mkdir -p "$OUT"; rc=0
(cd src/packages/semantic-search && bun test) > "$OUT/semantic-search.log" 2>&1; s=$?
printf 'semantic-search\texit=%s\t%s\n' "$s" "$(grep -E '^ *[0-9]+ (pass|fail)' "$OUT/semantic-search.log" | tr '\n' ' ')"; test "$s" = 0 || rc=1
bash bin/check_package_typecheck --strict semantic-search > "$OUT/typecheck.log" 2>&1; s=$?
printf 'typecheck\texit=%s\n' "$s"; test "$s" = 0 || rc=1
exit "$rc"
