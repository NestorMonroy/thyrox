#!/usr/bin/env bash
# Pruebas de check_script_naming.py — el gate de snake_case para `.py`.
#
# El control positivo NO está fabricado: es «clasificar-agentes.py», el nombre
# REAL que ese guion tuvo en este repo hasta el commit que cerró el grifo. Se
# recupera del historial y se cita abajo. Es lo que
# `hallazgo-abierto-genera-sucesor.md` exige: un incumplidor real del árbol, no
# uno escrito por quien escribió el patrón.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GATE="$RAIZ/.claude/scripts/gates/check_script_naming.py"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

OK=0
FALLO=0
afirmar() { # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then OK=$((OK + 1)); printf '  ok   %s\n' "$1"
    else FALLO=$((FALLO + 1)); printf '  FALLA %s — esperado [%s] obtenido [%s]\n' "$1" "$2" "$3"; fi
}

mkdir -p "$TMP/arbol/.claude/scripts" "$TMP/arbol/scripts" "$TMP/arbol/node_modules/x"

# ---------------------------------------------------------------- caso 1
# Control positivo REAL — el nombre que este repo tuvo hasta hoy.
: > "$TMP/arbol/.claude/scripts/clasificar-agentes.py"
afirmar "ve el control positivo real (clasificar-agentes.py)" "1" \
    "$(python3 "$GATE" --quiet "$TMP/arbol")"

# ---------------------------------------------------------------- caso 2
# El reporte propone el nombre corregido, no sólo señala.
afirmar "propone el nombre en snake" "1" \
    "$(python3 "$GATE" "$TMP/arbol" | grep -c 'clasificar_agentes\.py')"

# ---------------------------------------------------------------- caso 3
# Control negativo — el mismo archivo ya corregido NO se marca. Sin este caso
# el verde no distinguiría «no hay kebab» de «el instrumento no mira los .py».
rm "$TMP/arbol/.claude/scripts/clasificar-agentes.py"
: > "$TMP/arbol/.claude/scripts/agents/clasificar_agentes.py"
afirmar "no marca el nombre correcto" "0" "$(python3 "$GATE" --quiet "$TMP/arbol")"

# ---------------------------------------------------------------- caso 4
# El shell NO es asunto de este gate: hay dos convenciones vivas en el árbol.
: > "$TMP/arbol/scripts/mi-guion.sh"
: > "$TMP/arbol/scripts/mi_guion.sh"
afirmar "ignora .sh en ambas convenciones" "0" "$(python3 "$GATE" --quiet "$TMP/arbol")"

# ---------------------------------------------------------------- caso 5
# Los directorios excluidos no cuentan: un paquete de terceros no es deuda propia.
: > "$TMP/arbol/node_modules/x/algo-ajeno.py"
afirmar "excluye node_modules" "0" "$(python3 "$GATE" --quiet "$TMP/arbol")"

# ---------------------------------------------------------------- caso 6
# --strict en los dos sentidos.
: > "$TMP/arbol/scripts/otro-mas.py"
python3 "$GATE" --strict --quiet "$TMP/arbol" >/dev/null 2>&1
afirmar "--strict sale 1 con un infractor" "1" "$?"
rm "$TMP/arbol/scripts/otro-mas.py"
python3 "$GATE" --strict --quiet "$TMP/arbol" >/dev/null 2>&1
afirmar "--strict sale 0 sin infractores" "0" "$?"

# ---------------------------------------------------------------- caso 7
# Un conteo sin denominador no es un resultado.
afirmar "el reporte declara el alcance medido" "1" \
    "$(python3 "$GATE" "$TMP/arbol" | grep -c 'alcance medido')"

# ---------------------------------------------------------------- caso 8
# El árbol real está en cero — es la condición que el grifo cerrado sostiene.
afirmar "el repo real no tiene infractores" "0" "$(python3 "$GATE" --quiet "$RAIZ")"

# ══════════════════════════ eje 2: el IDIOMA del nombre ══════════════════════
# Directiva del ejecutor 2026-08-28: los archivos, clases, funciones y firmas
# de funcion van en ingles; los comentarios en espanol. Cierra la decision
# #647, que este gate declaraba explicitamente fuera de su alcance.

# El arbol fabricado arrastra nombres del eje 1 que TAMBIEN son espanol
# (`clasificar_agentes.py`, `mi_guion.sh`). Se parte de uno limpio para que el
# conteo del eje 2 mida lo que cada caso pone, no el residuo del eje anterior.
rm -rf "$TMP/arbol"
mkdir -p "$TMP/arbol/.claude/scripts" "$TMP/arbol/scripts"

