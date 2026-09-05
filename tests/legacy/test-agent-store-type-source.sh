#!/usr/bin/env bash
# Pruebas del discriminador de procedencia del tipo — `type_source` (H-DOCS-481).
#
# El defecto que cierra: `subagent_type` cae a la cadena `desconocido` por dos
# causas distintas que hoy no se pueden separar —el payload no trajo la clave,
# o la trajo VACÍA— y el veredicto sobre a quién corresponde el defecto depende
# de cuál sea.
#
# La causa está medida en la fuente, no supuesta: el ejecutable construye el
# payload de `SubagentStop` con `agent_type: a ?? ""`, mientras el de
# `SubagentStart` pasa `agent_type: n` sin alternativa. Y `SubagentStart` no
# dispara en este entorno (:ref:`h-docs-167`), así que toda alta viene del
# primero — el que puede emitir la cadena vacía.
#
# CONTROL QUE PUEDE FALLAR (sub-patrón D de `metrica-decide-la-conclusion.md`):
# el caso 5 anula el discriminador —escribe `type_source` en NULL para todas—
# y comprueba que el conteo por procedencia DEJA de separar los dos cubos. Sin
# ese caso, los cuatro anteriores pasarían igual con una columna que nadie lee.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

STORE=.claude/scripts/agents/agent_store.py
HOOK=.claude/hooks/register_agent_session.py
OK=0; FALLO=0

afirmar() {
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
CLAUDE_DIR="$TMP/agent-results"; mkdir -p "$CLAUDE_DIR"
DB="$CLAUDE_DIR/agent_store.sqlite3"

consulta() { python3 -c "
import sqlite3, sys
c = sqlite3.connect('$DB')
f = c.execute(sys.argv[1]).fetchone()
print('' if f is None or f[0] is None else f[0])
" "$1"; }

alta() {  # alta <agent_id> <tipo-o-vacio>
    printf '{"hook_event_name":"SubagentStop","agent_id":"%s","agent_type":%s,"session_id":"s1"}' \
        "$1" "$2" | AGENT_STORE_CLAUDE_DIR="$CLAUDE_DIR" python3 "$HOOK" --stop >/dev/null 2>&1
}

echo "== Caso 1: el tipo viene en el payload -> type_source='payload'"
alta a1111111111111111 '"general-purpose"'
afirmar "el tipo aterriza"        "general-purpose" "$(consulta "select subagent_type from agent_sessions where agent_id='a1111111111111111'")"
afirmar "procedencia = payload"   "payload"         "$(consulta "select type_source from agent_sessions where agent_id='a1111111111111111'")"

echo "== Caso 2 (EL QUE DISCRIMINA): la fuente lo emite VACÍO"
# Es la forma real de `agent_type: a ?? ""`. Antes de esta columna, la fila
# quedaba idéntica a la del caso 3 y no había cómo saber cuál era cuál.
alta a2222222222222222 '""'
afirmar "el tipo cae a desconocido" "desconocido"      "$(consulta "select subagent_type from agent_sessions where agent_id='a2222222222222222'")"
afirmar "procedencia = vacio_en_origen" "vacio_en_origen" "$(consulta "select type_source from agent_sessions where agent_id='a2222222222222222'")"

echo "== Caso 3: la clave NO viene en el payload -> 'ausente'"
printf '{"hook_event_name":"SubagentStop","agent_id":"a3333333333333333","session_id":"s1"}' \
    | AGENT_STORE_CLAUDE_DIR="$CLAUDE_DIR" python3 "$HOOK" --stop >/dev/null 2>&1
afirmar "el tipo cae a desconocido" "desconocido" "$(consulta "select subagent_type from agent_sessions where agent_id='a3333333333333333'")"
afirmar "procedencia = ausente"     "ausente"     "$(consulta "select type_source from agent_sessions where agent_id='a3333333333333333'")"

echo "== Caso 4: los dos cubos se distinguen en el agregado"
afirmar "vacio_en_origen" "1" "$(consulta "select count(*) from agent_sessions where type_source='vacio_en_origen'")"
afirmar "ausente"         "1" "$(consulta "select count(*) from agent_sessions where type_source='ausente'")"
afirmar "payload"         "1" "$(consulta "select count(*) from agent_sessions where type_source='payload'")"

echo "== Caso 5 (CONTROL ANULADO): sin el discriminador los cubos colapsan"
python3 -c "
import sqlite3
c = sqlite3.connect('$DB'); c.execute('UPDATE agent_sessions SET type_source = NULL'); c.commit()"
afirmar "anulado: vacio_en_origen deja de verse" "0" "$(consulta "select count(*) from agent_sessions where type_source='vacio_en_origen'")"
afirmar "anulado: ausente deja de verse"         "0" "$(consulta "select count(*) from agent_sessions where type_source='ausente'")"
afirmar "anulado: las 2 quedan indistinguibles"  "2" "$(consulta "select count(*) from agent_sessions where subagent_type='desconocido'")"

echo
echo "$OK ok · $FALLO falla(s)  (alcance medido: $((OK+FALLO)) aserciones)"
[[ "$FALLO" -eq 0 ]]
