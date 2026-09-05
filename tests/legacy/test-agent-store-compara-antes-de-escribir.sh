#!/usr/bin/env bash
# Pruebas del guard de comparación de `agent_store.py::cmd_update_session`, y
# de los tres desenlaces que el resumen de `reconciliar_store.py` separa
# (H-DOCS-277, tarea #705).
#
# Qué protege, y por qué el defecto era invisible
# ----------------------------------------------
# El UPDATE escribía `updated_at = now()` SIN comparar: con todas las demás
# columnas en `COALESCE(?, col)`, un pase que no aportaba ningún dato nuevo
# dejaba la fila idéntica salvo el timestamp. `agent_store.sqlite3` es un
# binario VERSIONADO, así que cada arranque producía un diff de megabytes que
# no llevaba información — medido: 113 filas por sesión.
#
# Las 113 no son casuales ni transitorias: son las que `_ids_incompletos()`
# marca porque les falta una columna que su transcript NO tiene y nunca
# tendrá. El reconciliador las reintenta en cada arranque, para siempre.
#
# Y el resumen las contaba como «113 completados». Es el sub-patrón D de
# `metrica-decide-la-conclusion.md`: un contador para dos desenlaces con
# conductas opuestas — «se cerró una fila» y «se retocó y nada cambió».
#
# El caso 5 es el que hace verificable la suite
# ---------------------------------------------
# Sin él, un verde no distingue «el guard compara» de «el test no pregunta».
# Se anula el guard sobre una COPIA del script y se exige que caiga
# EXACTAMENTE el caso que depende de él — ni uno más, ni uno menos. Mismo
# patrón que el caso 4 de `test-reconciliar-store-journal.sh`.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

STORE=.claude/scripts/agents/agent_store.py
RECON=.claude/scripts/agents/reconciliar_store.py
OK=0; FALLO=0

