#!/bin/bash
# =============================================================================
# test-premise-drift.sh — prueba del gate que corre la cadena de premisas
# =============================================================================
#
# La cadena detector -> emisor -> evaluador ya funcionaba y nadie la corria. Su
# unico valor es la RE-MEDICION en el tiempo: el acuerdo del mismo dia es
# estructural (los instrumentos se incluyen), asi que un veredicto solo informa
# cuando se compara con el de otra ejecucion.
#
# Lo que este gate mide, entonces, no es el veredicto: es su CAMBIO contra un
# baseline. Y lo que la suite comprueba es que el cambio se detecte en los dos
# sentidos —una ficha que pasa a pedir re-encuadre y una que deja de pedirlo—,
# porque un gate que solo ve una direccion publica ceros en la otra.
#
# Uso:  bash .claude/scripts/tests/test-premise-drift.sh
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUT="$SCRIPT_DIR/gates/check_premise_drift.py"
OK=0; FALLO=0

comprobar() {  # <descripcion> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then OK=$((OK+1)); printf '  ok   %s\n' "$1"
    else FALLO=$((FALLO+1)); printf '  FAIL %s\n       esperaba %q, obtuvo %q\n' "$1" "$2" "$3"; fi
}

[[ -f "$SUT" ]] || { echo "ERROR — no existe $SUT. NO se emite un conteo."; exit 2; }

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

# --- fichas sinteticas: el gate lee un directorio, no el tablero vivo -------
mkdir -p "$TMP/fichas"
cat > "$TMP/fichas/1.json" <<'JSON'
{"id": 1, "status": "pending", "subject": "Tarea firme",
 "description": "El archivo src/elf.ts existe y declara findSection."}
JSON
cat > "$TMP/fichas/2.json" <<'JSON'
{"id": 2, "status": "pending", "subject": "Tarea firme tambien",
 "description": "Otra descripcion sin señal de re-encuadre."}
JSON

echo "== primera ejecucion sin baseline: el gate REHUSA"
#
# Publicar «0 cambios» aqui seria el verde que no discrimina: ni un lector ni
# `--quiet` podrian separar «nada cambio» de «no habia contra que medir».
SAL=$("$SUT" --tasks-dir "$TMP/fichas" --baseline "$TMP/base.json" 2>&1); RC=$?
comprobar "exit 2, no 0" "2" "$RC"
comprobar "sin baseline NO emite ninguna cifra de cambios" \
    "no" "$(grep -qE '[0-9]+ cambio' <<<"$SAL" && echo si || echo no)"

echo "== escribir el baseline"
"$SUT" --tasks-dir "$TMP/fichas" --baseline "$TMP/base.json" --write-baseline >/dev/null 2>&1
comprobar "el baseline aterriza" "si" "$([[ -f $TMP/base.json ]] && echo si || echo no)"

echo "== sin cambios entre ejecuciones"
SAL=$("$SUT" --tasks-dir "$TMP/fichas" --baseline "$TMP/base.json" 2>&1); EST=$?
comprobar "exit 0 cuando nada cambio" "0" "$EST"
comprobar "publica su denominador" \
    "si" "$(grep -qE 'alcance medido: [0-9]+' <<<"$SAL" && echo si || echo no)"

echo "== una ficha CAMBIA de veredicto (firme -> pide re-encuadre)"
# La señal es real del detector, no fabricada. Se verifico primero cual dispara:
#   S2 — una ruta citada que no resuelve bajo ninguna de las diez raices.
# El primer intento uso `src/inexistente.ts` y NO disparaba: el detector no
# reconocia la extension `.ts`. Ese hueco se cerro en el mismo pase; el fixture
# usa `.py` porque es la extension con la que S2 se midio funcionando.
cat > "$TMP/fichas/2.json" <<'JSON'
{"id": 2, "status": "pending", "subject": "Tarea con premisa rota",
 "description": "Corregir scripts/gates/jamas_existio.py, que aborta el arranque."}
JSON
SAL=$("$SUT" --tasks-dir "$TMP/fichas" --baseline "$TMP/base.json" 2>&1)
comprobar "el cambio se detecta" \
    "si" "$(grep -qE '1 cambio' <<<"$SAL" && echo si || echo no)"
comprobar "nombra la ficha que cambio" \
    "si" "$(grep -q '#2' <<<"$SAL" && echo si || echo no)"
"$SUT" --tasks-dir "$TMP/fichas" --baseline "$TMP/base.json" --strict >/dev/null 2>&1
comprobar "--strict sale 1 con un cambio" "1" "$?"

echo "== y en el sentido contrario (pide re-encuadre -> firme)"
"$SUT" --tasks-dir "$TMP/fichas" --baseline "$TMP/base.json" --write-baseline >/dev/null 2>&1
cat > "$TMP/fichas/2.json" <<'JSON'
{"id": 2, "status": "pending", "subject": "Tarea firme tambien",
 "description": "Otra descripcion sin señal de re-encuadre."}
JSON
SAL=$("$SUT" --tasks-dir "$TMP/fichas" --baseline "$TMP/base.json" 2>&1)
comprobar "el cambio inverso tambien se detecta" \
    "si" "$(grep -qE '1 cambio' <<<"$SAL" && echo si || echo no)"

echo "== una ficha NUEVA no es un cambio de veredicto"
cat > "$TMP/fichas/3.json" <<'JSON'
{"id": 3, "status": "pending", "subject": "Recien creada", "description": "Sin historia."}
JSON
SAL=$("$SUT" --tasks-dir "$TMP/fichas" --baseline "$TMP/base.json" 2>&1)
comprobar "la ficha nueva se cuenta aparte, no como cambio" \
    "si" "$(grep -qE '1 nueva|nuevas: 1' <<<"$SAL" && echo si || echo no)"

echo "== el camino POR DEFECTO se ejerce, no solo el de --tasks-dir"
#
# Los seis casos de arriba pasan `--tasks-dir`, asi que ninguno tocaba la rama
# que resuelve el sustrato por si sola. Ahi vivian tres defectos a la vez:
# `newest_session_dir(None)` reventaba, `build_symbol_index` devuelve una tupla
# y no un dict, y las raices eran las del repo `docs` en vez de las que el
# detector declara. Los tres invisibles con la suite en verde — el sub-patron D
# dentro del propio control.
"$SUT" --baseline "$TMP/vivo.json" --write-baseline >/dev/null 2>&1
SAL=$("$SUT" --baseline "$TMP/vivo.json" 2>&1); RC=$?
comprobar "sin --tasks-dir resuelve el tablero y no revienta" "0" "$RC"
comprobar "y publica su alcance medido" \
    "si" "$(grep -qE 'alcance medido: [0-9]+ ficha' <<<"$SAL" && echo si || echo no)"

echo "== guard: sin el directorio de fichas NO se emite cifra"
"$SUT" --tasks-dir "$TMP/no-existe" --baseline "$TMP/base.json" >/dev/null 2>&1
comprobar "exit 2 y sin conteo" "2" "$?"

printf '\n%d ok, %d fallo(s)  (alcance medido: %d asercion(es))\n' "$OK" "$FALLO" "$((OK+FALLO))"
[[ "$FALLO" -eq 0 ]] || exit 1
