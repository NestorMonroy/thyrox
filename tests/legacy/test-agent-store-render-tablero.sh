#!/usr/bin/env bash
# Pruebas del render del tablero DESDE EL STORE (#435, H-DOCS-180).
#
# Qué cambia y por qué
# --------------------
# Hasta hoy `pm/reportes/tablero-de-tareas.rst` lo generaba `snapshot-tasks.sh`
# leyendo el **directorio efímero** del cliente. Ese directorio es por sesión,
# así que el registro versionado describía SIEMPRE la última sesión y borraba
# a las anteriores — medido: declaraba la sesión 2b81838e con id máximo 57
# mientras corrían 447 en otra.
#
# Con la tabla `tasks` poblada, el `.rst` se deriva del store y entonces
# describe **todas** las sesiones. El generador pasa a ser UNO: dos generadores
# del mismo archivo son dos fuentes de verdad que nadie sincroniza.
#
# Lo que NO se deriva del store, y es el punto delicado
# -----------------------------------------------------
# La **firma de estados** la usa `stop-gate-tablero-desactualizado.sh` para
# decidir si dispara: compara la firma declarada en el `.rst` contra la del
# directorio VIVO. Si el `.rst` declarara una firma derivada del store —que el
# mismo disparo acaba de actualizar—, la comparación sería el store contra sí
# mismo: **tautológica, y el hook no volvería a disparar nunca**. Es la ceguera
# de `metrica-decide-la-conclusion.md` en su forma más cara: el instrumento
# mediría el fenómeno equivocado y su silencio se leería como "sin drift".
#
# Por eso la firma sigue midiendo el directorio vivo, y el caso 4 verifica que
# la implementación en Python da EL MISMO hash que la de bash. Si difirieran, el
# hook vería drift eterno y reescribiría el registro en cada turno.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

STORE=.claude/scripts/agents/agent_store.py
SNAPSHOT=.claude/scripts/task/snapshot-tasks.sh
HOOK=.claude/hooks/stop-gate-tablero-desactualizado.sh
GATE_RST=.claude/scripts/gates/check_rst_sintaxis.py
OK=0; FALLO=0

