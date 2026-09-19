#!/bin/bash
# =============================================================================
# test-write-env-repairs-moved-clone.sh
# =============================================================================
#
# Origen: hallazgo de un bot de revisión sobre el PR #7 (`chatgpt-codex-connector`,
# P1 en `.env:3`). `.env` se versiona desde 2026-09-10 con
# THYROX_ROOT=/home/user/thyrox committeado (directiva del ejecutor,
# ver `.env.example`). El costo declarado ahí es que un clon en otra ruta
# hereda ese valor equivocado, y la recuperación documentada es
# `write-env.sh --force`.
#
# El bot afirmó que esa recuperación NO repara el clon: `--force` vuelve a
# preguntarle a `thyrox_root()`, que por PRECEDENCIA (proceso, .env, ascenso —
# `.env.example`, `reach.py::thyrox_root`) lee el `.env` YA PRESENTE — el mismo
# que se quiere corregir — antes de intentar el ascenso. `--force` termina
# escribiendo sobre la raíz VIEJA, no sobre el clon actual.
#
# Verificado antes de escribir este test (no se asumió el claim del bot):
# `write-env.sh` deriva `_thyrox_root` por ascenso PURO al arrancar (para
# poder ubicar `reach.sh` sin depender de `.env`) y luego lo TIRA — vuelve a
# preguntar `ROOT="$(thyrox_root)"`, que sí consulta el `.env` ya presente.
# Ese segundo paso es el defecto: reintroduce la misma lectura que el primero
# evitó a propósito.
#
# El control que hace real la prueba: sin el fix, `--force` calcula
# `DEST="$ROOT_VIEJO/.env"` — un directorio que NO EXISTE en este árbol
# sintético — y la redirección de escritura falla. Con el fix, `ROOT` es el
# `_thyrox_root` ya derivado por ascenso, y el `.env` aterriza en el clon real.
#
# Uso:  bash tests/session/test-write-env-repairs-moved-clone.sh

set -uo pipefail

# Arranque — DOS entradas, ambas de entorno (DEC-04).
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" && -n "${THYROX_ENV_FILE:-}" && -f "${THYROX_ENV_FILE}" ]]; then
    _thyrox_root="$(sed -n 's/^[[:space:]]*THYROX_ROOT[[:space:]]*=[[:space:]]*//p' \
        "$THYROX_ENV_FILE" | tail -1 | tr -d '"'"'"'')"
fi
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/${THYROX_LOCATOR:-src/paths/reach.py}" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
source "$_thyrox_root/${THYROX_LIB_REACH:-src/lib/reach.sh}"
RAIZ="$(thyrox_root)" || exit 2

PASS=0; FAIL=0
check() {
  if [[ "$2" == "$3" ]]; then
    PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"
  else
    FAIL=$((FAIL + 1)); printf '  FALLA %s\n       esperado: %s\n       obtenido: %s\n' "$1" "$3" "$2"
  fi
}

# --- Fixture: un clon sintético mínimo, desplazado de /home/user/thyrox ----
CLON="$(mktemp -d)"
mkdir -p "$CLON/src/paths" "$CLON/src/lib" "$CLON/src/session"
cp "$RAIZ/src/paths/reach.py" "$CLON/src/paths/reach.py"
cp "$RAIZ/src/lib/reach.sh" "$CLON/src/lib/reach.sh"
cp "$RAIZ/src/session/write-env.sh" "$CLON/src/session/write-env.sh"
RAIZ_VIEJA="/no/existe/thyrox-viejo"
printf 'THYROX_ROOT=%s\n' "$RAIZ_VIEJA" > "$CLON/.env"
CLON_REAL="$(cd "$CLON" && pwd -P)"

echo "== caso 1: --force repara la raíz declarada al valor REAL del clon"
OUT="$(cd "$CLON" && env -u THYROX_ROOT -u THYROX_ENV_FILE bash src/session/write-env.sh --force 2>&1)"
RC=$?
check "exit 0" "$RC" "0"
ROOT_ESCRITO="$(sed -n 's/^THYROX_ROOT=//p' "$CLON/.env" 2>/dev/null)"
check "THYROX_ROOT queda en el clon real, no en el viejo" "$ROOT_ESCRITO" "$CLON_REAL"

echo "== caso 2: NO escribe fuera del clon (el .env viejo no aparece)"
check "no se creó $RAIZ_VIEJA/.env" "$([[ -f "$RAIZ_VIEJA/.env" ]] && echo si || echo no)" "no"

rm -rf "$CLON"

echo
echo "PASS=$PASS FAIL=$FAIL"
[[ "$FAIL" -eq 0 ]]
