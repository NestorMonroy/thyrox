#!/usr/bin/env bash
# =============================================================================
# test-local-models-import-entry.sh — la importación de un modelo es una entrada
# declarada del plano de control (TASK-THYROX-0931)
# =============================================================================
# `local-models-import` corre en el anfitrión: reserva disco y memoria, descarga
# al scratch y valida en el laboratorio por la primitiva, así que su payload ya
# vive en ella. Sin entrada declarada, `thyrox-bg start` la rehusaba y una
# descarga de gigas quedaba en primer plano o fuera del ledger.
# Casos:
#   1. `bin/local-models-import` es una entrada declarada;
#   2. un envoltorio con ese nombre que ejecuta otro módulo no lo es.
# Control de anulación: sin su fila en control_plane_entries.tsv cae el caso 1.
# =============================================================================
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 1
ROOT="$PWD"
ok=0; failures=0
check() { if [[ "$2" == "$3" ]]; then echo "  ok    $1"; ok=$((ok+1));
        else echo "  FALLA $1 — esperado [$3] obtenido [$2]"; failures=$((failures+1)); fi; }

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP:?}"' EXIT

source "$ROOT/src/lib/managed_execution.sh"
thyrox_control_plane_entry "$ROOT/bin/local-models-import"; check "1 es entrada declarada del plano de control" "$?" "0"

mkdir -p "$TMP/bin"
printf '#!/usr/bin/env bash\nexec bun "%s/src/packages/local-models/bin/qualify.ts" "$@"\n' "$ROOT" > "$TMP/bin/local-models-import"
thyrox_control_plane_entry "$TMP/bin/local-models-import"; check "2 otro módulo con el mismo nombre no lo es" "$?" "1"

echo "$ok aprobada(s) · $failures fallida(s)"
(( failures == 0 ))
