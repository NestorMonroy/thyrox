#!/bin/sh
# Verify de un ítem del lote: cada archivo de evidencia existe y no está vacío,
# y cada registro de contención (`*containment.jsonl`) tiene todas sus filas en
# passed=true. POSIX sh más python3 para leer JSON: corre en la unidad por
# defecto, y la ruta gestionada es la que lo invoca.
# Uso: verify_evidence.sh <archivo>...
set -eu
[ $# -gt 0 ] || { echo "verify_evidence: sin archivos" >&2; exit 2; }
for file in "$@"; do
  [ -s "$file" ] || { echo "verify_evidence: falta $file" >&2; exit 1; }
  case "$file" in
    *containment.jsonl)
      python3 -c 'import json,sys; rows=[json.loads(l) for l in open(sys.argv[1]) if l.strip()]; sys.exit(0 if rows and all(r.get("passed") for r in rows) else 1)' "$file" \
        || { echo "verify_evidence: contención no PASS en $file" >&2; exit 1; } ;;
  esac
done
