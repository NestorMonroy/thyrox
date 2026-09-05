#!/usr/bin/env bash
# Pruebas de refrescar-tablero.sh — el sucesor de snapshot-tasks.sh.
#
# El control positivo es el defecto real de esta sesión: se invocó
# `agent_store.py render-tablero` a solas y el tablero salió sin las dos tareas
# recién creadas, porque `render-tablero` lee el store y el volcado del
# directorio vivo es OTRO comando. El caso 3 reproduce exactamente eso.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GUION="$RAIZ/.claude/scripts/task/refrescar-tablero.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# El guion está DEPRECATED desde H-DOCS-1042 (reasignó 92 `citation_id`).
# La suite lo invoca a sabiendas: mide el mecanismo, no autoriza su uso.
# El caso 0 comprueba que sin esta declaración el guard SÍ rehúsa — sin él,
# la escotilla abierta haría verde una suite que ya no mide el guard.
export ACCEPT_DEPRECATED=refrescar-tablero.sh

OK=0; FALLO=0
afirmar() { # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then OK=$((OK + 1)); printf '  ok   %s\n' "$1"
    else FALLO=$((FALLO + 1)); printf '  FALLA %s — esperado [%s] obtenido [%s]\n' "$1" "$2" "$3"; fi
}

STORE="$TMP/store"; mkdir -p "$STORE"
VIVO="$TMP/tasks/equipo-x"; mkdir -p "$VIVO"
SALIDA="$TMP/tablero.rst"

tarea() { # tarea <id> <subject>
    printf '{"id":"%s","subject":"%s","status":"pending","description":"d"}\n' \
        "$1" "$2" > "$VIVO/$1.json"
}

# ---------------------------------------------------------------- caso 0
# CONTROL de la escotilla: sin `ACCEPT_DEPRECATED` el guard REHÚSA (exit 3).
# Sin este caso, la escotilla exportada arriba dejaría la suite verde aunque
# el guard hubiera desaparecido — el verde que no discrimina.
SALIDA_GUARD=$(env -u ACCEPT_DEPRECATED CLAUDE_TASKS_ROOT="$TMP/tasks" \
    bash "$GUION" --claude-dir "$STORE" -o "$TMP/no-debe-existir.rst" 2>&1)
afirmar "sin la escotilla el guard rehúsa (exit 3)" "3" "$?"
afirmar "y nombra su término" "1" \
    "$(grep -qF 'DEPRECATED — refrescar-tablero.sh' <<<"$SALIDA_GUARD" && echo 1 || echo 0)"
afirmar "y no escribió tablero" "0" \
    "$([ -f "$TMP/no-debe-existir.rst" ] && echo 1 || echo 0)"

# ---------------------------------------------------------------- caso 1
# CONTROL: sin directorio vivo REHÚSA, y no deja un tablero desfasado. Es lo
# que haría fallar al guion si alguien lo relajara a «renderiza igual».
CLAUDE_TASKS_ROOT="$TMP/no-existe" bash "$GUION" \
    --claude-dir "$STORE" -o "$SALIDA" >/dev/null 2>&1
afirmar "rehúsa sin directorio vivo (exit 2)" "2" "$?"
afirmar "y no escribió tablero" "0" "$([ -f "$SALIDA" ] && echo 1 || echo 0)"

# ---------------------------------------------------------------- caso 2
tarea 1 "primera tarea"
CLAUDE_TASKS_ROOT="$TMP/tasks" bash "$GUION" \
    --claude-dir "$STORE" -o "$SALIDA" >/dev/null 2>&1
afirmar "corre con directorio vivo (exit 0)" "0" "$?"
afirmar "y escribió el tablero" "1" "$([ -f "$SALIDA" ] && echo 1 || echo 0)"

# ---------------------------------------------------------------- caso 3
# EL DEFECTO REAL: una tarea que sólo está en el directorio vivo aparece en el
# tablero. Con `render-tablero` a solas no aparecería — el store no la tiene.
tarea 2 "tarea nacida despues del ultimo volcado"
CLAUDE_TASKS_ROOT="$TMP/tasks" bash "$GUION" \
    --claude-dir "$STORE" -o "$SALIDA" >/dev/null 2>&1
afirmar "la tarea nueva llega al tablero" "1" \
    "$(grep -c 'tarea nacida despues del ultimo volcado' "$SALIDA")"

# ---------------------------------------------------------------- caso 4
# El team declarado por variable gana sobre la heurística de mtime.
mkdir -p "$TMP/tasks/equipo-y"
printf '{"id":"9","subject":"solo en equipo y","status":"pending","description":"d"}\n' \
    > "$TMP/tasks/equipo-y/9.json"
CLAUDE_TASKS_ROOT="$TMP/tasks" CLAUDE_CODE_TASK_LIST_ID=equipo-y \
    bash "$GUION" --claude-dir "$STORE" -o "$TMP/t2.rst" >/dev/null 2>&1
afirmar "respeta el team declarado" "1" "$(grep -c 'solo en equipo y' "$TMP/t2.rst")"

# ---------------------------------------------------------------- caso 5
# Un conteo sin denominador no es un resultado.
afirmar "publica el conteo del directorio vivo" "1" \
    "$(CLAUDE_TASKS_ROOT="$TMP/tasks" bash "$GUION" --claude-dir "$STORE" \
        -o "$SALIDA" 2>&1 | grep -c 'tarea(s) en el directorio vivo')"

# ---------------------------------------------------------------- caso 6
# El guion NO está deprecado: el gate no debe marcarlo.
afirmar "el gate de deprecación lo da por limpio" "0" \
    "$(python3 "$RAIZ/.claude/scripts/gates/check_script_deprecated.py" --quiet "$RAIZ")"

printf '\n%d ok · %d falla(s)\n' "$OK" "$FALLO"
[[ "$FALLO" -eq 0 ]]
