#!/usr/bin/env bash
# Sondas de solo lectura para #301 (qué garantiza task_highwater). No escriben en ninguna base.
set -uo pipefail
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$root" || exit 2
store=agent-results/agent_store.sqlite3
# Sin el cliente sqlite3 en el contenedor: lectura con el módulo de Python, en modo de sólo lectura.
sqlite3() {
  shift
  local db="$1"; shift
  python3 - "$db" "$@" <<'PY'
import sqlite3, sys
con = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True)
for q in sys.argv[2:]:
    try:
        for row in con.execute(q):
            print("|".join("" if v is None else str(v) for v in row))
    except sqlite3.Error as e:
        print(f"error|{e}", file=sys.stderr); sys.exit(1)
PY
}
case "$1" in
  live-store)
    sqlite3 -readonly "$store" "SELECT 'tabla_highwater', count(*) FROM sqlite_master WHERE name='task_highwater';" \
      "SELECT 'max_task_id_numerico', max(CAST(task_id AS INTEGER)) FROM tasks WHERE task_id GLOB '[0-9]*';" \
      "SELECT 'filas_tasks', count(*) FROM tasks;" \
      "SELECT 'sesiones_con_filas', count(DISTINCT session_id) FROM tasks;" 2>&1 | tr '|' '\t'
    sqlite3 -readonly "$store" "SELECT 'highwater', clave, max_id FROM task_highwater;" 2>&1 | tr '|' '\t' ;;
  ordinal-collisions)
    sqlite3 -readonly "$store" "SELECT 'ids_repetidos_entre_sesiones', count(*) FROM (SELECT task_id FROM tasks GROUP BY task_id HAVING count(DISTINCT session_id) > 1);" \
      "SELECT 'ids_distintos', count(DISTINCT task_id) FROM tasks;" 2>&1 | tr '|' '\t' ;;
  schema-history)
    sqlite3 -readonly "$store" "SELECT 'tablas', group_concat(name, ',') FROM sqlite_master WHERE type='table';" 2>&1 | tr '|' '\t'
    for t in schema_migrations migrations schema_version; do
      sqlite3 -readonly "$store" "SELECT 'historia_$t', count(*) FROM $t;" 2>/dev/null | tr '|' '\t'
    done
    printf 'python_menciona_highwater\t%s\n' "$(git grep -c task_highwater -- src/agents/agent_store.py 2>/dev/null | cut -d: -f2 || echo 0)" ;;
  write-atomicity)
    printf 'begin_immediate_en_tasks_ts\t%s\n' "$(grep -cE 'BEGIN IMMEDIATE|\.transaction\(' src/packages/tools/src/tasks.ts)"
    printf 'lineas_siguienteOrdinal\t%s\n' "$(grep -n 'siguienteOrdinal(db)' src/packages/tools/src/tasks.ts | cut -d: -f1 | tr '\n' ',')"
    printf 'lineas_subirMarca\t%s\n' "$(grep -n 'subirMarca(db' src/packages/tools/src/tasks.ts | cut -d: -f1 | tr '\n' ',')" ;;
  tests)
    printf 'pruebas_que_nombran_highwater\t%s\n' "$(git grep -l -e task_highwater -e TASK_HIGHWATER -e subirMarca -e highwater -- src/packages tests ':!src/packages/*/src' | tr '\n' ',')" ;;
  reference)
    f="$(git grep -l 'highwatermark' -- '_references/claude-code-bin/2.1.283' 2>/dev/null | head -1)"
    printf 'referencia_archivo\t%s\n' "${f:-ninguno en 2.1.283}"
    [[ -n "$f" ]] && grep -oE '.{0,160}highwatermark.{0,200}' "$f" | head -2 | sed 's/^/referencia_contexto\t/' ;;
  *) echo "sonda desconocida: $1" >&2; exit 2 ;;
esac
