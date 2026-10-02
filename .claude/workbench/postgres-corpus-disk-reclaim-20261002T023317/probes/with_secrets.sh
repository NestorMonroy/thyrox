#!/usr/bin/env bash
# Dentro de una unidad: exporta al entorno del proceso los secretos montados
# por la primitiva (/run/secrets/<NOMBRE>) y pone bun en el PATH. Nunca los
# escribe en argv ni en un log. Uso: with_secrets.sh NOMBRE... -- orden...
set -euo pipefail
while (( $# > 0 )) && [[ "$1" != "--" ]]; do
  [[ -r "/run/secrets/$1" ]] || { echo "with_secrets: $1 absent" >&2; exit 2; }
  export "$1=$(cat "/run/secrets/$1")"
  shift
done
shift
source src/lib/toolchain.sh && thyrox_toolchain_require_bun >/dev/null
PATH="$(dirname "${THYROX_TOOLCHAIN_BUN_BIN:-$(command -v bun)}"):$PATH"
export PATH
exec "$@"
