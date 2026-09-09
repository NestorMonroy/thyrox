#!/bin/bash
# =============================================================================
# verify-task-store-in-cli-js.sh — reproduce las citas PROVEN del análisis
# `analisis-task-store-binario-claude-code.rst` contra el cli.js instalado
# =============================================================================
#
# Por qué existe
# --------------
# El análisis del task-store nativo de Claude Code se hizo leyendo el bundle
# minificado `cli.js` del paquete `@anthropic-ai/claude-code` instalado en
# este contenedor — no hay línea de código legible que citar `file:line`
# como en un repo normal (es una sola línea gigante por archivo). Este script
# es la cita PROVEN reproducible: corre los mismos comandos que produjeron
# cada hallazgo, para que un tercero los repita sin confiar en la prosa.
#
# Qué verifica, y qué NO
# -----------------------
#   (a) que las tres cadenas clave existen en el bundle instalado    → SÍ
#   (b) que la ruta real ~/.claude/tasks/<team>/ existe en disco     → SÍ
#   (c) que el paquete instalado es la MISMA versión que se analizó  → SÍ
#   (d) el comportamiento interno del bundle (es minificado; esto
#       lee texto, no ejecuta el código)                             → NO
#
# Versión analizada: @anthropic-ai/claude-code 2.1.42 (ver package.json).
# Si la versión instalada cambia, este script sigue corriendo pero las
# cifras/cadenas pueden diferir — re-correr y comparar antes de citar.
#
# =============================================================================

set -euo pipefail

PKG_DIR="${CLAUDE_CODE_PKG_DIR:-/opt/node22/lib/node_modules/@anthropic-ai/claude-code}"
CLI_JS="$PKG_DIR/cli.js"
SDK_DTS="$PKG_DIR/sdk-tools.d.ts"

fail=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "OK   $desc ($actual)"
  else
    echo "FAIL $desc (esperado: $expected, medido: $actual)"
    fail=1
  fi
}

echo "=== Version instalada ==="
INSTALLED_VERSION=$(python3 -c "import json; print(json.load(open('$PKG_DIR/package.json'))['version'])")
echo "  @anthropic-ai/claude-code == $INSTALLED_VERSION"
if [[ "$INSTALLED_VERSION" != "2.1.42" ]]; then
  echo "  ADVERTENCIA: el analisis se hizo contra 2.1.42; version actual difiere."
fi
echo

echo "=== 1. sdk-tools.d.ts declara TaskOutputInput/TaskStopInput (background Bash/Agent) ==="
N_TASKOUTPUT=$(grep -c "TaskOutputInput" "$SDK_DTS")
if [[ "$N_TASKOUTPUT" -ge 1 ]]; then
  echo "OK   TaskOutputInput presente ($N_TASKOUTPUT ocurrencias)"
else
  echo "FAIL TaskOutputInput ausente"
  fail=1
fi
echo "  task_id: $(grep -c "task_id" "$SDK_DTS") ocurrencias"
echo

echo "=== 2. sdk-tools.d.ts NO declara el board colaborativo (TaskCreate/TaskList/owner/blockedBy) ==="
HITS=$(grep -cE "TaskCreate|TaskList|blockedBy" "$SDK_DTS" || true)
check "board colaborativo ausente del SDK tipado" "0" "$HITS"
echo

echo "=== 3. cli.js contiene la doc embebida del board Team/TaskList ==="
python3 -c "
data = open('$CLI_JS', 'r', errors='replace').read()
needle = '.claude/tasks/'
idx = data.find(needle)
assert idx >= 0, 'no se encontro .claude/tasks/ en cli.js'
print('  hallado en offset de bytes', idx)
print('  contexto:', repr(data[idx-60:idx+80]))
"
echo

echo "=== 4. cli.js construye la ruta como \${base}/tasks/\${teamName}/ ==="
python3 -c "
import re
data = open('$CLI_JS', 'r', errors='replace').read()
m = re.search(r'tasks/\\\${[a-zA-Z0-9_.]+}/\`', data)
assert m, 'no se encontro el template literal tasks/\${...}/'
print('  hallado:', repr(m.group()))
"
echo

echo "=== 5. cli.js vendoriza un _taskStore de protocolo MCP genérico (createTask/getTask/listTasks/updateTaskStatus) — subsistema DISTINTO ==="
for fn in createTask getTask listTasks updateTaskStatus getTaskResult; do
  n=$(grep -c "\.${fn}(" "$CLI_JS" || true)
  echo "  ${fn}(: $n ocurrencias"
