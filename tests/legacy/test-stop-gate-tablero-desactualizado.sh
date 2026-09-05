#!/bin/bash
# =============================================================================
# test-stop-gate-tablero-desactualizado.sh — casos del hook Stop que refresca
# el tablero de tareas (H-DOCS-166, extendido H-DOCS-172)
# =============================================================================
#
# Qué protege
# -----------
# El hook nunca bloquea (siempre imprime `{}`), así que un fallo silencioso
# no se ve en el código de salida: el defecto real sería que NUNCA dispare
# el snapshot, o que dispare siempre y ensucie el disco en cada Stop. Por eso
# cada caso afirma sobre el ARTEFACTO (¿se reescribió el registro?), no sobre
# el exit code del hook.
#
# H-DOCS-172: el umbral de CONTEO (KX_UMBRAL_DRIFT_TABLERO) fue reemplazado
# por una FIRMA de estados (sha256 de todos los pares id:status). El caso 4
# es el control positivo real de ese hallazgo: la tarea #80 quedó declarada
# `in_progress` en el registro mientras el store real ya la tenía
# `completed` — mismo CONTEO (80==80), así que el umbral viejo nunca
# disparaba. Reproduce exactamente esa forma: cambia el status de una tarea
# existente sin tocar el conteo.
#
# El fixture reusa la misma forma que test-snapshot-tasks.sh (repo falso +
# CLAUDE_HOME falso), porque el hook invoca ese mismo guion.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK_ORIGINAL="$SCRIPT_DIR/../hooks/stop-gate-tablero-desactualizado.sh"
SNAPSHOT_ORIGINAL="$SCRIPT_DIR/task/snapshot-tasks.sh"
fail=0

ok()  { echo "  OK   $*"; }
bad() { echo "  FAIL $*"; fail=1; }

cleanup() { [[ -n "${TMP:-}" ]] && rm -rf "$TMP"; }
trap cleanup EXIT
TMP="$(mktemp -d)"

REPO="$TMP/repo"
mkdir -p "$REPO/.claude/scripts/task" "$REPO/.claude/scripts/agents" "$REPO/.claude/scripts/corpus" "$REPO/source/gestion/pm/reportes"
cp "$SNAPSHOT_ORIGINAL" "$REPO/.claude/scripts/task/snapshot-tasks.sh"
# La reserva del hook invoca un guion DEPRECATED, que hace `source` de su
# guard al arrancar. Sin `deprecated.sh` en el fixture la reserva muere en
# la primera linea y el caso 10 falla por el fixture, no por el hook.
cp "$SCRIPT_DIR/deprecated.sh" "$REPO/.claude/scripts/deprecated.sh"
# El hook tiene DOS destinos desde H-DOCS-180: el .rst y el store. El repo
# falso necesita el CLI del store por la misma razón que necesita el guion del
# snapshot — el hook los resuelve bajo $RAIZ.
cp "$SCRIPT_DIR/agents/agent_store.py" "$REPO/.claude/scripts/agents/agent_store.py"
# `agent_store.py` importa `tipos_documentales` desde su propio directorio
# (`sys.path.insert` en su cabecera). Sin el modulo, el render muere con
# `ModuleNotFoundError` y el caso se lee como «el hook no disparo el
# render» — un defecto de fixture disfrazado de defecto de conducta.
cp "$SCRIPT_DIR/corpus/tipos_documentales.py" "$REPO/.claude/scripts/corpus/tipos_documentales.py"
# Y el puente de registro de fallos (#709), por la misma razón: el hook lo
# resuelve bajo $RAIZ. Reubicarlo aquí además desvía su LOG_PATH —que se
# resuelve relativo a `__file__` y NO por entorno— al fixture, así que la
# suite no contamina el `errores-hooks.md` real de la sesión.
#
# TIENE que ser `cp`, no un enlace simbólico. `hook_error_log.py` calcula su
# destino con `Path(__file__).resolve()`, y `.resolve()` SIGUE el enlace: con
# un symlink el módulo escribiría en el log real del repo. Medido, mismo
# módulo por tres vías:
#
#   cp       -> /tmp/<fixture>/agent-results/errores-hooks.md   (el fixture)
#   symlink  -> /home/user/kaupamex-docs/.claude/agent-results/…  (el REAL)
#   hard     -> /tmp/<fixture>/…  correcto, pero es el mismo inodo que el
#               fuente y no cruza sistemas de archivos ($TMPDIR puede ser otro)
#
# Con symlink el caso 9 —«el camino sano no deja rastro»— mediría un archivo
# que la sesión real ya pudo haber creado: verde o rojo por una causa ajena
# al test. Sub-patrón D de metrica-decide-la-conclusion.md.
#
# Y `.resolve()` NO se quita para acomodar un enlace: es el idioma defensivo,
# no un accidente del módulo. La misma primitiva sostiene la contención de
# rutas en la referencia — «si un archivo es un enlace simbólico, la ruta real
# resuelta también se añade a `processedPaths`, lo que impide burlar la
# detección de ciclos a través de un enlace»
# (`source/base-cognitiva/harness-engineering/cap19-claudemd.rst:302-305`), y
# el ciclo de enlace figura como amenaza con su guarda en `cap20b-equipos.rst`
# (:638-639). Resolver al realpath es lo que se quiere en producción; en un
# fixture es justo lo que hay que esquivar. Se adapta el fixture, no el módulo.
mkdir -p "$REPO/.claude/hooks"
cp "$SCRIPT_DIR/../hooks/hook_error_log.py" "$REPO/.claude/hooks/hook_error_log.py"
# `hook_error_log.py` es un stub de reexportacion: su logica vive en THYROX y la
# localiza ascendiendo desde `__file__` hasta un `thyrox/` hermano. Una copia en
# `/tmp` no tiene ese hermano —medido: el ascenso desde /tmp/x/hooks no encuentra
# nada— asi que el fixture declara la raiz por su variable, que es el escape
# hatch que el stub documenta. Sin esto el stub rehusa, y rehusar es correcto:
# degradarse a no-op dejaria el fallo invisible y la suite en verde.
export THYROX_ROOT="${THYROX_ROOT:-$(cd "$SCRIPT_DIR/../../.." && pwd)/thyrox}"
LOG_FALLOS="$REPO/.claude/agent-results/errores-hooks.md"
REGISTRO="$REPO/source/gestion/pm/reportes/tablero-de-tareas.rst"

