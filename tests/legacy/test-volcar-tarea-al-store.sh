#!/bin/bash
# =============================================================================
# test-volcar-tarea-al-store.sh — prueba del hook PostToolUse de #454
# =============================================================================
#
# Todo corre sobre COPIAS DESECHABLES: el hook recibe `KX_DOCS_DIR`,
# `CLAUDE_HOME`, `KX_STORE_DIR` y `CLAUDE_CODE_TASK_LIST_ID` apuntando a un
# temporal. Ni el store real ni el directorio de tareas del cliente se tocan.
#
# El caso 3 es el que importa, y su control positivo NO se fabrica: reproduce
# el episodio que originó la pieza —una ficha que en disco dice `completed`
# mientras el store la tiene `pending`—. El caso 4 demuestra que ese control
# PUEDE FALLAR: con el volcado anulado sobre una copia del hook, la ficha se
# queda `pending` y el caso 3 se volvería rojo. Un verde que no distingue «el
# hook volcó» de «el test no pregunta» no es evidencia (sub-patrón D de
# `metrica-decide-la-conclusion.md`).
#
# Uso:  bash .claude/scripts/tests/test-volcar-tarea-al-store.sh
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"   # .claude/
RAIZ="$(cd "$SCRIPT_DIR/.." && pwd)"                               # repo
SUT="$SCRIPT_DIR/hooks/volcar-tarea-al-store.sh"

PASS=0; FAIL=0
check() {
  if [[ "$2" == "$3" ]]; then
    PASS=$(( PASS + 1 )); printf '  ok    %s\n' "$1"
  else
    FAIL=$(( FAIL + 1 )); printf '  FALLA %s\n        esperado: %s\n        obtenido: %s\n' "$1" "$2" "$3"
  fi
}

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
TEAM=sesion-de-prueba
TEAM_DIR="$TMP/claude/tasks/$TEAM"
# El directorio se llama `agent-results` a propósito: el CLI usa verbatim el
# `--claude-dir` cuyo basename ya es ése, y en cualquier otro le anexa
# `agent-results/`. Nombrarlo distinto mediría un archivo que el hook no
# escribe — y el verde sería del test, no del mecanismo.
STORE_DIR="$TMP/store/agent-results"
mkdir -p "$TEAM_DIR" "$STORE_DIR"

# Escribe una ficha de tarea con el estado dado.
ficha() {   # ficha <id> <status> <subject>
  printf '{"id": "%s", "status": "%s", "subject": "%s", "description": "de prueba"}\n' \
    "$1" "$2" "$3" > "$TEAM_DIR/$1.json"
}

# Dispara el hook tal como lo haría PostToolUse, con el payload por stdin.
disparar() {   # disparar [guion-alternativo]
  printf '{"tool_name":"TaskUpdate","tool_input":{}}' | \
    KX_DOCS_DIR="$RAIZ" CLAUDE_HOME="$TMP/claude" KX_STORE_DIR="$STORE_DIR" \
    CLAUDE_CODE_TASK_LIST_ID="$TEAM" bash "${1:-$SUT}"
}

# Lee el status que el store guarda para una tarea (o AUSENTE).
en_store() {   # en_store <id>
  python3 -c "
import sqlite3, sys, pathlib
p = pathlib.Path('$STORE_DIR/agent_store.sqlite3')
if not p.exists(): print('SIN STORE'); sys.exit()
c = sqlite3.connect(p)
r = c.execute('select status from tasks where task_id=?', (sys.argv[1],)).fetchone()
print(r[0] if r else 'AUSENTE')" "$1" 2>&1
}

echo "== 1. la ficha del cliente aterriza en el store =="
ficha 9001 pending "Tarea sintetica de prueba"
OUT=$(disparar); RC=$?
check "primer disparo -> exit 0" "0" "$RC"
check "contrato del hook: stdout es {}" "{}" "$OUT"
check "la fila existe con su estado" "pending" "$(en_store 9001)"

echo "== 2. el segundo disparo no cambia nada (idempotencia) =="
ANTES=$(en_store 9001)
OUT=$(disparar); RC=$?
check "segundo disparo -> exit 0" "0" "$RC"
check "el estado no se altera" "$ANTES" "$(en_store 9001)"

echo "== 3. control positivo REAL: el estado cambia en disco y el store lo sigue =="
# Es el episodio de #711/#712: la ficha ya decia `completed` y el store seguia
# en `pending` porque el volcado sólo corria en `Stop`.
ficha 9001 completed "Tarea sintetica de prueba"
check "en disco quedó completed, en store aún pending" "pending" "$(en_store 9001)"
disparar >/dev/null
check "tras el disparo, el store propaga el estado" "completed" "$(en_store 9001)"

echo "== 4. el control del control: con el volcado anulado, NO propaga =="
# Un verde que no puede volverse rojo no informa. Se rompe el volcado sobre una
# COPIA del hook y se comprueba que el estado se queda atrás.
sed 's|^STORE_CLI=.*|STORE_CLI="/inexistente/agents/agent_store.py"|' "$SUT" > "$TMP/sut_sin_volcado.sh"
ficha 9002 pending "Segunda tarea sintetica"
disparar "$TMP/sut_sin_volcado.sh" >/dev/null
check "sin volcado, la ficha nueva no llega al store" "AUSENTE" "$(en_store 9002)"
disparar >/dev/null
check "con el hook intacto, sí llega" "pending" "$(en_store 9002)"

echo "== 5. sin directorio de tareas: calla y no escribe =="
VACIO=$(mktemp -d)
OUT=$(printf '{}' | KX_DOCS_DIR="$RAIZ" CLAUDE_HOME="$VACIO" KX_STORE_DIR="$STORE_DIR" \
      CLAUDE_CODE_TASK_LIST_ID="$TEAM" bash "$SUT"); RC=$?
check "sin tasks/ -> exit 0" "0" "$RC"
check "sin tasks/ -> stdout {}" "{}" "$OUT"
rm -rf "$VACIO"

echo "== 6. un payload ilegible no rompe la herramienta que acaba de correr =="
OUT=$(printf 'esto no es JSON' | KX_DOCS_DIR="$RAIZ" CLAUDE_HOME="$TMP/claude" \
      KX_STORE_DIR="$STORE_DIR" CLAUDE_CODE_TASK_LIST_ID="$TEAM" bash "$SUT"); RC=$?
check "payload ilegible -> exit 0" "0" "$RC"
check "payload ilegible -> stdout {}" "{}" "$OUT"

echo
echo "resultado: $PASS aserciones en verde, $FAIL en rojo"
(( FAIL == 0 )) || exit 1