afirmar() {  # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

cleanup() { [[ -n "${TMP:-}" ]] && rm -rf "$TMP"; }
trap cleanup EXIT
TMP=$(mktemp -d)

CLAUDE="$TMP/.claude/agent-results"
DB="$CLAUDE/agent_store.sqlite3"

leer_campo() {  # leer_campo <agent_id> <columna>
    python3 -c "
import sqlite3, sys
conn = sqlite3.connect(sys.argv[1])
fila = conn.execute('SELECT $2 FROM agent_sessions WHERE agent_id=?', (sys.argv[2],)).fetchone()
print(fila[0] if fila else '<NULO>')
" "$DB" "$1"
}

echo "== 1. sintaxis =="
python3 -c "import ast; ast.parse(open('$STORE').read())"; afirmar "agent_store.py parsea" 0 $?
python3 -c "import ast; ast.parse(open('$RECON').read())"; afirmar "reconciliar_store.py parsea" 0 $?

python3 "$STORE" init --claude-dir "$CLAUDE" >/dev/null
python3 "$STORE" registrar-sesion --claude-dir "$CLAUDE" \
    --agent-id AGX --subagent-type general-purpose --session-id S1 --status running >/dev/null
python3 "$STORE" actualizar-sesion --claude-dir "$CLAUDE" \
    --agent-id AGX --status completed --turns 7 >/dev/null
ANTES="$(leer_campo AGX updated_at)"

echo "== 2. el MISMO pase no mueve updated_at, y lo declara =="
# Falla si el UPDATE vuelve a escribir sin comparar — el defecto de H-DOCS-277.
SALIDA="$(python3 "$STORE" actualizar-sesion --claude-dir "$CLAUDE" \
    --agent-id AGX --status completed --turns 7)"
afirmar "updated_at intacto tras un pase idéntico" "$ANTES" "$(leer_campo AGX updated_at)"
afirmar "stdout declara el desenlace" "sí" \
    "$([[ "$SALIDA" == *"(sin cambios)"* ]] && echo sí || echo no)"

echo "== 3. un cambio REAL sí escribe, y lo declara =="
# El otro lado del par: sin este caso, un guard que bloqueara TODA escritura
# también pasaría el caso 2.
sleep 1
SALIDA="$(python3 "$STORE" actualizar-sesion --claude-dir "$CLAUDE" \
    --agent-id AGX --status failed --turns 7)"
afirmar "status cambió" "failed" "$(leer_campo AGX status)"
afirmar "updated_at avanzó" "sí" \
    "$([[ "$(leer_campo AGX updated_at)" != "$ANTES" ]] && echo sí || echo no)"
afirmar "stdout declara el desenlace" "sí" \
    "$([[ "$SALIDA" == *"(actualizada)"* ]] && echo sí || echo no)"

echo "== 4. la fila AUSENTE sigue siendo error, no 'sin cambios' =="
# Es el desenlace que el guard podría haber colapsado: con la comparación
# puesta, `rowcount 0` dejó de significar una sola cosa.
python3 "$STORE" actualizar-sesion --claude-dir "$CLAUDE" \
    --agent-id NO-EXISTE --status completed >/dev/null 2>&1
afirmar "agent_id inexistente sale 1" 1 $?

echo "== 5. CONTROL ANULADO — sin el guard cae el caso 2, y SÓLO él =="
# La copia vive en un ESPEJO de la estructura real (`.claude/scripts/agents/`)
# y no suelta en $TMP: `agent_store.py` deriva la raiz del repo con
# `SCRIPT_PATH.parents[3]`, asi que una copia a otra profundidad muere con
# IndexError antes de ejecutar nada — el control pasaria en falso.
ESPEJO="$TMP/espejo/.claude/scripts/agents"
mkdir -p "$ESPEJO"
COPIA="$ESPEJO/agent_store_sin_guard.py"
python3 - "$STORE" "$COPIA" <<'PY'
import pathlib, sys
src = pathlib.Path(sys.argv[1]).read_text()
# Se reproduce la conducta anterior al arreglo: sin cláusula de diferencia y
# sin su juego de parámetros. Si alguno de los dos literales deja de existir,
# el control se declara roto en vez de pasar en falso.
for viejo, nuevo in (
    ('f"WHERE agent_id = ? AND ({dif_sql})",', 'f"WHERE agent_id = ?",'),
    ("(*valores, now_iso(), args.agent_id, *valores),",
     "(*valores, now_iso(), args.agent_id),"),
):
    assert viejo in src, f"el control no encontró: {viejo}"
    src = src.replace(viejo, nuevo)
pathlib.Path(sys.argv[2]).write_text(src)
PY
afirmar "la copia anulada se pudo construir" 0 $?

# La copia vive fuera de `.claude/scripts/`, y `agent_store.py` importa
# `tipos_documentales` (el vocabulario proyectado del canon). Una copia de un
# modulo necesita esa pieza: sin esto la copia muere en el import y el control
# pasaria en falso — daria "no defecto" porque no llego a ejecutarse, que es el
# sub-patron D de `metrica-decide-la-conclusion.md`.
#
# Desde la organizacion por clase (2026-08-27) ya NO son vecinos: `agent_store`
# vive en `scripts/agents/` y `tipos_documentales` en `scripts/corpus/`. La ruta
# se deriva de la raiz de `scripts/`, no del directorio del consumidor.
mkdir -p "$TMP/espejo/.claude/scripts/corpus"
cp "$(dirname "$(dirname "$STORE")")/corpus/tipos_documentales.py" \
   "$TMP/espejo/.claude/scripts/corpus/"

CLAUDE2="$TMP/.claude2/agent-results"
python3 "$COPIA" init --claude-dir "$CLAUDE2" >/dev/null
python3 "$COPIA" registrar-sesion --claude-dir "$CLAUDE2" \
    --agent-id AGY --subagent-type general-purpose --session-id S1 --status running >/dev/null
python3 "$COPIA" actualizar-sesion --claude-dir "$CLAUDE2" \
    --agent-id AGY --status completed --turns 7 >/dev/null
DB="$CLAUDE2/agent_store.sqlite3"
ANTES2="$(leer_campo AGY updated_at)"
sleep 1
python3 "$COPIA" actualizar-sesion --claude-dir "$CLAUDE2" \
    --agent-id AGY --status completed --turns 7 >/dev/null
afirmar "SIN guard, el pase idéntico SÍ mueve updated_at (el defecto)" "sí" \
    "$([[ "$(leer_campo AGY updated_at)" != "$ANTES2" ]] && echo sí || echo no)"
# El caso 4 NO depende del guard: sobrevive a la anulación. Si cayera también,
# el caso 5 estaría midiendo otra cosa.
python3 "$COPIA" actualizar-sesion --claude-dir "$CLAUDE2" \
    --agent-id NO-EXISTE --status completed >/dev/null 2>&1
afirmar "SIN guard, la fila ausente sigue saliendo 1 (no depende del guard)" 1 $?
DB="$CLAUDE/agent_store.sqlite3"

echo "== 6. el resumen del reconciliador separa completar de retocar =="
# La fila queda irreparablemente incompleta —su transcript no trae
# `spawn_depth` ni `prompt`— así que el pase la reintenta para siempre. Ese es
# el caso real de las 113: el primer pase aporta algo, el segundo no aporta
# nada, y el resumen tiene que decirlo.
RAIZ="$TMP/projects"
# El layout que `_transcripts()` recorre: <raíz>/<proyecto>/<sesión>/subagents/
SESION="$RAIZ/proyecto/sesion-prueba/subagents"
mkdir -p "$SESION"
printf '%s\n' \
    '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"listo"}]}}' \
    > "$SESION/agent-agincompleta1.jsonl"
printf '{"subagent_type":"general-purpose"}\n' > "$SESION/agent-agincompleta1.meta.json"
find "$SESION" -name '*.jsonl' -exec touch -d '3 hours ago' {} +

python3 "$STORE" registrar-sesion --claude-dir "$CLAUDE" \
    --agent-id agincompleta1 --subagent-type general-purpose \
    --session-id sesion-prueba --status running >/dev/null

PRIMERA="$(python3 "$RECON" --claude-dir "$CLAUDE" --projects-dir "$RAIZ" --quiet | tail -1)"
SEGUNDA="$(python3 "$RECON" --claude-dir "$CLAUDE" --projects-dir "$RAIZ" --quiet | tail -1)"
afirmar "el primer pase sí completa" "sí" \
    "$([[ "$PRIMERA" == *"1 completados"* ]] && echo sí || echo no)"
afirmar "el segundo pase reporta sin cambios, no completados" "sí" \
    "$([[ "$SEGUNDA" == *"0 completados, 1 sin cambios"* ]] && echo sí || echo no)"

printf '\n%d ok, %d fallos\n' "$OK" "$FALLO"
[[ $FALLO -eq 0 ]]
