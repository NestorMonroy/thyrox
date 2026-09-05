#!/usr/bin/env bash
# refresh-board.sh — el sucesor de `refrescar-tablero.sh` (tarea #94).
#
# Qué cambia respecto del deprecado
# ---------------------------------
# El deprecado tenía DOS estados: volcar-y-renderizar, o rehusar. Con el guard
# de reasignación de cita en pie (H-DOCS-1042), «volcar» dejó de ser posible en
# la sesión viva, así que el único estado alcanzable pasó a ser rehusar — y el
# tablero quedó **congelado y mudo**: su `.rst` sigue ahí, con su fecha, sin
# decir que le falta nada.
#
# Un tablero congelado y mudo es peor que uno que declara lo que le falta,
# porque los dos se leen igual. Este guion añade el estado que faltaba:
#
#   1. volcar no reasigna    -> volcar y renderizar            (pleno)
#   2. volcar reasignaría    -> NO volcar; renderizar DECLARANDO la diferencia
#   3. sin directorio vivo   -> rehusar                        (como antes)
#
# El estado 2 no inventa nada: `render-tablero` mide la misma colisión que el
# guard —las dos llaman a `citation_reassignments`— y emite un `.. warning::`
# en el propio `.rst` con el conteo y tres ejemplos. Que las dos midan con el
# mismo instrumento es lo que impide que el tablero diga «al día» sobre un
# volcado que el guard acaba de rechazar.
#
# Lo que este guion NO arregla: que el estado 2 sea el caso normal. Eso es la
# tarea #104 (anclar el `citation_id` al sujeto, no al ordinal). Aquí se
# contiene el daño, no se cierra la causa.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
STORE_CLI="$RAIZ/.claude/scripts/agents/agent_store.py"
CLAUDE_HOME="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
TASKS_ROOT="${CLAUDE_TASKS_ROOT:-$CLAUDE_HOME/tasks}"

CLAUDE_DIR="$RAIZ/.claude/agent-results"
SALIDA="$RAIZ/source/gestion/pm/reportes/tablero-de-tareas.rst"
TEAM_NAME="${CLAUDE_CODE_TASK_LIST_ID:-${CLAUDE_CODE_TEAM_NAME:-}}"
STRICT=0

usage() {
    cat <<'USO'
Uso: refresh-board.sh [-t team] [--claude-dir DIR] [-o archivo.rst] [--strict]

Refresca el tablero de tareas en uno de tres estados:

  0  pleno       — el volcado no movía citas: se volcó y se renderizó
  0  declarado   — el volcado movía citas: NO se volcó, y el .rst lo declara
  2  rehusado    — no hay directorio vivo que volcar

  -t, --team         team/sesión a volcar (default: la variable del cliente,
                     y si no, el directorio de tareas más reciente)
      --claude-dir   directorio del store (default: .claude/agent-results)
  -o, --salida       destino del .rst (default: el registro del repo)
      --strict       el estado «declarado» sale 5 en vez de 0, para un
                     llamador que quiera tratar la degradación como fallo.
                     La conducta del hook Stop es decisión aparte (#95).
USO
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -t|--team)       TEAM_NAME="$2"; shift 2 ;;
        --claude-dir)    CLAUDE_DIR="$2"; shift 2 ;;
        -o|--salida)     SALIDA="$2"; shift 2 ;;
        --strict)        STRICT=1; shift ;;
        -h|--help)       usage; exit 0 ;;
        *) echo "refresh-board.sh: opción desconocida: $1" >&2; usage >&2; exit 2 ;;
    esac
done

[[ -f "$STORE_CLI" ]] || {
    echo "refresh-board.sh: no existe $STORE_CLI" >&2; exit 2; }

# Misma prioridad que el hook y que el deprecado: variable declarada primero,
# heurística de mtime después. No se reinventa la resolución.
if [[ -z "$TEAM_NAME" ]]; then
    TEAM_NAME=$(find "$TASKS_ROOT" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %f\n' \
        2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
fi

TEAM_DIR="$TASKS_ROOT/${TEAM_NAME:-}"

# ---- Estado 3: sin directorio vivo -----------------------------------------
# Se rehúsa igual que antes, y por la misma razón: sin fuente que volcar, un
# render no se distingue de uno correcto salvo por lo que le falta.
if [[ -z "$TEAM_NAME" || ! -d "$TEAM_DIR" ]]; then
    echo "refresh-board.sh: no hay directorio vivo de tareas bajo $TASKS_ROOT" >&2
    echo "  NO se renderiza — no hay con qué contrastar el store." >&2
    exit 2
fi

VIVAS=$(find "$TEAM_DIR" -maxdepth 1 -name '*.json' 2>/dev/null | wc -l)
if [[ "$VIVAS" -eq 0 ]]; then
    echo "refresh-board.sh: $TEAM_DIR existe y está vacío — no se renderiza" >&2
    exit 2
fi

echo "refresh-board.sh: $VIVAS tarea(s) en el directorio vivo ($TEAM_DIR)"

# ---- Estados 1 y 2: los decide el guard, no este guion ----------------------
# El código 4 es el del guard de reasignación; cualquier otro fallo del volcado
# sí aborta, porque entonces no se sabe qué se escribió.
python3 "$STORE_CLI" snapshot-tareas \
    --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$TEAM_DIR" \
    --session-id "$TEAM_NAME" \
    --source refresh-board
SNAPSHOT=$?

DEGRADADO=0
case "$SNAPSHOT" in
    0) echo "refresh-board.sh: estado PLENO — el volcado no movía ninguna cita" ;;
    4) DEGRADADO=1
       echo "refresh-board.sh: estado DECLARADO — el volcado movería citas, así" >&2
       echo "  que NO se volcó. El .rst lo declara con su conteo y ejemplos;" >&2
       echo "  la causa es el ordinal como clave de cita (#104)." >&2 ;;
    *) echo "refresh-board.sh: el volcado falló con $SNAPSHOT — NO se renderiza" >&2
       exit 1 ;;
esac

# `--tasks-dir` va SIEMPRE, incluso en el estado pleno: es lo que permite al
# render medir la diferencia con el mismo instrumento que el guard.
python3 "$STORE_CLI" render-tablero \
    --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$TEAM_DIR" \
    --session-id "$TEAM_NAME" \
    -o "$SALIDA" || {
        echo "refresh-board.sh: falló el render" >&2; exit 1; }

if [[ "$DEGRADADO" -eq 1 && "$STRICT" -eq 1 ]]; then
    exit 5
fi
