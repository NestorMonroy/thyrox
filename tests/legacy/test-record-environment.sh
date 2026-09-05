#!/bin/bash
# =============================================================================
# test-record-environment.sh — prueba del registro de condiciones de un evento
# =============================================================================
#
# La mitad de `shell-snapshots` que SÍ conviene copiarle al cliente. Éste
# congela el entorno de shell para que una ejecución posterior corra en el
# mismo; nuestros eventos guardan el RESULTADO de una medición y no las
# CONDICIONES bajo las que se produjo. Un resultado sin sus condiciones es una
# foto: no se puede repetir ni saber contra qué se midió.
#
# El control que hace real a la prueba es el caso 5: una clave que no se pudo
# medir se declara `null`, NO se omite. Ausente y nulo dicen cosas distintas
# —«nadie ha pasado» contra «se midió y no había»— y colapsarlos repite el
# defecto que H-DOCS-427 cerró en el store.
#
# Uso:  bash .claude/scripts/tests/test-record-environment.sh
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUT="$SCRIPT_DIR/session/record_environment.py"

PASS=0; FAIL=0
check() {
  if [[ "$2" == "$3" ]]; then
    PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"
  else
    FAIL=$((FAIL + 1)); printf '  FALLA %s\n       esperado: %s\n       obtenido: %s\n' "$1" "$3" "$2"
  fi
}

key() { python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get(sys.argv[2],'<AUSENTE>'))" "$1" "$2"; }

echo "== caso 1: escribe el manifiesto en el evento dado"
EV="$(mktemp -d)"
OUT="$(python3 "$SUT" "$EV" 2>&1)"; RC=$?
check "exit 0" "$RC" "0"
check "environment.json existe" "$([[ -f "$EV/environment.json" ]] && echo si || echo no)" "si"

echo "== caso 2: declara las claves obligatorias"
for k in captured_at repo_head executable_version executable_sha256 python_version cpu_count; do
  check "declara $k" "$([[ "$(key "$EV/environment.json" "$k")" == '<AUSENTE>' ]] && echo no || echo si)" "si"
done

echo "== caso 3: el instante NO se fabrica — ISO 8601 en UTC"
STAMP="$(key "$EV/environment.json" captured_at)"
check "forma ISO 8601" "$(grep -cE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}$' <<<"$STAMP")" "1"
check "los segundos no son :00 fabricados" "$([[ "$STAMP" == *:00 ]] && echo sospechoso || echo real)" "real"
rm -rf "$EV"

echo "== caso 4: no sobreescribe sin que se lo pidan"
echo "   (las condiciones de un evento son el registro de un momento)"
EV="$(mktemp -d)"
python3 "$SUT" "$EV" >/dev/null 2>&1
echo '{"captured_at":"2020-01-01T00:00:00"}' > "$EV/environment.json"
OUT="$(python3 "$SUT" "$EV" 2>&1)"; RC=$?
check "exit 1 ante un manifiesto ya escrito" "$RC" "1"
check "y NO lo pisa" "$(key "$EV/environment.json" captured_at)" "2020-01-01T00:00:00"
OUT="$(python3 "$SUT" "$EV" --force 2>&1)"; RC=$?
check "--force sí lo reemplaza" "$RC" "0"
check "y el instante cambió" "$([[ "$(key "$EV/environment.json" captured_at)" == '2020-01-01T00:00:00' ]] && echo no || echo si)" "si"
rm -rf "$EV"

echo "== caso 5: lo que no se pudo medir se declara null, no se omite"
echo "   (control de discriminación: ausente y nulo dicen cosas distintas)"
EV="$(mktemp -d)"
RECORD_ENVIRONMENT_EXECUTABLE=/no/existe python3 "$SUT" "$EV" >/dev/null 2>&1
check "la clave SIGUE declarada" "$([[ "$(key "$EV/environment.json" executable_version)" == '<AUSENTE>' ]] && echo no || echo si)" "si"
check "y su valor es None, no una cadena vacía" "$(key "$EV/environment.json" executable_version)" "None"
rm -rf "$EV"

echo "== caso 6: rehúsa si el evento no existe, SIN escribir nada"
OUT="$(python3 "$SUT" /no/existe/tampoco 2>&1)"; RC=$?
check "exit 2" "$RC" "2"
check "nombra el directorio ausente" "$(grep -c 'no/existe/tampoco' <<<"$OUT")" "1"

echo
printf '%s ok · %s falla(s)\n' "$PASS" "$FAIL"
[[ "$FAIL" -eq 0 ]]