# ---------------------------------------------------------------- caso 9
# Control positivo REAL del arbol: `stop-gate-evidencia-varada.sh` y
# `check_rst_convenciones.py` son nombres vivos de este repo, no fabricados.
: > "$TMP/arbol/.claude/scripts/check_rst_convenciones.py"
afirmar "ve el nombre en espanol de un .py real del arbol" "1" \
    "$(python3 "$GATE" --idioma --quiet "$TMP/arbol")"

# ---------------------------------------------------------------- caso 10
# El .sh SI entra en el eje de idioma, aunque su convencion de separador no
# sea asunto de este gate. Son dos ejes distintos sobre el mismo nombre.
: > "$TMP/arbol/scripts/stop-gate-evidencia-varada.sh"
afirmar "el eje de idioma tambien mide .sh" "2" \
    "$(python3 "$GATE" --idioma --quiet "$TMP/arbol")"

# ---------------------------------------------------------------- caso 11
# Control negativo DISCRIMINANTE: los dos mismos archivos ya traducidos. Sin
# este caso el verde no distinguiria «no hay espanol» de «no miro el nombre».
rm "$TMP/arbol/.claude/scripts/check_rst_convenciones.py" \
   "$TMP/arbol/scripts/stop-gate-evidencia-varada.sh"
: > "$TMP/arbol/.claude/scripts/check_rst_conventions.py"
: > "$TMP/arbol/scripts/stop-gate-stranded-evidence.sh"
afirmar "no marca el nombre ya traducido" "0" \
    "$(python3 "$GATE" --idioma --quiet "$TMP/arbol")"

# ---------------------------------------------------------------- caso 12
# Los dos ejes son independientes: un nombre en ingles CON guion medio sigue
# siendo infractor del eje 1, y uno en espanol con snake lo es solo del 2.
: > "$TMP/arbol/scripts/my-english-name.py"
afirmar "el eje de kebab no lo afecta el idioma" "1" "$(python3 "$GATE" --quiet "$TMP/arbol")"
afirmar "el eje de idioma no lo afecta el kebab" "0" "$(python3 "$GATE" --idioma --quiet "$TMP/arbol")"
rm "$TMP/arbol/scripts/my-english-name.py"

# ---------------------------------------------------------------- caso 13
# Sin lexico NO hay veredicto: el gate sale con 2 y no emite cifra. Un 0 ahi
# seria un verde falso — «no pude medir» leido como «no hay espanol».
IDIOMA_GATE_LEXICO=/inexistente python3 "$GATE" --idioma "$TMP/arbol" >/dev/null 2>&1
afirmar "sin lexico sale con codigo 2" "2" "$?"
# El 2 NO discrimina por si solo: argparse tambien sale 2 ante un argumento
# invalido. Lo que separa el guard del accidente es que NOMBRA el lexico.
afirmar "el guard nombra el lexico que le falta" "1" \
    "$(IDIOMA_GATE_LEXICO=/inexistente python3 "$GATE" --idioma "$TMP/arbol" 2>&1 \
        | grep -c 'check_identifier_language')"

# ---------------------------------------------------------------- caso 14
# El reporte del eje de idioma declara su denominador y su ceguera.
: > "$TMP/arbol/.claude/scripts/check_rst_convenciones.py"
afirmar "el reporte de idioma declara el alcance" "1" \
    "$(python3 "$GATE" --idioma "$TMP/arbol" | grep -c 'alcance medido')"

# ---------------------------------------------------------------- caso 15
# La deuda heredada se congela por nombre, no bloquea. Un nombre listado en el
# baseline no cuenta; uno nuevo si.
afirmar "el arbol real no tiene nombres nuevos en espanol" "0" \
    "$(python3 "$GATE" --idioma --quiet "$RAIZ")"

# El caso 14 dejo un nombre en espanol en el arbol de prueba; el caso 16 mide
# el eje del NOMBRE sobre su propio archivo y ese resto lo contaminaria.
rm "$TMP/arbol/.claude/scripts/check_rst_convenciones.py"