afirmar() {
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

afirmar_contiene() {  # afirmar_contiene <rotulo> <patron> <archivo>
    if grep -qF -- "$2" "$3"; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        no encontrado: [%s]\n' "$1" "$2"; (( FALLO++ ))
    fi
}

cleanup() { [[ -n "${TMP:-}" ]] && rm -rf "$TMP"; }
trap cleanup EXIT
TMP=$(mktemp -d)
CLAUDE_DIR="$TMP/.claude/agent-results"
DB="$CLAUDE_DIR/agent_store.sqlite3"
VIVA="$TMP/tasks/sesion-viva"      # el directorio de la sesión activa
SALIDA="$TMP/tablero.rst"
mkdir -p "$CLAUDE_DIR" "$VIVA"

echo "== 1. sintaxis =="
python3 -c "import ast; ast.parse(open('$STORE').read())"; afirmar "agent_store.py parsea" 0 $?

echo "== 2. dos sesiones en el store: la activa y una anterior =="
# Sesión ANTERIOR: sólo existe en el store; su directorio ya no está en disco.
# Es exactamente el caso que el tablero viejo no podía describir.
ANTERIOR="$TMP/tasks/sesion-vieja"
mkdir -p "$ANTERIOR"
cat > "$ANTERIOR/1.json" <<'EOF'
{"id":"1","subject":"Trabajo de una sesion anterior","description":"d",
 "status":"completed","blocks":[],"blockedBy":[]}
EOF
python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$ANTERIOR" --session-id SES-VIEJA >/dev/null 2>&1
rm -rf "$ANTERIOR"          # el directorio desaparece; el store la conserva

# Sesión ACTIVA, con un subject que trae markup RST peligroso (caso 5).
cat > "$VIVA/1.json" <<'EOF'
{"id":"1","subject":"Cablear authz_* y el modulo `base`","description":"d",
 "status":"in_progress","activeForm":"Cableando","blocks":[],"blockedBy":[]}
EOF
cat > "$VIVA/2.json" <<'EOF'
{"id":"2","subject":"Segunda de la activa","description":"d",
 "status":"pending","blocks":[],"blockedBy":["1"]}
EOF
python3 "$STORE" snapshot-tareas --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$VIVA" --session-id SES-VIVA >/dev/null 2>&1
afirmar "el store tiene las 3 tareas de las dos sesiones" "3" \
        "$(python3 -c "
import sqlite3
print(sqlite3.connect('$DB').execute('SELECT COUNT(*) FROM tasks').fetchone()[0])
")"

echo "== 3. el render escribe el archivo y describe AMBAS sesiones =="
python3 "$STORE" render-tablero --claude-dir "$CLAUDE_DIR" \
    --tasks-dir "$VIVA" --session-id SES-VIVA -o "$SALIDA" >/dev/null 2>&1
afirmar "render-tablero sale 0" "0" "$?"
afirmar "el archivo existe" "si" "$([[ -f "$SALIDA" ]] && echo si || echo no)"
afirmar_contiene "la tarea de la sesión ACTIVA aparece" "Segunda de la activa" "$SALIDA"
afirmar_contiene "la tarea de la sesión ANTERIOR aparece (el punto de #435)" \
                 "Trabajo de una sesion anterior" "$SALIDA"
afirmar_contiene "la etiqueta canónica se conserva" "_tablero-de-tareas:" "$SALIDA"
afirmar_contiene "declara su generador real" "render-tablero" "$SALIDA"

echo "== 4. la firma de estados coincide con la de bash (si no, drift eterno) =="
# Este caso NO define su propia firma: EXTRAE la función de los dos archivos
# reales de bash y la ejecuta. La diferencia no es de estilo.
#
# Hasta H-DOCS-191 este bloque llevaba una CUARTA copia, anunciada como «misma
# definición que snapshot-tasks.sh y que el hook» — y no lo era: concatenaba
# `subject` y `description` con un espacio, igual que la de Python, mientras las
# dos de bash usaban NUL. Así que el caso pasaba comparando el código contra su
# propio reflejo, y el defecto que este mismo caso existe para atrapar vivió
# meses debajo: el hook veía drift eterno y reescribía el `.rst` versionado en
# CADA Stop. Una copia mantenida a mano hereda el encuadre de lo que verifica;
# una extraída del archivo real, no.
extraer_firma() {  # extraer_firma <archivo> <nombre-nuevo>
    awk '/^firma_estados\(\) \{/,/^\}/' "$1" | sed "1s/^firma_estados/$2/"
}
FUENTES="$TMP/firmas-de-bash.sh"
extraer_firma "$SNAPSHOT" firma_snap  > "$FUENTES"
extraer_firma "$HOOK"     firma_hook >> "$FUENTES"
# shellcheck source=/dev/null
source "$FUENTES"

emitida=$(grep -oP '\*\*Firma de estados:\*\* ``\K[0-9a-f]+' "$SALIDA" | head -1)
afirmar "la firma emitida es la del directorio VIVO, idéntica a la de snapshot-tasks.sh" \
        "$(firma_snap "$VIVA")" "$emitida"
afirmar "y también idéntica a la del hook — las tres implementaciones coinciden" \
        "$(firma_hook "$VIVA")" "$emitida"

echo "== 5. el saneo sobrevive al markup RST: el gate de sintaxis no protesta =="
# `authz_*` y el backtick suelto son la forma exacta que rompió la tabla antes:
# RST lee `authz_` como referencia con nombre y falla con "Unknown target name".
#
# `--strict` NO es opcional aquí: sin él el gate imprime «N archivo(s) con
# errores» y **sale 0** — es un reporte, no un veredicto. La primera versión de
# este caso lo llamaba pelado y pasó en verde durante la fase RED, cuando el
# archivo ni siquiera existía. Un test que no puede fallar no mide nada.
# Verificado en ambos sentidos: inexistente --strict → 1, tablero real → 0.
salida_gate=$(python3 "$GATE_RST" --strict "$SALIDA" 2>&1); codigo=$?
afirmar "check_rst_sintaxis.py acepta el tablero generado" "0" "$codigo"
[[ "$codigo" -ne 0 ]] && printf '        %s\n' "$salida_gate"

# EL CODIGO DE SALIDA NO DISCRIMINA, y por eso la asercion de arriba no basta.
# `main()` devuelve 0 desde TRES sitios, y uno de ellos es «no habia nada que
# revisar»: con `main()` colapsada a `return 0` este caso seguia verde. Se
# afirma tambien sobre el DENOMINADOR, que es el eje que el gate publica
# justamente para que un 0 no se lea como cobertura. Ver :ref:`h-docs-243`.
afirmar "y lo midio de verdad: el denominador declara el archivo" "1" \
        "$(printf '%s' "$salida_gate" | grep -c 'alcance medido: 1 de')"

echo "== 5-bis. CONTROL — el mismo exit 0 con CERO archivos revisados =="
# Por que la asercion del denominador no es decorativa: por la ruta de «nada que
# revisar» el gate da EXACTAMENTE el mismo exit 0. Un caso que solo mire `$?` no
# distingue «reviso y esta limpio» de «no reviso nada». Esa ruta no es
# alcanzable por CLI con una ruta suelta (`sueltos` siempre deja `rutas` no
# vacia), asi que se ejercita en proceso sustituyendo el descubridor.
PY_GATE=python3
python3 -c 'import sphinx' 2>/dev/null || PY_GATE=.venv/bin/python
vacio=$("$PY_GATE" - "$GATE_RST" <<'PY' 2>&1
import importlib.util, sys
spec = importlib.util.spec_from_file_location("crs", sys.argv[1])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.archivos_nuevos = lambda: []          # el arbol no toca ningun .rst
sys.argv = ["check_rst_sintaxis.py", "--nuevos", "--strict"]
print("EXIT=%d" % m.main())
PY
)
afirmar "la ruta sin nada que revisar tambien sale 0" "1" \
        "$(printf '%s' "$vacio" | grep -c '^EXIT=0$')"
afirmar "pero su denominador declara CERO archivos medidos" "1" \
        "$(printf '%s' "$vacio" | grep -c 'alcance medido: 0 de')"

echo "== 6. sin --tasks-dir sigue rindiendo (uso manual, sin sesión activa) =="
SALIDA2="$TMP/tablero-sin-viva.rst"
python3 "$STORE" render-tablero --claude-dir "$CLAUDE_DIR" -o "$SALIDA2" >/dev/null 2>&1
afirmar "render sin sesión activa sale 0" "0" "$?"
afirmar_contiene "y sigue describiendo las dos sesiones" \
                 "Trabajo de una sesion anterior" "$SALIDA2"

echo "== 7. store vacío: no revienta, deja constancia =="
VACIO="$TMP/vacio/.claude/agent-results"
mkdir -p "$VACIO"
SALIDA3="$TMP/tablero-vacio.rst"
python3 "$STORE" render-tablero --claude-dir "$VACIO" -o "$SALIDA3" >/dev/null 2>&1
afirmar "un store sin tareas sale 0" "0" "$?"

echo "== 8. RE-DEFINIR una tarea mueve la firma (H-DOCS-183, control del episodio) =="
# Control POSITIVO del episodio real, no un incumplidor fabricado: en la sesion
# del 2026-08-18 se re-enunciaron #150 y #151 -- mismo id, mismo `pending`, otro
# subject y otra description -- y la firma no se movio, asi que el hook no
# disparo y la re-definicion nunca llego al store. El directorio del cliente es
# efimero POR SESION: se habria perdido al reciclarse el contenedor.
REDEF="$TMP/redef"
cp -r "$VIVA" "$REDEF"
antes=$(firma_snap "$REDEF")
primero=$(find "$REDEF" -maxdepth 1 -name '*.json' | head -1)
python3 - "$primero" <<'PYEOF'
import json, sys, pathlib
p = pathlib.Path(sys.argv[1]); d = json.loads(p.read_text())
d["subject"] = "RE-DEFINIDA: otro enunciado, mismo estado"
p.write_text(json.dumps(d))
PYEOF
despues=$(firma_snap "$REDEF")
if [[ "$antes" != "$despues" ]]; then
    OK=$(( OK + 1 )); printf '  ok    cambiar el subject mueve la firma\n'
else
    FALLO=$(( FALLO + 1 )); printf '  FALLO cambiar el subject NO movio la firma (el defecto de H-DOCS-183)\n'
fi
# Control NEGATIVO: sin tocar nada, la firma es estable.
afirmar "sin tocar nada la firma es estable" "$antes" "$(firma_snap "$VIVA")"

echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))
