#!/bin/bash
# =============================================================================
# test-medir-disparo-de-hooks.sh — casos de `measure_hook_firing.py`
# =============================================================================
#
# Qué protege — y por qué existe
# --------------------------------
# El instrumento responde «¿este hook llegó a correr?» leyendo el transcript.
# Su modo de fallo peligroso es el silencioso: si el filtro de rango fuera un
# no-op, o si `--esperado` contara mal, el guion imprimiría cifras plausibles
# y saldría 0 — y una ausencia de disparo se leería como presencia.
#
# Por eso el caso 5 es un CONTROL QUE PUEDE FALLAR: acota el rango para dejar
# fuera al comando esperado y exige exit 1. Con el filtro roto ese caso pasa a
# exit 0 y el test cae. Sin él, los cuatro primeros casos pasan igual con un
# `--desde` que no filtre nada.
#
# Uso: bash .claude/scripts/tests/test-medir-disparo-de-hooks.sh
# =============================================================================
set -uo pipefail

# Arranque — DOS entradas, ambas de entorno (DEC-04): el VALOR de la raiz
# y la RUTA a su declaracion. Los dos literales que el ultimo recurso
# necesita van tras constantes que el entorno tambien fija: cablearlos le
# quitaria al consumidor la decision de donde van las cosas.
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
REPO="$(thyrox_root)" || exit 2
GUION="$REPO/.claude/scripts/session/measure_hook_firing.py"

fail=0
ok()  { echo "  OK   $*"; }
bad() { echo "  FAIL $*"; fail=1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FIXTURE="$TMP/transcript.jsonl"

# Universo sintético: tres fines de turno con hook-a, uno con hook-b, más dos
# líneas de ruido (una que no es resumen y otra que ni siquiera es JSON).
cat > "$FIXTURE" <<'JSONL'
{"type":"system","subtype":"stop_hook_summary","timestamp":"2026-08-20T08:00:00.000Z","hookCount":1,"hookErrors":[],"hookInfos":[{"command":"hook-a.sh","durationMs":11}]}
{"type":"user","message":{"role":"user","content":"esto menciona stop_hook_summary y no lo es"}}
{"type":"system","subtype":"stop_hook_summary","timestamp":"2026-08-20T12:00:00.000Z","hookCount":1,"hookErrors":["[hook-a.sh]: algo"],"hookInfos":[{"command":"hook-a.sh","durationMs":12}]}
{"type":"system","subtype":"stop_hook_summary","timestamp":"2026-08-21T09:00:00.000Z","hookCount":1,"hookErrors":[],"hookInfos":[{"command":"hook-b.sh","durationMs":13}]}
{"type":"system","subtype":"stop_hook_summary","timestamp":"2026-08-21T
JSONL

echo "== Caso 1: cuenta los resúmenes y descarta el ruido"
salida="$(python3 "$GUION" "$FIXTURE" 2>&1)"
if grep -q "resumen de hook: 3" <<<"$salida"; then
  ok "3 resúmenes (la línea de usuario y el JSON truncado no cuentan)"
else
  bad "esperaba 3 resúmenes; salida: $(head -1 <<<"$salida")"
fi

echo "== Caso 2: reparto por comando"
if grep -qE "^ +2 +hook-a\.sh$" <<<"$salida" && grep -qE "^ +1 +hook-b\.sh$" <<<"$salida"; then
  ok "hook-a 2 · hook-b 1"
else
  bad "reparto inesperado:"$'\n'"$salida"
fi

echo "== Caso 3: cuenta los turnos con hookErrors"
if grep -q "hookErrors no vacío: 1" <<<"$salida"; then
  ok "1 turno con error"
else
  bad "esperaba 1 turno con hookErrors"
fi

echo "== Caso 4: --esperado con un comando presente sale 0"
python3 "$GUION" "$FIXTURE" --esperado hook-a >/dev/null 2>&1
[[ $? -eq 0 ]] && ok "exit 0 con hook-a presente" \
               || bad "exit distinto de 0 con hook-a presente"

echo "== Caso 5 (CONTROL): el rango excluye a hook-a -> exit 1"
# hook-a sólo aparece el 08-20; pedir desde el 08-21 debe dejarlo fuera.
# Si el filtro de rango no filtra, este caso sale 0 y el test cae.
python3 "$GUION" "$FIXTURE" --desde 2026-08-21 --esperado hook-a >/dev/null 2>&1
[[ $? -eq 1 ]] && ok "exit 1: el rango discrimina" \
               || bad "el filtro --desde no excluyó a hook-a (control roto)"

echo "== Caso 6: --esperado con un comando ausente sale 1"
python3 "$GUION" "$FIXTURE" --esperado hook-inexistente >/dev/null 2>&1
[[ $? -eq 1 ]] && ok "exit 1 con comando ausente" \
               || bad "exit distinto de 1 con comando ausente"

echo "== Caso 7: un transcript sin resúmenes no revienta"
: > "$TMP/vacio.jsonl"
salida_vacia="$(python3 "$GUION" "$TMP/vacio.jsonl" 2>&1)"
if [[ $? -eq 0 ]] && grep -q "comandos disparados: ninguno" <<<"$salida_vacia"; then
  ok "sale 0 y lo declara, en vez de callar"
else
  bad "transcript vacío: $salida_vacia"
fi

echo
if [[ "$fail" -eq 0 ]]; then
  echo "RESULTADO: todos los casos pasaron."
else
  echo "RESULTADO: hay casos fallidos."
fi
exit "$fail"
