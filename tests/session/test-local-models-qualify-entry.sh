#!/usr/bin/env bash
# =============================================================================
# test-local-models-qualify-entry.sh — la cualificación es una entrada
# declarada del plano de control (TASK-THYROX-0931)
# =============================================================================
# `local-models-qualify` corre en el anfitrión: pide admisión al coordinador y
# mide sólo contra la unidad del ticket, así que su payload ya vive en la
# primitiva. Sin entrada declarada, `thyrox-bg start` la rehusaba y la medición
# —minutos en CPU— quedaba en primer plano o fuera del ledger.
# Casos:
#   1. `bin/local-models-qualify` es una entrada declarada;
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
thyrox_control_plane_entry "$ROOT/bin/local-models-qualify"; check "1 es entrada declarada del plano de control" "$?" "0"

mkdir -p "$TMP/bin"
printf '#!/usr/bin/env bash\nexec bun "%s/src/packages/local-models/bin/catalog.ts" "$@"\n' "$ROOT" > "$TMP/bin/local-models-qualify"
thyrox_control_plane_entry "$TMP/bin/local-models-qualify"; check "2 otro módulo con el mismo nombre no lo es" "$?" "1"

echo "$ok aprobada(s) · $failures fallida(s)"
(( failures == 0 ))
