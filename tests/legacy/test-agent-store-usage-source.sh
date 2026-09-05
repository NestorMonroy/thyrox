#!/usr/bin/env bash
# Pruebas del discriminador de medición de tokens — `usage_source` (H-DOCS-427).
#
# El defecto que cierra: las cuatro columnas de token nacen NULL, y un
# consumidor que sume NULL como 0 no distingue «este agente no gastó» de
# «nadie midió a este agente». Medido al escribirlas: 356 de 669 filas del
# store real estaban en ese caso, y ninguna conservaba su transcript en disco.
#
# CONTROL POSITIVO REAL DEL REPO (no fabricado — `hallazgo-abierto-genera-sucesor.md`):
# el agente `a4f025f855776a36b` existe en el store real, está `failed`, no
# tiene tokens y SÍ conserva su transcript en disco. Es la única fila que la
# clasificación deja en NULL, y por eso es la prueba de que la tercera
# condición —«sin transcript»— discrimina de verdad en vez de marcar todo lo
# que no tenga tokens. El caso 4 lo reproduce con la misma forma.
#
# Y el control que PUEDE FALLAR (sub-patrón D de `metrica-decide-la-conclusion.md`):
# el caso 6 anula el discriminador —pone `usage_source` en NULL para todas—
# y comprueba que el censo DEJA de separar los cubos. Sin ese caso, los cinco
# anteriores pasarían igual con una columna que nadie consulta.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

STORE=.claude/scripts/agents/agent_store.py
RECONCILIAR=.claude/scripts/agents/reconciliar_store.py
OK=0; FALLO=0

