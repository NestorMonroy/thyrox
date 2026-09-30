#!/usr/bin/env bash
# Sonda de límites de pgvector 0.6.0 por dimensionalidad: si el tipo acepta el
# valor, si HNSW e IVFFlat aceptan el índice, y cuántos bytes ocupa un vector.
# Cada ítem usa su propio esquema desechable y lo retira al salir.
set -uo pipefail
dim="$1"
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
url="$(gawk -F= '$1=="THYROX_TEST_POSTGRES_URL"{sub(/^[^=]*=/,""); print}' "$root/.env")"
[[ -n "$url" ]] || { printf '%s\tERROR\tsin THYROX_TEST_POSTGRES_URL\n' "$dim"; exit 2; }
schema="env060_d${dim}"
q() { psql "$url" -X -q -t -A -v ON_ERROR_STOP=1 -c "$1" 2>&1 | tr '\n' ' '; }
q "DROP SCHEMA IF EXISTS $schema CASCADE; CREATE SCHEMA $schema; CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null
tbl="$schema.v"
q "CREATE TABLE $tbl (id int, e vector($dim));" >/dev/null
ins=$(q "INSERT INTO $tbl SELECT g, (SELECT array_agg(random())::vector($dim) FROM generate_series(1,$dim) WHERE g>0) FROM generate_series(1,200) g;")
bytes=$(q "SELECT pg_column_size(e) FROM $tbl LIMIT 1;")
hnsw=$(q "CREATE INDEX ON $tbl USING hnsw (e vector_cosine_ops);")
ivf=$(q "CREATE INDEX ON $tbl USING ivfflat (e vector_cosine_ops) WITH (lists = 10);")
printf '%s\tinsert=%s\tbytes=%s\thnsw=%s\tivfflat=%s\n' "$dim" "${ins:-ok}" "$bytes" "${hnsw:-ok}" "${ivf:-ok}"
q "DROP SCHEMA $schema CASCADE;" >/dev/null