FAKE_HOME="$TMP/home"
TEAM="equipo-de-prueba"
TEAM_DIR="$FAKE_HOME/.claude/tasks/$TEAM"

ejecutar_hook() {
  ( cd "$REPO" && KX_DOCS_DIR="$REPO" CLAUDE_HOME="$FAKE_HOME/.claude" \
      CLAUDE_CODE_TASK_LIST_ID="$TEAM" \
      bash "$HOOK_ORIGINAL" )
}

sembrar_tareas() {  # sembrar_tareas <n> — crea/actualiza N archivos <id>.json en pending
  mkdir -p "$TEAM_DIR"
  for id in $(seq 1 "$1"); do
    echo "{\"id\":\"$id\",\"subject\":\"t$id\",\"status\":\"pending\",\"blocks\":[],\"blockedBy\":[]}" \
      > "$TEAM_DIR/$id.json"
  done
}

cambiar_estado() {  # cambiar_estado <id> <status> — como TaskUpdate real, sin tocar el conteo
  local id="$1" status="$2"
  echo "{\"id\":\"$id\",\"subject\":\"t$id\",\"status\":\"$status\",\"blocks\":[],\"blockedBy\":[]}" \
    > "$TEAM_DIR/$id.json"
}

echo "=== Caso 1: sin task board en absoluto — no bloquea, no crea nada ==="
salida=$(ejecutar_hook 2>&1)
[[ "$salida" == '{}' ]] && ok "imprime {} cuando no hay TASKS_ROOT" \
                         || bad "salida inesperada sin TASKS_ROOT: $salida"
[[ -f "$REGISTRO" ]] && bad "creó el registro sin tener store" \
                      || ok "no creó el registro sin store"

echo "=== Caso 2: RECUPERACIÓN — hay store, el registro NO existe ==="
sembrar_tareas 5
salida=$(ejecutar_hook 2>&1)
[[ "$salida" == '{}' ]] && ok "nunca bloquea (imprime {})" \
                         || bad "el hook bloqueó: $salida"
# Se afirma sobre "la sesión activa", NO sobre "el store". Desde #435 son dos
# cifras distintas: el store suma TODAS las sesiones. En este fixture hay una
# sola, así que coinciden — y por eso el rótulo importa: un grep sobre "en el
# store" pasaría igual midiendo el fenómeno equivocado, y nadie lo notaría en
# cuanto el fixture tuviera una segunda sesión.
if [[ -f "$REGISTRO" ]] && grep -q "Tareas en la sesión activa:\*\* 5" "$REGISTRO"; then
  ok "registro ausente disparó el render y quedó con 5 tareas en la sesión activa"
else
  bad "registro ausente NO disparó el render"
fi
if grep -qP '\*\*Firma de estados:\*\* ``[0-9a-f]{64}``' "$REGISTRO"; then
  ok "el registro generado trae la Firma de estados en formato sha256"
else
  bad "el registro generado NO trae la Firma de estados esperada"
fi