afirmar() {
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
CLAUDE_DIR="$TMP/agent-results"
PROJECTS="$TMP/projects/-arbol/sesion/subagents"
mkdir -p "$CLAUDE_DIR" "$PROJECTS"
DB="$CLAUDE_DIR/agent_store.sqlite3"

consulta() { python3 -c "
import sqlite3, sys
c = sqlite3.connect('$DB')
print(c.execute(sys.argv[1]).fetchone()[0])
" "$1"; }

echo "== Caso 1: el migrado añade la columna sobre un esquema que ya existía"
# Esquema VIEJO a propósito: sin `usage_source`, con las cuatro de token. Es el
# caso real — el store de producción ya tenía 669 filas cuando se declaró.
python3 - "$DB" <<'PY'
import sqlite3, sys
c = sqlite3.connect(sys.argv[1])
c.execute("""CREATE TABLE agent_sessions (
    agent_id TEXT PRIMARY KEY, subagent_type TEXT NOT NULL,
    session_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('running','completed','failed')),
    output_key TEXT, started_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    timeout_at TEXT, input_tokens INTEGER, cache_creation_tokens INTEGER,
    cache_read_tokens INTEGER, output_tokens INTEGER, equiv_cost INTEGER)""")
filas = [
    # medida con valores > 0
    ("medida",      "completed", 10, 20, 30, 40, 100),
    # medida y con cache_read = 0 — el caso que un instrumento ingenuo
    # («tokens falsy => no medido») colapsaría con la no medida
    ("medida_cero", "completed", 10, 20,  0, 40, 100),
    # terminal, sin tokens, y (más abajo) sin transcript: irrecuperable
    ("perdida",     "completed", None, None, None, None, None),
    # terminal, sin tokens, PERO con transcript: todavía medible
    ("medible",     "failed",    None, None, None, None, None),
    # viva: no se cierra nada sobre ella
    ("viva",        "running",   None, None, None, None, None),
]
c.executemany("INSERT INTO agent_sessions (agent_id, subagent_type, session_id,"
              " status, started_at, updated_at, input_tokens,"
              " cache_creation_tokens, cache_read_tokens, output_tokens,"
              " equiv_cost) VALUES (?,'t','s',?,'2026-01-01','2026-01-01',?,?,?,?,?)",
              [(f[0], f[1], *f[2:]) for f in filas])
c.commit()
PY
# El transcript de `medible` — y sólo de él. Es lo que separa «todavía no» de
# «ya no», así que el fixture lo declara explícitamente en vez de suponerlo.
echo '{}' > "$PROJECTS/agent-medible.jsonl"

# Cualquier subcomando dispara el migrado; `censo-medicion` además lo lee.
python3 "$STORE" censo-medicion --claude-dir "$CLAUDE_DIR" >/dev/null 2>&1
afirmar "la columna usage_source existe tras el migrado" \
    "1" "$(consulta "SELECT COUNT(*) FROM pragma_table_info('agent_sessions') WHERE name='usage_source'")"

echo "== Caso 2: el relleno declara 'transcript' SÓLO donde hay tokens"
afirmar "las 2 filas con tokens quedan en 'transcript'" \
    "2" "$(consulta "SELECT COUNT(*) FROM agent_sessions WHERE usage_source='transcript'")"
afirmar "la fila con cache_read=0 NO se confunde con una sin medir" \
    "transcript" "$(consulta "SELECT usage_source FROM agent_sessions WHERE agent_id='medida_cero'")"
afirmar "las 3 sin tokens siguen sin clasificar tras el migrado" \
    "3" "$(consulta "SELECT COUNT(*) FROM agent_sessions WHERE usage_source IS NULL")"

echo "== Caso 3: la reconciliación declara 'no_medido' lo irrecuperable"
python3 "$RECONCILIAR" --quiet --claude-dir "$CLAUDE_DIR" \
    --projects-dir "$TMP/projects" >/dev/null 2>&1
afirmar "'perdida' (terminal, sin tokens, sin transcript) queda no_medido" \
    "no_medido" "$(consulta "SELECT usage_source FROM agent_sessions WHERE agent_id='perdida'")"

echo "== Caso 4: lo que TODAVÍA se puede medir NO se declara perdido"
# Ésta es la condición que discrimina. Sin ella, la marca sería «no tiene
# tokens» y borraría la diferencia entre una deuda pendiente y una pérdida.
afirmar "'medible' (terminal, sin tokens, CON transcript) sigue en NULL" \
    "None" "$(consulta "SELECT usage_source FROM agent_sessions WHERE agent_id='medible'" | sed 's/^$/None/')"

echo "== Caso 5: un agente vivo no se cierra"
afirmar "'viva' (running) sigue en NULL" \
    "None" "$(consulta "SELECT usage_source FROM agent_sessions WHERE agent_id='viva'" | sed 's/^$/None/')"

echo "== Caso 6: control anulable — sin discriminador, el censo deja de separar"
CENSO_VIVO=$(python3 "$STORE" censo-medicion --claude-dir "$CLAUDE_DIR")
afirmar "con discriminador, el censo declara el n del agregado" \
    "1" "$(grep -c 'n = 2 de 5' <<<"$CENSO_VIVO")"
afirmar "con discriminador, el censo nombra la fila irrecuperable" \
    "1" "$(grep -c "irrecuperable (usage_source='no_medido'): 1" <<<"$CENSO_VIVO")"
# Se anula el discriminador y NADA MÁS, y se vuelve a censar. Lo que el
# siguiente censo recupere solo es lo que el store puede RECONSTRUIR; lo que no
# recupere es información que sólo existía en la marca.
#
# Y el resultado es el que interesa: 'transcript' vuelve —el relleno lo deriva
# de los tokens presentes— pero 'no_medido' NO. Esa asimetría es la prueba de
# que la tercera condición mide el filesystem y no la tabla: si `no_medido`
# fuera deducible de las columnas de token, volvería con las otras, y entonces
# la marca no estaría aportando nada que un `SELECT` no supiera ya.
python3 -c "
import sqlite3
c = sqlite3.connect('$DB')
c.execute('UPDATE agent_sessions SET usage_source = NULL')
c.commit()"
CENSO_CIEGO=$(python3 "$STORE" censo-medicion --claude-dir "$CLAUDE_DIR")
afirmar "anulado, el relleno reconstruye 'transcript' desde los tokens" \
    "1" "$(grep -c 'n = 2 de 5' <<<"$CENSO_CIEGO")"
afirmar "anulado, 'no_medido' NO vuelve: no es deducible de la tabla" \
    "1" "$(grep -c "irrecuperable (usage_source='no_medido'): 0" <<<"$CENSO_CIEGO")"
afirmar "anulado, la fila perdida cae al cubo 'sin clasificar'" \
    "1" "$(grep -c 'sin clasificar todavía (usage_source NULL, sin tokens): 3' <<<"$CENSO_CIEGO")"

echo
echo "usage_source: $OK ok, $FALLO fallos"
[[ $FALLO -eq 0 ]]
