#!/usr/bin/env bash
# Corre una orden DENTRO de una unidad de la primitiva con la URL del store
# semántico como secreto montado; la exporta sólo al entorno del proceso, nunca
# a argv ni a un log. Uso: in_unit.sh <orden...>
set -uo pipefail
cd /home/user/thyrox
exec bash bin/podman-execution-execute run --task TASK-THYROX-0758 --kind probe --network host \
  --secret-from-env THYROX_SEMANTIC_SEARCH_DATABASE_URL -- bash -c '
    export THYROX_SEMANTIC_SEARCH_DATABASE_URL="$(cat /run/secrets/THYROX_SEMANTIC_SEARCH_DATABASE_URL)"
    source src/lib/toolchain.sh && thyrox_toolchain_require_bun >/dev/null
    export PATH="$(dirname "${THYROX_TOOLCHAIN_BUN_BIN:-$(command -v bun)}"):$PATH"
    exec "$@"' unit "$@"
