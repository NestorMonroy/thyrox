#!/usr/bin/env bash
# `tsc_fix_census` — censo de code fixes por diagnóstico, clasificados según el
# plan tsc cero. Entrada de línea de comandos de `tscFixCensus.ts`, que es
# TypeScript y por eso no tiene envoltorio propio en `bin/`.
#
# Uso:  bin/tsc_fix_census [tsconfig] [--json]
#   Sin tsconfig mide el `tsconfig.json` de la raíz de thyrox. Carga el
#   proyecto entero: lanzarlo con `bin/thyrox-bg`, no en primer plano.
set -uo pipefail
ROOT="${THYROX_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
command -v bun >/dev/null 2>&1 || {
    echo "tsc_fix_census: falta \`bun\` — no se emite censo: un 0 sería un verde falso." >&2
    exit 2
}
TSCONFIG="$ROOT/tsconfig.json"
ARGS=()
for arg in "$@"; do
    case "$arg" in
        --json) ARGS+=("$arg") ;;
        *) TSCONFIG="$arg" ;;
    esac
done
cd "$ROOT" && exec bun "$ROOT/src/verify/tscFixCensus.ts" "$TSCONFIG" "${ARGS[@]}" </dev/null