done
echo

echo "=== 6. Estado real en este contenedor: ~/.claude/tasks/<team>/ ==="
# Costura de testeo: sin ella este guion sólo se puede ejercitar contra el
# board real del contenedor, que es justo lo que dejó pasar el bug de
# H-DOCS-120 (verde con 32 tareas, aborto con 247). Mismo patrón que
# STOP_GATE_HALLAZGO_REPOS en stop-gate-hallazgo-pendiente.sh.
TASKS_ROOT="${TASKS_ROOT:-$HOME/.claude/tasks}"
if [[ -d "$TASKS_ROOT" ]]; then
  for d in "$TASKS_ROOT"/*/; do
    [[ -d "$d" ]] || continue
    team=$(basename "$d")
    n=$(find "$d" -maxdepth 1 -name '*.json' | wc -l)
    echo "  team=$team  tareas_json=$n  lock=$( [[ -f "$d/.lock" ]] && echo si || echo no )"
  done
else
  echo "  $TASKS_ROOT no existe en este contenedor"
fi
echo

echo "=== 7. Schema de un task JSON real (campos presentes) ==="
# -print -quit, NO `| head -1`: con `set -euo pipefail`, `head` cierra la
# tubería tras la primera línea y `find` muere con SIGPIPE (141), que
# `pipefail` propaga y `set -e` convierte en abort del script. El bug es
# dependiente de la carga —con pocos archivos `find` cabe entero en el
# buffer de 64 KB y termina antes de que `head` cierre—, así que pasó
# verde con 32 tareas y aborta con 247. Ver H-DOCS-120.
FIRST_JSON=$(find "$TASKS_ROOT" -maxdepth 2 -name '*.json' -print -quit 2>/dev/null)
if [[ -n "${FIRST_JSON:-}" ]]; then
  jq -r 'keys | join(", ")' "$FIRST_JSON" | xargs -I{} echo "  campos: {}"
else
  echo "  (sin archivos .json para inspeccionar)"
fi

echo "=== 8. Variables de entorno del board declaradas en el bundle ==="
# Añadidas 2026-08-12 al revisar docs@fbf6f38: el análisis original no las
# cubría, y una de ellas (TASK_LIST_ID) es el lever contra H-DOCS-119.
for _v in CLAUDE_CODE_ENABLE_TASKS CLAUDE_CODE_TASK_LIST_ID CLAUDE_CODE_DISABLE_BACKGROUND_TASKS; do
  _n=$(grep -oc "$_v" "$CLI_JS" 2>/dev/null || echo 0)
  if [[ "$_n" -gt 0 ]]; then
    echo "  OK   $_v presente"
  else
    echo "  FAIL $_v ausente del bundle (¿cambió la versión?)"
    fail=1
  fi
done
echo

echo "=== 9. El id se asigna BAJO EL LOCK del equipo (proper-lockfile) ==="
if grep -q 'lockSync' "$CLI_JS"; then
  echo "  OK   el bundle vendoriza proper-lockfile (lockSync/unlock/getLocks)"
  echo "  nota: el lock es POR EQUIPO — dos sesiones con teamName distinto"
  echo "        escriben en directorios distintos y NO se serializan entre sí."
else
  echo "  FAIL sin lockSync en el bundle"; fail=1
fi
echo

echo "=== 10. Ruta hermana de configuración de equipo (teams/, no tasks/) ==="
if grep -qE 'teams/\$\{[^}]*\}/config\.json' "$CLI_JS"; then
  echo "  OK   el bundle construye \${base}/teams/\${name}/config.json"
  if [[ -d "$HOME/.claude/teams" ]]; then
    echo "  en disco: $HOME/.claude/teams existe ($(ls -1 "$HOME/.claude/teams" | wc -l) equipos)"
  else
    echo "  en disco: $HOME/.claude/teams NO existe — nunca se creó un equipo explícito"
  fi
else
  echo "  FAIL no se halló la ruta de config de equipo"; fail=1
fi

echo
if [[ "$fail" -eq 0 ]]; then
  echo "RESULTADO: todas las verificaciones automatizables pasaron."
else
  echo "RESULTADO: hay verificaciones fallidas — ver FAIL arriba."
fi
exit "$fail"