echo "=== Caso 3: registro al día — SIN drift, no se toca ==="
antes=$(stat -c %Y "$REGISTRO")
sleep 1
ejecutar_hook >/dev/null 2>&1
despues=$(stat -c %Y "$REGISTRO")
[[ "$antes" -eq "$despues" ]] && ok "registro sin drift no se reescribió" \
                               || bad "reescribió el registro sin drift real"

echo "=== Caso 4 (H-DOCS-172, control positivo real) — cambio de STATUS con conteo IGUAL, SÍ dispara ==="
# Reproduce la tarea #80: in_progress -> completed, sin crear ni borrar ninguna tarea.
cambiar_estado 1 "in_progress"
ejecutar_hook >/dev/null 2>&1   # deja el registro sincronizado en in_progress
antes=$(stat -c %Y "$REGISTRO")
sleep 1
cambiar_estado 1 "completed"  # SOLO cambia el status; siguen siendo 5 archivos .json
salida=$(ejecutar_hook 2>&1)
[[ "$salida" == '{}' ]] || bad "el hook bloqueó en el caso de status drift: $salida"
despues=$(stat -c %Y "$REGISTRO")
conteo_vivo=$(find "$TEAM_DIR" -maxdepth 1 -name '*.json' | wc -l)
if [[ "$antes" -ne "$despues" ]] \
   && grep -q "Tareas en la sesión activa:\*\* $conteo_vivo" "$REGISTRO" \
   && grep -q -- '- completed' "$REGISTRO"; then
  ok "cambio de status con conteo igual (5==5) SÍ disparó el refresh — el umbral de conteo lo habría dejado pasar"
else
  bad "cambio de status con conteo igual NO disparó el refresh (el defecto de H-DOCS-172 reincidió)"
fi

echo "=== Caso 5 — alta de una tarea (conteo cambia) también dispara, sin necesitar umbral ==="
antes=$(stat -c %Y "$REGISTRO")
sleep 1
sembrar_tareas 6   # 5 -> 6: una tarea nueva, la firma cambia igual
ejecutar_hook >/dev/null 2>&1
despues=$(stat -c %Y "$REGISTRO")
if [[ "$antes" -ne "$despues" ]] && grep -q "Tareas en la sesión activa:\*\* 6" "$REGISTRO"; then
  ok "una sola tarea nueva disparó el refresh (la firma no usa umbral)"
else
  bad "una tarea nueva no disparó el refresh"
fi

echo "=== Caso 6: RECUPERACIÓN — registro existe pero sin Firma de estados parseable ==="
echo "un archivo sin la línea de firma esperada" > "$REGISTRO"
ejecutar_hook >/dev/null 2>&1
if grep -q "Tareas en la sesión activa:\*\* 6" "$REGISTRO" \
   && grep -qP '\*\*Firma de estados:\*\* ``[0-9a-f]{64}``' "$REGISTRO"; then
  ok "registro corrupto (sin Firma de estados) disparó recuperación"
else
  bad "registro corrupto no disparó recuperación: $(cat "$REGISTRO")"
fi

