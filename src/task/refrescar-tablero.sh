#!/usr/bin/env bash
# DEPRECATED: 2026-09-05 — reasignó 92 citation_id al escribir sobre la sesión viva
# SUCESOR: .claude/scripts/task/refresh-board.sh (tarea #94)
# HALLAZGO: H-DOCS-1042
# refrescar-tablero.sh — el sucesor de `snapshot-tasks.sh`, en un solo comando.
#
# Por qué existe
# --------------
# El registro canónico se produce en DOS pasos: `agent_store.py snapshot-tareas`
# vuelca el directorio vivo de tareas al store, y `render-tablero` renderiza
# DESDE el store. El hook del tablero los encadena; a mano nadie lo hacía, y
# quien invoca sólo el segundo obtiene un tablero **desfasado en silencio** —
# plausible, con su fecha nueva, y sin las tareas creadas desde el último
# volcado. Ocurrió: dos tareas recién creadas no aparecieron, y el renderizador
# lo dijo en su salida sin que nadie lo leyera.
#
# El deprecado hacía leer-y-escribir en un solo paso, y ésa es la propiedad que
# se perdió al reemplazarlo. Este guion la repone sobre el mecanismo correcto.
#
# Qué hace, y qué NO hace
# ------------------------
#   (a) resolver el directorio vivo con la prioridad del cliente     → SÍ
#   (b) volcar ese directorio al store y renderizar desde él         → SÍ
#   (c) REHUSAR si no hay directorio vivo que volcar                 → SÍ
#   (d) inventar un tablero cuando la fuente no está                 → NO
#
# El punto (c) es la diferencia que importa. Un tablero renderizado sin volcar
# no se distingue de uno correcto salvo por lo que le falta, y lo que le falta
# es justo lo más reciente. Antes que publicar eso, el guion se niega.
set -uo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/../deprecated.sh"
deprecated_guard refrescar-tablero.sh

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
STORE_CLI="$RAIZ/.claude/scripts/agents/agent_store.py"
CLAUDE_HOME="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
TASKS_ROOT="${CLAUDE_TASKS_ROOT:-$CLAUDE_HOME/tasks}"

CLAUDE_DIR="$RAIZ/.claude/agent-results"
SALIDA="$RAIZ/source/gestion/pm/reportes/tablero-de-tareas.rst"
TEAM_NAME="${CLAUDE_CODE_TASK_LIST_ID:-${CLAUDE_CODE_TEAM_NAME:-}}"

usage() {
    cat <<'USO'
Uso: refrescar-tablero.sh [-t team] [--claude-dir DIR] [-o archivo.rst]

Vuelca el directorio vivo de tareas al store y renderiza el tablero desde él,
en un solo paso. Rehúsa (exit 2) si no hay directorio vivo que volcar.

  -t, --team         team/sesión a volcar (default: la variable del cliente,
                     y si no, el directorio de tareas más reciente)
      --claude-dir   directorio del store (default: .claude/agent-results)
  -o, --salida       destino del .rst (default: el registro del repo)
USO
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -t|--team)       TEAM_NAME="$2"; shift 2 ;;
        --claude-dir)    CLAUDE_DIR="$2"; shift 2 ;;
        -o|--salida)     SALIDA="$2"; shift 2 ;;
        -h|--help)       usage; exit 0 ;;
        *) echo "refrescar-tablero.sh: opción desconocida: $1" >&2; usage >&2; exit 2 ;;
    esac
done

[[ -f "$STORE_CLI" ]] || {
    echo "refrescar-tablero.sh: no existe $STORE_CLI" >&2; exit 2; }

# Misma prioridad que el hook y que el deprecado: variable declarada primero,
# heurística de mtime después. No se reinventa la resolución.
if [[ -z "$TEAM_NAME" ]]; then
    TEAM_NAME=$(find "$TASKS_ROOT" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %f\n' \
        2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
fi

TEAM_DIR="$TASKS_ROOT/${TEAM_NAME:-}"
if [[ -z "$TEAM_NAME" || ! -d "$TEAM_DIR" ]]; then
    echo "refrescar-tablero.sh: no hay directorio vivo de tareas bajo $TASKS_ROOT" >&2
    echo "  NO se renderiza: un tablero sin volcar es indistinguible de uno" >&2
    echo "  correcto salvo por lo que le falta, que es lo más reciente." >&2
    exit 2
fi

VIVAS=$(find "$TEAM_DIR" -maxdepth 1 -name '*.json' 2>/dev/null | wc -l)
if [[ "$VIVAS" -eq 0 ]]; then
    echo "refrescar-tablero.sh: $TEAM_DIR existe y está vacío — no se renderiza" >&2
    exit 2
fi

echo "refrescar-tablero.sh: $VIVAS tarea(s) en el directorio vivo ($TEAM_DIR)"

python3 "$STORE_CLI" snapshot-tareas \
    --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$TEAM_DIR" \
    --session-id "$TEAM_NAME" \
    --source refrescar-tablero || {
        echo "refrescar-tablero.sh: falló el volcado — NO se renderiza" >&2; exit 1; }

python3 "$STORE_CLI" render-tablero \
    --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$TEAM_DIR" \
    --session-id "$TEAM_NAME" \
    -o "$SALIDA"
