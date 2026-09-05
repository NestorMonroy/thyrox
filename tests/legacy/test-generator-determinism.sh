#!/bin/bash
# =============================================================================
# test-generator-determinism.sh — prueba del gate de determinismo del generador
# =============================================================================
#
# El cliente rechaza en el parseo un guion de workflow que tome el instante del
# reloj («workflow scripts must be deterministic … breaks resume»). Nuestros
# generadores de evento llegaron al mismo invariante por convención; este gate
# lo vuelve mecánico.
#
# El control que hace real a la prueba es el caso 4: el gate se ejercita contra
# un POSITIVO REAL DEL REPO —la forma `datetime.now(timezone.utc)` que vive en
# `flujo-de-tiempo-*/medir_flujo_de_tiempo.py`— y no contra uno fabricado. Un
# incumplidor escrito por quien escribió el patrón hereda su encuadre y confirma
# el instrumento en vez de probarlo (`hallazgo-abierto-genera-sucesor.md`).
#
# Uso:  bash .claude/scripts/tests/test-generator-determinism.sh
# =============================================================================

set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SUT="$REPO/.claude/scripts/gates/check_generator_determinism.py"

PASS=0; FAIL=0
check() {
  if [[ "$2" == "$3" ]]; then
    PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"
  else
    FAIL=$((FAIL + 1)); printf '  FALLA %s\n       esperado: %s\n       obtenido: %s\n' "$1" "$3" "$2"
  fi
}

cd "$REPO"

echo "== caso 1: el árbol limpio pasa, y publica su denominador"
OUTPUT="$(python3 "$SUT" 2>&1)"; EXIT=$?
check "exit 0" "$EXIT" "0"
check "publica el alcance medido" "$(grep -c 'alcance medido' <<<"$OUTPUT")" "1"
check "nombra generadores, no ejecutables" "$(grep -c 'generador' <<<"$OUTPUT")" "1"

echo "== caso 2: rehúsa SIN emitir conteo si la raíz de eventos no existe"
echo "   (un 0 ahí no distingue «no hay defectos» de «no pude medir»)"
OUTPUT="$(EVENTS_ROOT=/no/existe python3 "$SUT" 2>&1)"; EXIT=$?
check "exit 2" "$EXIT" "2"
check "nombra la raíz ausente" "$(grep -c 'no/existe' <<<"$OUTPUT")" "1"
check "NO emite conteo" "$(grep -c 'alcance medido' <<<"$OUTPUT")" "0"

echo "== caso 3: --strict sobre el árbol limpio sigue en 0"
python3 "$SUT" --strict >/dev/null 2>&1
check "exit 0 con --strict" "$?" "0"

echo "== caso 4: CONTROL POSITIVO — la forma real que vive en el repo"
SOURCE_FORM="$(grep -rln 'datetime.now(timezone.utc)' .claude/eventos --include='*.py' | head -1)"
check "la forma existe en el repo (no es fabricada)" \
  "$([[ -n "$SOURCE_FORM" ]] && echo si || echo no)" "si"
VICTIM="$(mktemp -d "$REPO/.claude/eventos/prueba-gate-XXXXXX")"
cat > "$VICTIM/gen.py" <<'PY'
import pathlib
from datetime import datetime, timezone
OUT = pathlib.Path('source/gestion/pm/docs/nada.rst')
STAMP = datetime.now(timezone.utc).isoformat()
OUT.write_text(STAMP)
PY
OUTPUT="$(python3 "$SUT" --strict 2>&1)"; EXIT=$?
check "exit 1 ante el incumplidor" "$EXIT" "1"
check "nombra el archivo" "$(grep -c "$(basename "$VICTIM")" <<<"$OUTPUT")" "1"
check "nombra la forma que lo delata" "$(grep -c 'toma el instante del reloj con .datetime.now' <<<"$OUTPUT")" "1"

echo "== caso 5: el que NO escribe en source/ queda fuera del universo"
echo "   (una sonda que imprime a stdout no rompe la reproducción del artefacto)"
cat > "$VICTIM/gen.py" <<'PY'
import pathlib
OUT = pathlib.Path('source/gestion/pm/docs/nada.rst')
OUT.write_text('constante')
PY
cat > "$VICTIM/sonda.py" <<'PY'
import time
t0 = time.time()
print(f'{time.time() - t0:.1f}s')
PY
python3 "$SUT" --strict >/dev/null 2>&1
check "la sonda no lo hace fallar" "$?" "0"

echo "== caso 6: el árbol vendorizado de un tercero queda fuera"
mkdir -p "$VICTIM/extraido/ajeno"
cat > "$VICTIM/extraido/ajeno/gen.py" <<'PY'
import pathlib
from datetime import datetime
pathlib.Path('source/x.rst').write_text(str(datetime.now()))
PY
python3 "$SUT" --strict >/dev/null 2>&1
check "extraido/ no cuenta como código nuestro" "$?" "0"
rm -rf "$VICTIM"

echo
printf '%s ok · %s falla(s)\n' "$PASS" "$FAIL"
[[ "$FAIL" -eq 0 ]]
