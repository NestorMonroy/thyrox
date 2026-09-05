#!/bin/bash
# =============================================================================
# test-snapshot-tasks.sh — casos de regresión de `snapshot-tasks.sh`
# =============================================================================
#
# Qué protege — y por qué existe
# --------------------------------
# `snapshot-tasks.sh` es el ÚNICO mecanismo que saca el task board del disco
# efímero del contenedor y lo deja versionado. Sus dos modos de fallo medidos
# son ambos SILENCIOSOS — salen 0 y no dejan rastro:
#
#   F-1  Sin argumentos imprimía a stdout y NO escribía el registro. Medido
#        2026-08-13: el registro quedó parado en #282 con el board en #296.
#        Ver :ref:`h-docs-137`.
#   F-2  Un comando que falla dentro de `render` bajo `set -euo pipefail`
#        trunca el volcado a media tabla, y el exit 0 lo pone la última etapa
#        de la tubería. Es la forma de H-DOCS-120 (SIGPIPE en el séptimo
#        check) y volvió a ocurrir al escribir la sección de alcance, con
#        `comm` quejándose del orden.
#
# Un fix sin test aquí no vale: los dos fallos se ven exactamente igual que
# el éxito desde el código de salida. Por eso cada caso afirma sobre el
# ARTEFACTO (existe, está completo, parsea), nunca sobre `$?`.
#
# El fixture es sintético, pero el criterio NO
# ----------------------------------------------
# `hallazgo-abierto-genera-sucesor.md` deja dicho que un incumplidor
# fabricado por quien escribió el patrón hereda su encuadre y confirma el
# instrumento. Aquí el fixture reproduce tres rasgos MEDIDOS del store real
# de este contenedor, no inventados:
#
#   • `.highwatermark` con un valor MAYOR que ningún id presente (real: 209
#     con máximo 296 — el binario lo escribe al borrar, no al crear);
#   • huecos de id por borrado (real: 8, 206, 207, 208, 209);
#   • un `subject` con el payload de la llamada filtrado (real: #169/#170,
#     H-DOCS-121).
#
# Uso:
#   bash .claude/scripts/test-snapshot-tasks.sh
#
# Exit 0 si todos los casos pasan; 1 si alguno falla.
# =============================================================================
set -uo pipefail

# El SUT vive un nivel arriba: los tests son un directorio hermano del
# código, no viven junto a él (forma medida en ``ccb: daemon/src/__tests__/``).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ORIGINAL="$SCRIPT_DIR/task/snapshot-tasks.sh"
fail=0

ok()  { echo "  OK   $*"; }
bad() { echo "  FAIL $*"; fail=1; }

cleanup() { [[ -n "${TMP:-}" ]] && rm -rf "$TMP"; }
trap cleanup EXIT
TMP="$(mktemp -d)"

# --- Fixture ----------------------------------------------------------------
# Un repo falso con la misma forma que kaupamex-docs, para que el guion
# resuelva su registro canónico desde su propia ubicación (../..).
REPO="$TMP/repo"
GUION="$REPO/.claude/scripts/task/snapshot-tasks.sh"
REGISTRO="$REPO/source/gestion/pm/reportes/tablero-de-tareas.rst"
mkdir -p "$REPO/.claude/scripts/task" "$REPO/.claude/scripts/agents" "$REPO/.claude/scripts/corpus"
cp "$ORIGINAL" "$GUION"
# El SUT quedó DEPRECATED (`deprecated.sh`, 2026-08-26) y hace `source` de su
# guard al arrancar. El fixture tiene que traerlo: sin él el guion muere en la
# primera línea y los ocho casos fallan por una causa que no es la que miden.
cp "$SCRIPT_DIR/deprecated.sh" "$REPO/.claude/scripts/deprecated.sh"
# Y la declaración explícita: el guard rehúsa sin ella. Aquí es legítima —
# medir un guion deprecado es exactamente para lo que la declaración existe.
export ACCEPT_DEPRECATED=snapshot-tasks.sh

FAKE_HOME="$TMP/home"
TEAM="equipo-de-prueba"
TEAM_DIR="$FAKE_HOME/.claude/tasks/$TEAM"
mkdir -p "$TEAM_DIR"

