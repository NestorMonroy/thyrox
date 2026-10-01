#!/usr/bin/env bash
# Comprueba pgvector 0.8.6 en la base de pruebas: índice HNSW sobre vector y halfvec
# por dimensionalidad, y el parámetro iterative_scan. Esquema desechable por ítem.
set -uo pipefail
kind="$1"; dim="$2"
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
url="$(gawk -F= '$1=="THYROX_TEST_POSTGRES_URL"{sub(/^[^=]*=/,""); print}' "$root/.env")"
schema="env086_${kind}_${dim}"
q() { psql "$url" -X -q -t -A -c "$1" 2>&1 | tr '\n' ' '; }
q "DROP SCHEMA IF EXISTS $schema CASCADE; CREATE SCHEMA $schema;" >/dev/null
q "CREATE TABLE $schema.v (id int, e $kind($dim));" >/dev/null
q "INSERT INTO $schema.v SELECT g, (SELECT array_agg(random()) FROM generate_series(1,$dim) WHERE g>0)::vector($dim)::$kind($dim) FROM generate_series(1,50) g;" >/dev/null
ops=$([[ $kind == halfvec ]] && echo halfvec_cosine_ops || echo vector_cosine_ops)
hnsw=$(q "CREATE INDEX ON $schema.v USING hnsw (e $ops);")
bytes=$(q "SELECT pg_column_size(e) FROM $schema.v LIMIT 1;")
printf '%s\t%s\tbytes=%s\thnsw=%s\n' "$kind" "$dim" "$bytes" "${hnsw:-ok}"
q "DROP SCHEMA $schema CASCADE;" >/dev/null