# ---------------------------------------------------------------- caso 15b
# TASK-DB-0003 (b): el lexico cerrado. La morfologia no ve un infinitivo
# (`esperar`, `refrescar`) ni un sustantivo llano (`tablero`, `hallazgo`,
# `sucesor`), asi que un nombre real del repo pasaba como ingles.
#
# Los tres controles son nombres REALES del arbol (no fabricados), colocados
# en una ruta que NO esta en el baseline: el gate salta lo listado por ruta, y
# `.claude/scripts/session/esperar-marcador.sh` si lo esta.
#
# La asercion es la LISTA EXACTA de hits, no la presencia: `marcador` acaba en
# `-ador` y la morfologia ya lo veia, asi que «aparece en el reporte» pasaria
# antes de tocar el lexico y no discriminaria (sub-patron D de
# metrica-decide-la-conclusion.md).
: > "$TMP/arbol/.claude/scripts/esperar-marcador.sh"
: > "$TMP/arbol/.claude/scripts/refrescar-tablero.sh"
: > "$TMP/arbol/.claude/scripts/check-hallazgo-sucesor.sh"
LEXICON_REPORT="$(python3 "$GATE" --idioma "$TMP/arbol")"
afirmar "el lexico ve el infinitivo: esperar-marcador -> esperar, marcador" "1" \
    "$(printf '%s\n' "$LEXICON_REPORT" \
        | grep -c 'esperar-marcador.sh  ->  español: esperar, marcador')"
afirmar "el lexico ve el infinitivo y el sustantivo: refrescar-tablero" "1" \
    "$(printf '%s\n' "$LEXICON_REPORT" \
        | grep -c 'refrescar-tablero.sh  ->  español: refrescar, tablero')"
afirmar "el lexico ve los sustantivos llanos: check-hallazgo-sucesor" "1" \
    "$(printf '%s\n' "$LEXICON_REPORT" \
        | grep -c 'check-hallazgo-sucesor.sh  ->  español: hallazgo, sucesor')"
rm "$TMP/arbol/.claude/scripts/esperar-marcador.sh" \
   "$TMP/arbol/.claude/scripts/refrescar-tablero.sh" \
   "$TMP/arbol/.claude/scripts/check-hallazgo-sucesor.sh"

# El negativo: los mismos tres, traducidos, no disparan nada. Sin este control
# el lexico podria «ver» ingles y la suite no lo notaria.
: > "$TMP/arbol/.claude/scripts/wait-for-marker.sh"
: > "$TMP/arbol/.claude/scripts/refresh-board.sh"
: > "$TMP/arbol/.claude/scripts/check-finding-successor.sh"
afirmar "traducidos, los tres pasan el eje de idioma" "0" \
    "$(python3 "$GATE" --idioma --quiet "$TMP/arbol")"
rm "$TMP/arbol/.claude/scripts/wait-for-marker.sh" \
   "$TMP/arbol/.claude/scripts/refresh-board.sh" \
   "$TMP/arbol/.claude/scripts/check-finding-successor.sh"

# ---------------------------------------------------------------- caso 16
# EJE 3 --identifiers: el idioma de los SIMBOLOS declarados dentro del .py.
# Es otro eje que el nombre del archivo: uno puede pasar y el otro fallar.
cat > "$TMP/arbol/.claude/scripts/probe_identifiers.py" <<'PYEOF'
def devuelve_el_valor(cantidad):
    return cantidad
PYEOF
afirmar "el eje de identificadores ve el simbolo en espanol" "1" \
    "$(python3 "$GATE" --identifiers --quiet "$TMP/arbol")"
afirmar "y el eje del NOMBRE de ese mismo archivo pasa" "0" \
    "$(python3 "$GATE" --idioma --quiet "$TMP/arbol")"

cat > "$TMP/arbol/.claude/scripts/probe_identifiers.py" <<'PYEOF'
def return_the_value(amount):
    return amount
PYEOF
afirmar "traducido, el eje de identificadores pasa" "0" \
    "$(python3 "$GATE" --identifiers --quiet "$TMP/arbol")"
rm "$TMP/arbol/.claude/scripts/probe_identifiers.py"

# ---------------------------------------------------------------- caso 17
# Mismo guard que el eje 2: sin lexico NO hay veredicto, y lo NOMBRA.
IDIOMA_GATE_LEXICO=/inexistente python3 "$GATE" --identifiers "$TMP/arbol" >/dev/null 2>&1
afirmar "sin lexico el eje de identificadores sale con 2" "2" "$?"
afirmar "y nombra el lexico que le falta" "1" \
    "$(IDIOMA_GATE_LEXICO=/inexistente python3 "$GATE" --identifiers "$TMP/arbol" 2>&1 \
        | grep -c 'check_identifier_language')"

# ---------------------------------------------------------------- caso 18
# El reporte declara su denominador, y la deuda heredada esta congelada.
afirmar "el reporte de identificadores declara el alcance" "1" \
    "$(python3 "$GATE" --identifiers "$TMP/arbol" | grep -c 'alcance medido')"
afirmar "el arbol real no tiene identificadores nuevos en espanol" "0" \
    "$(python3 "$GATE" --identifiers --quiet "$RAIZ")"

printf '\n%d ok · %d falla(s)\n' "$OK" "$FALLO"
[[ "$FALLO" -eq 0 ]]
