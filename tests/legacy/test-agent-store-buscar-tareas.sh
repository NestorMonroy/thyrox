#!/usr/bin/env bash
# Pruebas de ``agent_store.py buscar-tareas`` — la superficie de consulta que faltaba.
#
# El ejecutor preguntó si las tareas que creo con ``TaskCreate`` se están
# guardando en ``agent_store.sqlite3`` y, si no, que se guarden «para que en
# otro chat o sesión no se pierdan y se puedan obtener desde la consulta».
#
# Medido: las dos primeras mitades YA se cumplían — el hook ``PostToolUse``
# (``volcar-tarea-al-store.sh``, matcher ``TaskCreate|TaskUpdate``) escribe la
# fila a los segundos, y el archivo está versionado (DEC-05), así que la fila
# sobrevive al contenedor. La tercera NO: el store tenía ``listar-sesiones``
# para agentes y ``buscar-hallazgos`` para ``findings_history``, y para tareas
# sólo ``render-tablero``, que escribe el tablero entero en RST. Recuperar
# «¿qué decía la #864?» desde otra sesión exigía SQL a mano.
#
# El caso 4 es el DISCRIMINADOR y reproduce el escenario del pedido: una tarea
# escrita por una sesión tiene que salir al consultarla desde otra. Si el
# comando acotara a la sesión viva —el defecto que H-DOCS-407 documentó para
# ``render-tablero``— ese caso caería y sólo ése.
#
# El caso 9 mide el otro eje: un cero tiene que venir con su denominador. Sin
# él, «no hay coincidencias» y «no midió nada» se imprimen igual (sub-patrón D
# de metrica-decide-la-conclusion.md).

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

STORE=.claude/scripts/agents/agent_store.py
OK=0; FALLO=0

afirmar() {
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

cleanup() { [[ -n "${TMP:-}" ]] && rm -rf "$TMP"; }
trap cleanup EXIT
TMP=$(mktemp -d)
CLAUDE_DIR="$TMP/.claude/agent-results"
DB="$CLAUDE_DIR/agent_store.sqlite3"
mkdir -p "$CLAUDE_DIR"

buscar() { python3 "$STORE" buscar-tareas --claude-dir "$CLAUDE_DIR" "$@" 2>&1; }

echo "== 1. sintaxis =="
python3 -c "import ast; ast.parse(open('$STORE').read())"; afirmar "agent_store.py parsea" 0 $?

echo "== 2. siembra: dos sesiones distintas, como dos chats =="
python3 "$STORE" listar-sesiones --claude-dir "$CLAUDE_DIR" >/dev/null 2>&1
python3 - "$DB" <<'PY'
import sqlite3, sys
c = sqlite3.connect(sys.argv[1])
filas = [
    # (task_id, subject, description, status, session_id, submodule)
    ("864", "Equivalente de deprecated.sh para un modulo .py",
     "El guard de Python no puede ser un source.", "pending", "sesion-vieja", "docs"),
    ("865", "DESCONOCIDO: que senal delata un script",
     "Condicion de cierre: una senal greppeable.", "pending", "sesion-vieja", None),
    ("900", "Tarea de la sesion en curso",
     "El texto discriminante vive SOLO aqui: zanahoria.", "in_progress", "sesion-nueva", "api"),
]
c.executemany(
    "INSERT INTO tasks (task_id, subject, description, status, blocks_json, "
    "blocked_by_json, session_id, source, created_at, updated_at, submodule) "
    "VALUES (?,?,?,?,'[]','[]',?,'prueba','2026-01-01T00:00:00','2026-01-01T00:00:00',?)",
    filas)
c.commit()
PY
afirmar "siembra sin error" 0 $?

echo "== 3. --id devuelve exactamente esa fila =="
salida=$(buscar --id 864)
afirmar "#864 presente"    1 "$(grep -c '^#864 ' <<<"$salida")"
afirmar "#865 ausente"     0 "$(grep -c '^#865 ' <<<"$salida")"
afirmar "total 1"          1 "$(sed -n 's/^Total: \([0-9]*\).*/\1/p' <<<"$salida")"

echo "== 4. DISCRIMINADOR — por omision consulta TODAS las sesiones =="
# Es el escenario del pedido: la tarea la escribio otro chat y tiene que salir.
salida=$(buscar)
afirmar "ve la tarea de sesion-vieja" 1 "$(grep -c '^#864 ' <<<"$salida")"
afirmar "ve la tarea de sesion-nueva" 1 "$(grep -c '^#900 ' <<<"$salida")"
afirmar "total 3"                     3 "$(sed -n 's/^Total: \([0-9]*\).*/\1/p' <<<"$salida")"

echo "== 5. --sesion acota a una =="
salida=$(buscar --sesion sesion-vieja)
afirmar "sesion-vieja: 2 filas" 2 "$(sed -n 's/^Total: \([0-9]*\).*/\1/p' <<<"$salida")"
afirmar "no cuela la nueva"     0 "$(grep -c '^#900 ' <<<"$salida")"

echo "== 6. --query busca en description, no solo en subject =="
# 'zanahoria' NO aparece en ningun subject; solo en la description de #900.
salida=$(buscar --query zanahoria)
afirmar "encuentra por description" 1 "$(grep -c '^#900 ' <<<"$salida")"
salida=$(buscar --query ZANAHORIA)
afirmar "no distingue mayusculas"   1 "$(grep -c '^#900 ' <<<"$salida")"

echo "== 7. --status y --submodulo filtran =="
afirmar "status in_progress: 1" 1 \
    "$(sed -n 's/^Total: \([0-9]*\).*/\1/p' <<<"$(buscar --status in_progress)")"
afirmar "submodulo docs: 1"     1 \
    "$(sed -n 's/^Total: \([0-9]*\).*/\1/p' <<<"$(buscar --submodulo docs)")"

echo "== 8. --limit recorta y --id acepta el # delante =="
afirmar "limit 2"          2 "$(sed -n 's/^Total: \([0-9]*\).*/\1/p' <<<"$(buscar --limit 2)")"
afirmar "#864 con almohadilla" 1 "$(grep -c '^#864 ' <<<"$(buscar --id '#864')")"

echo "== 9. el cero viene con su denominador (sub-patron D) =="
salida=$(buscar --query no-existe-esta-cadena)
afirmar "total 0"                 0 "$(sed -n 's/^Total: \([0-9]*\).*/\1/p' <<<"$salida")"
afirmar "publica alcance medido"  1 "$(grep -c 'alcance medido: 3 tarea(s) de 2 sesion/es' <<<"$salida")"

echo "== 10. --detalle imprime description, sesion y origen =="
salida=$(buscar --id 900 --detalle)
afirmar "trae la description" 1 "$(grep -c 'zanahoria' <<<"$salida")"
afirmar "trae la sesion"      1 "$(grep -c 'sesion:      sesion-nueva' <<<"$salida")"
afirmar "trae el origen"      1 "$(grep -c 'origen:      prueba' <<<"$salida")"
afirmar "sin --detalle no la trae" 0 "$(grep -c 'zanahoria' <<<"$(buscar --id 900)")"

echo
echo "$OK ok · $FALLO fallas"
[[ $FALLO -eq 0 ]]
