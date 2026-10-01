#!/usr/bin/env bash
# test-toolchain-consumer-env.sh — `toolchain.sh` lee sus claves del `.env` que
# gobierna, no sólo del proceso (H-THYROX-178).
#
# Las ~40 lecturas `${THYROX_TOOLCHAIN_*:-…}` / `${THYROX_INSTALL_*:-}` sólo
# veían el entorno del proceso: un consumidor que declaraba
# `THYROX_INSTALL_TEXLIVE=1` en su `.env` no era oído, y el adaptador de
# `ai-course-notes` tuvo que exportar esas claves a mano.
#
# Qué haría fallar a estos casos:
#   1. no cargar el `.env` del consumidor (cae el 1);
#   2. pisar lo que el proceso fija (cae el 2);
#   3. pisar una clave fijada VACÍA, que es como una prueba pide el default
#      (cae el 3);
#   4. cargar claves de otro prefijo (cae el 4);
#   5. inventar la clave fuera de un clon y con el `.env` sellado (cae el 5).
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

KEY=THYROX_TOOLCHAIN_H178_PROBE
OTHER=THYROX_H178_UNRELATED
BASE="$(mktemp -d "${TMPDIR:-/tmp}/toolchain-consumidor-XXXXXX")"
trap 'rm -rf "$BASE"' EXIT
CLONE="$BASE/ai-course-notes"
mkdir -p "$CLONE/tools" "$BASE/fuera"
git init -q "$CLONE"
printf '%s=del-consumidor\n%s=otro-prefijo\n' "$KEY" "$OTHER" > "$CLONE/.env"

# probe <dir> [VAR=valor…] — sourcea el sujeto desde <dir> y dice qué ve.
probe() {
  local dir="$1"; shift
  (cd "$dir" && env -u "$KEY" -u "$OTHER" -u THYROX_ENV_FILE "$@" bash -c \
    'source "$0" 2>/dev/null; printf "%s|%s" "${'"$KEY"'-<unset>}" "${'"$OTHER"'-<unset>}"' \
    "$SUBJECT")
}

got="$(probe "$CLONE/tools")"
[[ "${got%%|*}" == del-consumidor ]] && ok "1. el .env del consumidor llega" \
  || bad "1. esperaba del-consumidor, vi ${got%%|*}"

got="$(probe "$CLONE" "$KEY=del-proceso")"
[[ "${got%%|*}" == del-proceso ]] && ok "2. el proceso gana" \
  || bad "2. esperaba del-proceso, vi ${got%%|*}"

got="$(probe "$CLONE" "$KEY=")"
[[ "${got%%|*}" == "" ]] && ok "3. una clave fijada vacía se respeta" \
  || bad "3. esperaba vacía, vi ${got%%|*}"

got="$(probe "$CLONE")"
[[ "${got#*|}" == "<unset>" ]] && ok "4. otro prefijo no se carga" \
  || bad "4. esperaba <unset>, vi ${got#*|}"

got="$(probe "$BASE/fuera" THYROX_ENV_FILE=/dev/null)"
[[ "${got%%|*}" == "<unset>" ]] && ok "5. fuera de un clon y sellado, no hay clave" \
  || bad "5. esperaba <unset>, vi ${got%%|*}"

thyrox_summary
