#!/usr/bin/env bash
# Corre probe.sql en una base desechable y la retira al terminar, pase lo que pase.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
db="thyrox_pgvector_limits_$$"
sudo -u postgres createdb "$db" || exit 2
trap 'sudo -u postgres dropdb --if-exists "$db"' EXIT
sudo -u postgres psql -X -q -At -d "$db" -f "$here/probe.sql" 2>&1 | grep '|' > "$here/results.tsv"
cat "$here/results.tsv"
