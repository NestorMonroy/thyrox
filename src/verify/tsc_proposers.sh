#!/usr/bin/env bash
# `tsc_proposers` — candidatos del lazo tsc cero en JSONL: una propuesta por
# proponente y archivo, con sus ediciones y sus objetivos. Entrada de línea de
# comandos de `tscProposers.ts`, que es TypeScript y por eso no tiene
# envoltorio propio en `bin/`.
#
# Uso:  bin/tsc_proposers [tsconfig] > candidatos.jsonl
#   Sin tsconfig mide el `tsconfig.json` de la raíz de thyrox. Carga el
#   proyecto entero: lanzarlo con `bin/thyrox-bg`, no en primer plano.
set -uo pipefail
ROOT="${THYROX_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
command -v bun >/dev/null 2>&1 || {
    echo "tsc_proposers: falta \`bun\` — no se emiten candidatos: un vacío sería un verde falso." >&2
    exit 2
}
TSCONFIG="$(realpath "${1:-$ROOT/tsconfig.json}")"
cd "$ROOT" && exec bun "$ROOT/src/verify/tscProposers.ts" "$TSCONFIG" </dev/null
