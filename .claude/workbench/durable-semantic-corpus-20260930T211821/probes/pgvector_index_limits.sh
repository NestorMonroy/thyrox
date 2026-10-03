#!/usr/bin/env bash
# Mide contra el pgvector instalado qué dimensiones admite un índice HNSW por
# tipo, y si el índice de expresión sobre binary_quantize amplía el techo del
# vector original. La URL se lee del .env (no versionado) y no se imprime.
# Métrica: CREATE INDEX aceptado o rechazado, con el mensaje del servidor.
# Ciega a: calidad de la recuperación y coste de construir el índice.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
url="$(grep '^THYROX_TEST_POSTGRES_URL=' .env | cut -d= -f2-)"
test -n "$url" || { echo "sin THYROX_TEST_POSTGRES_URL: no se mide" >&2; exit 2; }
schema="pgv_limits_$$"
q() { psql "$url" -X -q -v ON_ERROR_STOP=1 -c "SET search_path=$schema,public; $1" 2>&1 | tr '\n' ' '; }
psql "$url" -X -q -c "CREATE SCHEMA $schema" >/dev/null
psql "$url" -X -tAc "SELECT 'pgvector ' || extversion FROM pg_extension WHERE extname='vector'"
case_index() {  # <etiqueta> <tipo de columna> <expresión indexada> <opclass>
  local out
  out=$(q "CREATE TABLE t (e $2); CREATE INDEX ON t USING hnsw (($3) $4); DROP TABLE t;")
  test -z "$out" && printf '%s\taceptado\n' "$1" || { printf '%s\trechazado\t%s\n' "$1" "$out"; q "DROP TABLE IF EXISTS t" >/dev/null; }
}
case_index "vector(2000) hnsw"            "vector(2000)"  "e" vector_cosine_ops
case_index "vector(2001) hnsw"            "vector(2001)"  "e" vector_cosine_ops
case_index "halfvec(4000) hnsw"           "halfvec(4000)" "e" halfvec_cosine_ops
case_index "halfvec(4001) hnsw"           "halfvec(4001)" "e" halfvec_cosine_ops
case_index "bit(64000) hnsw"              "bit(64000)"    "e" bit_hamming_ops
case_index "bit(64001) hnsw"              "bit(64001)"    "e" bit_hamming_ops
case_index "vector(3072) via binary_quantize" "vector(3072)" "binary_quantize(e)::bit(3072)" bit_hamming_ops
case_index "vector(16000) via binary_quantize" "vector(16000)" "binary_quantize(e)::bit(16000)" bit_hamming_ops
case_index "halfvec(16000) via binary_quantize" "halfvec(16000)" "binary_quantize(e)::bit(16000)" bit_hamming_ops
printf 'vector(16001) columna\t%s\n' "$(q "CREATE TABLE t (e vector(16001))" || true)"
psql "$url" -X -q -c "DROP SCHEMA $schema CASCADE" >/dev/null