# Ids 1..10 con DOS huecos deliberados (4 y 7): tareas borradas.
for id in 1 2 3 5 6 8 9 10; do
  cat > "$TEAM_DIR/$id.json" <<EOF
{"id":"$id","subject":"Tarea $id con guion_bajo y *asterisco*","description":"d",
 "status":"pending","blocks":[],"blockedBy":[]}
EOF
done
# El high water mark es MAYOR que el máximo presente — como el real.
echo -n "13" > "$TEAM_DIR/.highwatermark"
: > "$TEAM_DIR/.lock"

# Un subject corrupto con la firma de H-DOCS-121 (payload de la llamada).
cat > "$TEAM_DIR/11.json" <<'EOF'
{"id":"11","subject":"algo</subject>\n<parameter name=\"description\">fuga",
 "description":"d","status":"pending","blocks":[],"blockedBy":[]}
EOF

correr() { ( cd "$REPO" && CLAUDE_HOME="$FAKE_HOME/.claude" bash "$GUION" "$@" ); }
filas()  { grep -cE '^   \* - [0-9]+$' "$1"; }

echo "=== Fixture: 9 tareas, huecos en 4 y 7, hwm=13, 1 subject corrupto ==="

# --- Caso 1 — F-1: sin argumentos ESCRIBE el registro canónico --------------
echo "=== Caso 1: sin argumentos escribe el registro canónico ==="
salida=$(correr 2>&1)
if [[ -f "$REGISTRO" ]]; then
  ok "escribió $REGISTRO sin pedir argumentos"
else
  bad "no escribió el registro — F-1 reintroducido: $salida"
fi

# --- Caso 2 — el volcado está COMPLETO, no truncado -------------------------
echo "=== Caso 2: el volcado llega hasta el final (F-2) ==="
if [[ -f "$REGISTRO" ]]; then
  n=$(filas "$REGISTRO")
  if [[ "$n" -eq 9 ]]; then
    ok "9 filas de tarea, una por archivo"
  else
    bad "esperaba 9 filas, hay $n — volcado truncado"
  fi
  if grep -q "^Alcance del volcado" "$REGISTRO"; then
    ok "la sección final está presente (render no abortó)"
  else
    bad "falta 'Alcance del volcado' — render abortó a media tabla con exit 0"
  fi
fi

# --- Caso 3 — el alcance publica su denominador y los ids borrados ----------
echo "=== Caso 3: denominador, high water mark e ids borrados ==="
if grep -q "Ids ausentes (borrados):\*\* 4 7" "$REGISTRO"; then
  ok "declara los huecos 4 y 7 como borrados"
else
  bad "no declara los ids borrados: $(grep -o 'Ids ausentes.*' "$REGISTRO")"
fi
if grep -q "13" <(grep "High water mark" "$REGISTRO"); then
  ok "publica el high water mark (13) distinto del máximo presente (11)"
else
  bad "no publica el high water mark leído de .highwatermark"
fi

# --- Caso 4 — --stdout imprime y NO escribe ---------------------------------
echo "=== Caso 4: --stdout no toca el disco ==="
rm -f "$REGISTRO"
salida=$(correr --stdout 2>/dev/null)
if [[ ! -f "$REGISTRO" ]] && [[ "$salida" == *"Alcance del volcado"* ]]; then
  ok "imprimió el volcado completo sin escribir el registro"
else
  bad "--stdout escribió el registro o imprimió incompleto"
fi

# --- Caso 5 — -o y los posicionales viejos siguen valiendo -------------------
echo "=== Caso 5: -o RUTA y retrocompatibilidad posicional ==="
correr -o "$TMP/con-flag.rst" >/dev/null 2>&1
[[ -s "$TMP/con-flag.rst" ]] && ok "-o RUTA respetado" || bad "-o RUTA ignorado"
correr "$TEAM" "$TMP/posicional.rst" >/dev/null 2>&1
[[ -s "$TMP/posicional.rst" ]] && ok "[team] [salida] sigue funcionando" \
                               || bad "se rompió la retrocompatibilidad posicional"

# --- Caso 6 — la variable de entorno gana a la heurística de mtime ----------
# El binario resuelve el task-list con CLAUDE_CODE_TASK_LIST_ID primero.
# Control: un segundo team MÁS RECIENTE que el nuestro; sin la variable el
# guion elegiría ése (mtime), con ella debe elegir el declarado.
echo "=== Caso 6: CLAUDE_CODE_TASK_LIST_ID gana al mtime ==="
OTRO="$FAKE_HOME/.claude/tasks/equipo-mas-nuevo"
mkdir -p "$OTRO"
echo '{"id":"1","subject":"del OTRO team","status":"pending","blocks":[],"blockedBy":[]}' \
  > "$OTRO/1.json"
