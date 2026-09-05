#!/usr/bin/env bash
# Pruebas de los dos ajustes tomados de TencentDB Agent Memory:
# src/core/store/sqlite.ts al revisar el archivo completo (2331 líneas)
# contra agent_store.py — H-DOCS-174.
#
# 1. Índices sobre columnas que YA se filtran/ordenan en el código real
#    (cmd_list_sessions filtra por status y ordena por started_at sin
#    índice) — adaptado de sqlite.ts:579-588 (idx_l1_type/idx_l1_ts_start).
# 2. Degradación de FTS5 aislada de las tablas núcleo — adaptado de
#    sqlite.ts:743-836 (bloque try/except que separa la creación de la
#    tabla virtual FTS5 del resto del schema). Antes de este split, un
#    SQLite sin fts5 compilado tumbaba TAMBIÉN registrar-sesion/
#    actualizar-sesion — no sólo la búsqueda.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

STORE=.claude/scripts/agents/agent_store.py
OK=0; FALLO=0

afirmar() {  # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

echo "== 1. sintaxis =="
python3 -c "import ast; ast.parse(open('$STORE').read())"; afirmar "agent_store.py parsea" 0 $?

TMP=$(mktemp -d)
python3 "$STORE" init --claude-dir "$TMP/.claude/agent-results" >/dev/null
DB="$TMP/.claude/agent-results/agent_store.sqlite3"

echo "== 2. los índices declarados en CORE_SCHEMA existen de verdad =="
IDX=$(python3 -c "
import sqlite3
conn = sqlite3.connect('$DB')
names = {r[0] for r in conn.execute(
    \"SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='agent_sessions'\")}
print(','.join(sorted(names)))
")
afirmar "idx_agent_sessions_status creado" "true" "$([[ "$IDX" == *idx_agent_sessions_status* ]] && echo true || echo false)"
afirmar "idx_agent_sessions_started_at creado" "true" "$([[ "$IDX" == *idx_agent_sessions_started_at* ]] && echo true || echo false)"

echo "== 3. caso normal: fts5 disponible, buscar-hallazgos funciona =="
python3 "$STORE" agregar-hallazgo --claude-dir "$TMP/.claude/agent-results" \
    --finding-id H-TEST-99 --submodule docs --initiative x \
    --summary "resumen de prueba de degradacion fts5" --content "contenido" >/dev/null
SALIDA=$(python3 "$STORE" buscar-hallazgos --claude-dir "$TMP/.claude/agent-results" --query "degradacion" 2>&1)
afirmar "buscar-hallazgos encuentra el hallazgo recien indexado" "true" "$(echo "$SALIDA" | grep -q "H-TEST-99" && echo true || echo false)"

echo "== 4. simular un SQLite sin fts5 compilado (control positivo, no fabricado a mano) =="
# Fuerza el mismo sqlite3.OperationalError que "no such module: fts5"
# produciría, apuntando FTS_SCHEMA a un módulo de tabla virtual inexistente
# — no un mock: es el mismo camino de código y la misma excepción real.
RESULTADO=$(python3 - "$TMP" <<'PY'
import importlib.util, sys
from pathlib import Path

tmp = Path(sys.argv[1])
spec = importlib.util.spec_from_file_location("agent_store", ".claude/scripts/agents/agent_store.py")
agent_store = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent_store)
agent_store.FTS_SCHEMA = (
    "CREATE VIRTUAL TABLE IF NOT EXISTS findings_fts USING modulo_inexistente_fts5(x);"
)

store_dir = tmp / ".claude" / "agent-results-degradado"
conn = agent_store.connect(store_dir)
print("fts_available=" + str(agent_store.fts_available(conn)))

conn.execute(
    "INSERT INTO agent_sessions (agent_id, subagent_type, session_id, status, started_at, updated_at) "
    "VALUES ('AGX','general-purpose','SX','completed','2026-01-01T00:00:00','2026-01-01T00:00:00')"
)
conn.execute(
    "INSERT INTO findings_history (finding_id, submodule, initiative, summary, content, created_at, updated_at) "
    "VALUES ('H-TEST-DEGR','docs','x','r','c','2026-01-01T00:00:00','2026-01-01T00:00:00')"
)
conn.commit()
print("agent_sessions_rows=" + str(conn.execute("SELECT COUNT(*) FROM agent_sessions").fetchone()[0]))
print("findings_history_rows=" + str(conn.execute("SELECT COUNT(*) FROM findings_history").fetchone()[0]))
conn.close()

import argparse
ns = argparse.Namespace(claude_dir=str(store_dir), repo="docs", query="lo que sea", limit=5)
try:
    agent_store.cmd_search_findings(ns)
    print("search_exit=0")
except SystemExit as e:
    print("search_exit=" + str(e.code))

recall_output = []
import io, contextlib
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    agent_store.cmd_auto_recall(ns)
print("auto_recall_output_empty=" + str(buf.getvalue() == ""))
PY
)

afirmar "fts_available() es False cuando fts5 falla al crearse" "fts_available=False" "$(echo "$RESULTADO" | grep '^fts_available=')"
afirmar "agent_sessions sigue aceptando escrituras sin fts5" "agent_sessions_rows=1" "$(echo "$RESULTADO" | grep '^agent_sessions_rows=')"
afirmar "findings_history sigue aceptando escrituras sin fts5" "findings_history_rows=1" "$(echo "$RESULTADO" | grep '^findings_history_rows=')"
afirmar "buscar-hallazgos sale con error controlado (exit 1), no traceback" "search_exit=1" "$(echo "$RESULTADO" | grep '^search_exit=')"
afirmar "auto-recall (hook) queda en silencio, no revienta el turno" "auto_recall_output_empty=True" "$(echo "$RESULTADO" | grep '^auto_recall_output_empty=')"

rm -rf "$TMP"

echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))