echo "=== Caso 7 (H-DOCS-180): el mismo disparo vuelca las tareas al STORE, no sólo al .rst ==="
# El .rst es un reporte derivado y vive en el repo; el store es la tabla
# consultable. Los dos comparten condición de disparo —la firma de estados
# cambió— así que comparten hook: dos destinos, un solo evento. Separarlos
# permitiría que uno quede al día y el otro no, y nada lo delataría.
DB_PRUEBA="$REPO/.claude/agent-results/agent_store.sqlite3"
if [[ -f "$DB_PRUEBA" ]]; then
  filas=$(python3 -c "
import sqlite3, sys
try:
    c = sqlite3.connect(sys.argv[1])
    print(c.execute('SELECT COUNT(*) FROM tasks').fetchone()[0])
except sqlite3.OperationalError:
    print('<SIN-TABLA>')
" "$DB_PRUEBA")
  # El caso 6 dejó 6 tareas sembradas; el store debe reflejarlas.
  [[ "$filas" == "6" ]] && ok "el hook volcó las 6 tareas al store" \
                        || bad "el store no refleja las tareas: obtenido=[$filas]"
else
  bad "el hook no creó el store en $DB_PRUEBA"
fi

echo "=== Caso 8 (#435): el .rst se deriva del STORE, así que describe sesiones sin directorio ==="
# El punto entero de #435. Se siembra una sesión ANTERIOR directamente en el
# store y se BORRA su directorio: es el estado real de toda sesión pasada, cuyo
# `~/.claude/tasks/<id>/` desapareció con el contenedor.
#
# El generador viejo no podía verla — leía el directorio, y el directorio no
# está. Si el tablero la describe, la fuente es el store; si no, el hook siguió
# derivándolo del disco efímero y #435 no está cerrada.
VIEJA="$FAKE_HOME/.claude/tasks/sesion-que-ya-no-existe"
mkdir -p "$VIEJA"
echo '{"id":"1","subject":"Tarea de una sesion ya reciclada","status":"completed","blocks":[],"blockedBy":[]}' \
  > "$VIEJA/1.json"
python3 "$REPO/.claude/scripts/agents/agent_store.py" snapshot-tareas \
  --claude-dir "$REPO/.claude/agent-results" \
  --tasks-dir "$VIEJA" --session-id SESION-VIEJA >/dev/null 2>&1
rm -rf "$VIEJA"                     # el directorio se va; el store la conserva

# El caso 5 dejó las 6 tareas en `pending` (sembrar_tareas las reescribe), así
# que el estado nuevo tiene que ser OTRO o la firma no se mueve y el hook no
# dispara. La primera versión ponía `pending` y el caso fallaba por eso: el
# instrumento no medía nada, no es que el render estuviera mal.
cambiar_estado 1 "completed"        # mueve la firma para forzar el disparo
ejecutar_hook >/dev/null 2>&1
if grep -q "Tarea de una sesion ya reciclada" "$REGISTRO"; then
  ok "el tablero describe una sesión cuyo directorio ya no existe (#435 cerrada)"
else
  bad "el tablero NO describe la sesión reciclada — sigue derivándose del directorio"
fi

echo "=== Caso 9 (#709, contra-control) — el camino sano NO deja rastro de fallo ==="
# Este caso es lo que hace discriminante al 10. Sin él, un envoltorio que
# registrara SIEMPRE pasaría el 10 igual, y el verde no distinguiría «asienta
# el fallo» de «asienta todo». Sub-patrón D de metrica-decide-la-conclusion.md.
rm -f "$LOG_FALLOS"
cambiar_estado 2 "in_progress"   # mueve la firma: el gate dispara
ejecutar_hook >/dev/null 2>&1
if [[ -f "$LOG_FALLOS" ]]; then
  bad "el disparo sano escribió en el log de fallos: $(head -3 "$LOG_FALLOS")"
else
  ok "un disparo sin fallos no deja rastro (el log es señal, no bitácora)"
fi

echo "=== Caso 10 (#709) — el fallo del volcado DEJA rastro y el hook igual no bloquea ==="
# H-DOCS-279 se quedó sin poder decidir entre «la condición nunca disparó» y
# «disparó y falló en silencio»: el `|| true` las volvía idénticas desde fuera.
# El fallo se fabrica sustituyendo el CLI del store por uno que sale != 0 —
# es la forma real de «el store falló», que es lo que el hook debe asentar.
cat > "$REPO/.claude/scripts/agents/agent_store.py" <<'PY'
import sys
sys.stderr.write("fallo simulado del store\n")
sys.exit(3)
PY
cambiar_estado 3 "in_progress"   # vuelve a mover la firma
salida=$(ejecutar_hook 2>&1)
[[ "$salida" == '{}' ]] && ok "el hook sigue sin bloquear pese al fallo (imprime {})" \
                         || bad "el hook bloqueó ante un fallo del store: $salida"
if [[ -f "$LOG_FALLOS" ]]; then
  ok "el fallo del store dejó rastro en el log"
  # Las DOS invocaciones fallan, y las dos tienen que constar: si sólo se
  # asentara una, el rastro diría menos de lo que ocurrió.
  grep -q 'tablero-snapshot-tareas' "$LOG_FALLOS" \
    && ok "el rastro nombra el volcado (tablero-snapshot-tareas)" \
    || bad "el rastro NO nombra el volcado"
  grep -q 'tablero-render' "$LOG_FALLOS" \
    && ok "el rastro nombra el render (tablero-render)" \
    || bad "el rastro NO nombra el render"
  grep -q 'returncode: 3' "$LOG_FALLOS" \
    && ok "el rastro trae el returncode real del comando" \
    || bad "el rastro no trae el returncode real"
  grep -q 'fallo simulado del store' "$LOG_FALLOS" \
    && ok "el rastro trae el stderr del comando que falló" \
    || bad "el rastro no trae el stderr del comando"
else
  bad "el fallo del store NO dejó rastro — el defecto de H-DOCS-279 sigue vivo"
fi
# Y la reserva tiene que haber corrido: con el render caído, el `.rst` sólo
# puede venir de snapshot-tasks.sh. Que el hook deje rastro no lo exime de
# seguir refrescando el tablero por el camino que le queda.
grep -qP '\*\*Firma de estados:\*\* ``[0-9a-f]{64}``' "$REGISTRO" \
  && ok "la reserva refrescó el tablero pese al fallo del store" \
  || bad "el tablero quedó sin refrescar tras el fallo del store"

echo
if [[ "$fail" -eq 0 ]]; then
  echo "RESULTADO: todos los casos pasaron."
else
  echo "RESULTADO: hay casos fallidos."
fi
exit "$fail"