# Las fechas se fijan EXPLÍCITAS, no con `touch` a secas. Medido en este
# contenedor (ext2/ext3): dos directorios creados en el mismo comando salen
# con el MISMO mtime al nanosegundo (1786636744.854234238 los dos; la
# resolución observada entre comandos es ~7 ms). Con el empate, `sort -rn`
# devuelve el orden que le dé `find` — orden de directorio, arbitrario.
# Es decir: la heurística de mtime no sólo adivina, a veces **no puede
# decidir**. Ése es el fondo del Caso 6, y sin fechas explícitas el control
# quedaba a suerte del planificador.
touch -d '2020-01-01 00:00:00' "$TEAM_DIR"
touch -d '2030-01-01 00:00:00' "$OTRO"
# La salida se captura en una variable y se compara con [[ ]] — NO con
# `| grep -q`. Bajo `set -o pipefail`, `grep -q` cierra la tubería en cuanto
# encuentra la línea; el productor muere con SIGPIPE (141) y el PIPELINE sale
# != 0 aunque el grep haya acertado. Medido aquí mismo: este control daba
# FAIL con el match presente. Es H-DOCS-120 por tercera vez en la sesión, y
# la razón de que ninguna aserción de este archivo use tuberías.
por_mtime=$( ( cd "$REPO" && CLAUDE_HOME="$FAKE_HOME/.claude" \
               bash "$GUION" --stdout ) 2>/dev/null )
if [[ "$por_mtime" == *"del OTRO team"* ]]; then
  ok "control: sin la variable, el mtime elige el team más reciente"
else
  bad "control inválido: el fixture no reproduce la heurística de mtime"
fi
declarado=$( ( cd "$REPO" && CLAUDE_HOME="$FAKE_HOME/.claude" \
                CLAUDE_CODE_TASK_LIST_ID="$TEAM" bash "$GUION" --stdout ) 2>/dev/null )
if [[ "$declarado" == *"Tarea 1 con"* && "$declarado" != *"del OTRO team"* ]]; then
  ok "con la variable declarada, vuelca el team declarado (y sólo ése)"
else
  bad "CLAUDE_CODE_TASK_LIST_ID ignorado — se sigue adivinando por mtime"
fi

# --- Caso 7 — el subject corrupto AVISA y la tabla sigue siendo válida ------
echo "=== Caso 7: detector de subject corrupto (H-DOCS-121) ==="
aviso=$( ( cd "$REPO" && CLAUDE_HOME="$FAKE_HOME/.claude" \
           CLAUDE_CODE_TASK_LIST_ID="$TEAM" bash "$GUION" \
           -o "$TMP/corrupto.rst" ) 2>&1 >/dev/null )
if [[ "$aviso" == *"payload filtrado"* ]] && [[ "$aviso" == *"11"* ]]; then
  ok "avisa por stderr del subject corrupto (#11)"
else
  bad "no avisó del subject corrupto: $aviso"
fi

# --- Caso 8 — el RST parsea (el gate real de H-DOCS-121) --------------------
echo "=== Caso 8: el volcado parsea como RST ==="
if python3 -c "import docutils" 2>/dev/null; then
  err=$(python3 - "$TMP/corrupto.rst" <<'PY'
import sys, docutils.core, docutils.utils
try:
    docutils.core.publish_doctree(
        open(sys.argv[1]).read(),
        settings_overrides={'report_level': 3, 'halt_level': 5,
                            'warning_stream': sys.stdout})
except Exception as e:                      # noqa: BLE001 — cualquier fallo cuenta
    print(f'EXCEPCION: {e}')
PY
)
  [[ -z "$err" ]] && ok "docutils no reporta errores" \
                  || bad "el RST no parsea: $err"
else
  echo "  SKIP docutils no instalado — el gate RST del repo lo cubre"
fi

echo
if [[ "$fail" -eq 0 ]]; then
  echo "RESULTADO: todos los casos pasaron."
else
  echo "RESULTADO: hay casos fallidos."
fi
exit "$fail"
