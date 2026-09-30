#!/usr/bin/env bash
# Sonda de solo lectura para las entradas medibles de D2b; no instala ni decide nada.
# Uso: probe.sh <nombre>. Cada sonda imprime líneas «clave<TAB>valor».
set -uo pipefail
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
test_url() { gawk -F= '$1=="THYROX_TEST_POSTGRES_URL"{sub(/^[^=]*=/,""); print}' "$root/.env"; }
case "$1" in
  apt-candidates)
    apt-cache madison postgresql-16-pgvector 2>&1 | gawk '{printf "apt\t%s %s\n", $3, $5}' ;;
  build-prerequisites)
    for t in gcc make pg_config; do printf 'tool\t%s %s\n' "$t" "$(command -v "$t" || echo absent)"; done
    printf 'pgxs\t%s\n' "$(pg_config --pgxs 2>/dev/null || echo absent)"
    printf 'server_headers\t%s\n' "$(test -f "$(pg_config --includedir-server)/postgres.h" && echo present || echo absent)" ;;
  upstream-tags)
    git ls-remote --tags https://github.com/pgvector/pgvector 2>&1 \
      | gawk -F/ '/refs\/tags\/v[0-9]/ && !/\^\{\}/{print "tag\t" $3}' | sort -V | tail -5 ;;
  pgdg-repo)
    printf 'pgdg_http\t%s\n' "$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 https://apt.postgresql.org/pub/repos/apt/dists/ 2>&1)" ;;
  installed-capabilities)
    psql "$(test_url)" -X -tA -F $'\t' -c "SELECT 'type', typname FROM pg_type WHERE typname IN ('vector','halfvec','sparsevec','bit') ORDER BY 2" \
      -c "SELECT 'index_opclass', am.amname || ':' || oc.opcname FROM pg_opclass oc JOIN pg_am am ON am.oid = oc.opcmethod WHERE oc.opcname LIKE '%vector%' ORDER BY 2" \
      -c "SELECT 'hnsw_setting', name FROM pg_settings WHERE name LIKE 'hnsw.%' OR name LIKE 'ivfflat.%' ORDER BY 2" 2>&1 \
      | sed 's#postgres://[^ ]*#<url>#g' ;;
  *) echo "sonda desconocida: $1" >&2; exit 2 ;;
esac
