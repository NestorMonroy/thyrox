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
# `SubagentStart` pasa `agent_type: n` sin alternativa — y ademas ese tipo es
# el matcher del hook, asi que va real por construccion.
#
# Esta cabecera decia que `SubagentStart` no dispara aqui (:ref:`h-docs-167`).
# La premisa estaba ligada al entorno y el entorno cambio al llevar el
# cableado al nivel de usuario: hoy disparan LOS DOS, y por eso hacen falta
# los casos 6-8 — con dos escritores, el segundo puede degradar lo que el
# primero supo.
#
# CONTROL QUE PUEDE FALLAR (sub-patrón D de `metrica-decide-la-conclusion.md`):
# el caso 5 anula el discriminador —escribe `type_source` en NULL para todas—
# y comprueba que el conteo por procedencia DEJA de separar los dos cubos. Sin
# ese caso, los cuatro anteriores pasarían igual con una columna que nadie lee.
set -uo pipefail
# Arranque — DOS entradas, ambas de entorno (DEC-04): el VALOR de la raiz
# y la RUTA a su declaracion. Los dos literales que el ultimo recurso
# necesita van tras constantes que el entorno tambien fija: cablearlos le
# quitaria al consumidor la decision de donde van las cosas.
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" && -n "${THYROX_ENV_FILE:-}" && -f "${THYROX_ENV_FILE}" ]]; then
    _thyrox_root="$(sed -n 's/^[[:space:]]*THYROX_ROOT[[:space:]]*=[[:space:]]*//p' \
        "$THYROX_ENV_FILE" | tail -1 | tr -d '"'"'"'')"
fi
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/${THYROX_LOCATOR:-src/paths/reach.py}" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
source "$_thyrox_root/${THYROX_LIB_REACH:-src/lib/reach.sh}"
cd "$(thyrox_root)" || exit 1

STORE=src/agents/agent_store.py
HOOK=src/agents/register_session.py
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


# ---------------------------------------------------------------------------
# El ARRASTRE de la procedencia. La referencia lo hace con `zkr`/`VAt`: un
# escritor posterior NO borra lo que uno anterior ya sabia. Aqui las dos
# columnas son hermanas —`subagent_type` y su `type_source`— y solo la primera
# estaba protegida, asi que se desincronizaban: la fila conservaba el tipo que
# el Start le dio y su procedencia pasaba a decir `vacio_en_origen`, que
# significa lo contrario de la verdad.
#
# Banco: `kaupamex-docs: .claude/eventos/procedencia-del-tipo-de-agente-*`.
# ---------------------------------------------------------------------------
# `--claude-dir` es el PADRE: el store aterriza en <padre>/agent-results/.
DOS="$TMP/dos"; DB2="$DOS/agent-results/agent_store.sqlite3"; mkdir -p "$DOS"
consulta2() { python3 -c "
import sqlite3, sys
c = sqlite3.connect('$DB2')
f = c.execute(sys.argv[1]).fetchone()
print('' if f is None or f[0] is None else f[0])
" "$1"; }

registrar() {  # registrar <agent_id> <tipo> <procedencia>
    python3 "$STORE" registrar-sesion --claude-dir "$DOS" \
        --agent-id "$1" --subagent-type "$2" --type-source "$3" \
        --session-id s1 --status running >/dev/null 2>&1
}
actualizar() {  # actualizar <agent_id> <tipo> <procedencia>
    python3 "$STORE" actualizar-sesion --claude-dir "$DOS" \
        --agent-id "$1" --subagent-type "$2" --type-source "$3" \
        --status completed --crear-si-falta >/dev/null 2>&1
}
pareja() {  # siembra los dos casos sobre el store secundario
    registrar a6666666666666666 general-purpose payload
    actualizar a6666666666666666 desconocido vacio_en_origen
    registrar a7777777777777777 desconocido vacio_en_origen
    actualizar a7777777777777777 general-purpose sidecar
}

echo "== Caso 6: el Stop sin tipo NO degrada la procedencia que puso el Start"
pareja
afirmar "el tipo se preserva (ya estaba protegido)" "general-purpose" \
    "$(consulta2 "select subagent_type from agent_sessions where agent_id='a6666666666666666'")"
afirmar "la procedencia se preserva EN PAREJA"      "payload" \
    "$(consulta2 "select type_source from agent_sessions where agent_id='a6666666666666666'")"

echo "== Caso 7 (la otra mitad): sobre una fila SIN tipo, la procedencia si se rellena"
afirmar "el tipo se rellena"        "general-purpose" \
    "$(consulta2 "select subagent_type from agent_sessions where agent_id='a7777777777777777'")"
afirmar "la procedencia se rellena" "sidecar" \
    "$(consulta2 "select type_source from agent_sessions where agent_id='a7777777777777777'")"

echo "== Caso 8 (CONTROL ANULADO): con la expresion vieja, el 6 CAE y el 7 SOBREVIVE"
# Se retira la causa —el arrastre— y tienen que caer EXACTAMENTE las aserciones
# que dependen de ella. Si al anularla el veredicto no cambiara, el caso 6 no
# estaria midiendo el arrastre. El bytecode se borra: restaurar el fuente NO
# restaura el `__pycache__`, y un rojo por bytecode viejo no distingue «el
# porte esta roto» de «el instrumento lee una copia».
if ! grep -q 'CASE WHEN NULLIF(subagent_type' "$STORE"; then
    printf '  FALLO %s\n' "control anulado: no existe la expresion de arrastre que anular"
    (( FALLO++ ))
else
    cp "$STORE" "$TMP/agent_store.py.intacto"
    python3 -c "
import pathlib, re, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text()
# La expresion viva ocupa TRES lineas y son DOS literales adyacentes; el patron
# tiene que verla asi, no como un literal suelto.
s2 = re.sub(r'\(\"type_source\",\s*\"CASE WHEN.*?END\",\s*args\.type_source\),',
            '(\"type_source\", \"COALESCE(?, type_source)\", args.type_source),',
            s, flags=re.S)
assert s2 != s, 'la anulacion no sustituyo nada'
p.write_text(s2)
" "$STORE"
    find "$(dirname "$STORE")" -name __pycache__ -type d -exec rm -rf {} + 2>/dev/null
    rm -f "$DB2"
    pareja
    afirmar "anulado: el 6 CAE (la procedencia se pisa)" "vacio_en_origen" \
        "$(consulta2 "select type_source from agent_sessions where agent_id='a6666666666666666'")"
    afirmar "anulado: el 7 SOBREVIVE (no dependia del arrastre)" "sidecar" \
        "$(consulta2 "select type_source from agent_sessions where agent_id='a7777777777777777'")"
    cp "$TMP/agent_store.py.intacto" "$STORE"
    find "$(dirname "$STORE")" -name __pycache__ -type d -exec rm -rf {} + 2>/dev/null
    if cmp -s "$TMP/agent_store.py.intacto" "$STORE"; then
        afirmar "el fuente queda restaurado" "identico" "identico"
    else
        afirmar "el fuente queda restaurado" "identico" "DIVERGE"
    fi
fi
echo
echo "$OK ok · $FALLO falla(s)  (alcance medido: $((OK+FALLO)) aserciones)"
[[ "$FALLO" -eq 0 ]]
