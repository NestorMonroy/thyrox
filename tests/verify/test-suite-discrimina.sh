#!/usr/bin/env bash
# Pruebas de check_suite_discrimina.py (#613, H-DOCS-241).
#
# EL INSTRUMENTO SE PRUEBA CONTRA POSITIVOS REALES DEL REPO, no fabricados
# (`hallazgo-abierto-genera-sucesor.md`): un incumplidor escrito por quien
# escribio el patron hereda su encuadre y confirma el instrumento en vez de
# medirlo. Los dos positivos de aqui existen en el arbol:
#
#   - `reconcile_store.py::_verdict` — la funcion de H-DOCS-224, con tres
#     retornos de ('running', None). El detector DEBE verla como candidata.
#   - `classify_agents.py` — tres funciones cuya unica suite,
#     `test-script-naming.sh`, YA SALE ROJA en limpio. El juez DEBE reportarlas
#     BASELINE ROJO: una suite que no puede fallar por la causa medida no sostiene
#     ningun veredicto.
#
# Y se prueba EN LOS DOS SENTIDOS: que reporte donde hay defecto (caso 6) y que
# NO reporte donde ya se cerro (caso 5). Un instrumento que solo se prueba en
# un sentido no distingue "no hay defecto" de "no lo puedo ver" — que es el
# sub-patron D que este guion existe para cazar.
#
# El positivo del caso 6 CAMBIO al cerrar #658 (:ref:`h-docs-243`): era
# `check_rst_sintaxis.py::main`, la ultima SIN DISCRIMINAR del repo, y
# arreglarla dejo a su propio control sin sujeto. El eje SIN DISCRIMINAR esta
# vacio por diseno; el positivo se muda al eje SIN COBERTURA, que sigue
# teniendo positivos reales (tarea #659).

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

GATE=src/verify/check_suite_discrimina.py
OK=0; FALLO=0

afirmar() {
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

# El estado ANTES del barrido. El caso 7 compara contra esto, no contra un árbol
# limpio: la suite corre con trabajo en vuelo, y exigir limpieza mediría el
# estado del working tree en vez de la restauración del mutante.
ANTES="$(git status --porcelain .claude/scripts .claude/hooks | sort)"

echo "== 1. sintaxis =="
python3 -c "import ast; ast.parse(open('$GATE').read())"; afirmar "check_suite_discrimina.py parsea" 0 $?

echo "== 2. CONTROL POSITIVO del detector — _verdict, la funcion de H-DOCS-224 =="
# Sin la rama IfExp de literals_of el conteo seria 2, no 3: el retorno final de
# _verdict es un ternario, y ahi vive la mitad tardia del literal ambiguo.
# Esta asercion es la que atrapo al detector v2, que declaraba NADA sobre su
# propio control positivo.
sitios=$(python3 - "$GATE" <<'PY'
import ast, importlib.util, pathlib, sys
spec = importlib.util.spec_from_file_location("csd", sys.argv[1])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
arbol = ast.parse(pathlib.Path("src/agents/reconcile_store.py").read_text())
fn = next(n for n in ast.walk(arbol)
          if isinstance(n, ast.FunctionDef) and n.name == "_verdict")
print(m.ambiguous_literals(fn).get("('running', None)", 0))
PY
)
afirmar "_verdict: el literal sale de 3 sitios de retorno" "3" "$sitios"

echo "== 3. la mutacion va DESPUES del docstring, y el archivo sigue parseando =="
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
cat > "$TMP/sujeto.py" <<'EOF'
def f(x):
    """Un docstring que NO es la primera sentencia ejecutable."""
    if x:
        return None
    return None
EOF
resultado=$(SUITE_DISCRIMINA_LEDGER="$TMP/caso3.json" python3 - "$GATE" "$TMP/sujeto.py" <<'PY'
import ast, importlib.util, pathlib, sys
spec = importlib.util.spec_from_file_location("csd", sys.argv[1])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
p = pathlib.Path(sys.argv[2])
m.mutate(p, "f", "return 'MUT'")
texto = p.read_text()
fn = next(n for n in ast.parse(texto).body if isinstance(n, ast.FunctionDef))
primera = fn.body[0]
docstring = (isinstance(primera, ast.Expr) and isinstance(primera.value, ast.Constant)
             and isinstance(primera.value.value, str))
print("docstring-intacto" if docstring else "docstring-pisado")
PY
)
afirmar "la mutacion no pisa el docstring y el archivo parsea" "docstring-intacto" "$resultado"

echo "== 4. suites_naming es cota SUPERIOR: nombrar no es ejecutar =="
# test-script-naming.sh crea un archivo VACIO llamado classify_agents.py en un
# arbol temporal — lo nombra sin correrlo nunca. Por eso el veredicto no sale de
# esta lista sino del sabotaje. Declarar la limitacion aqui la vuelve auditable.
nombra=$(python3 - "$GATE" <<'PY'
import importlib.util, pathlib, sys
spec = importlib.util.spec_from_file_location("csd", sys.argv[1])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
suites = m.suites_naming(pathlib.Path("src/agents/classify_agents.py"))
print("si" if any(s.name == "test-script-naming.sh" for s in suites) else "no")
PY
)
afirmar "una suite que solo MENCIONA el archivo entra en la cota superior" "si" "$nombra"

echo "== 5. el juez NO reporta lo que ya se cerro (register_agent_session) =="
# Sus tres funciones estaban SIN DISCRIMINAR hasta que H-DOCS-241 les puso
# aserciones. Si esto vuelve a reportar, la cobertura se perdio.
salida=$(timeout 300 python3 "$GATE" --solo register_agent_session.py 2>&1 | head -1)
afirmar "register_agent_session: 0 sin discriminar" \
        "check-suite-discrimina: 0 sin discriminar, 0 sin cobertura, 0 con baseline rojo" "$salida"

echo "== 6. CONTROL NEGATIVO — el juez SI reporta un positivo real del repo =="
# `test-script-naming.sh` es la unica suite que nombra a `classify_agents.py`, y
# SALE 1 SOBRE EL ARBOL LIMPIO. Una suite ya roja no puede distinguir mutante de
# limpio: su rojo bajo mutacion no informa de la mutacion. El juez debe declarar
# BASELINE ROJO y no publicar un veredicto que no puede sostener.
#
# El veredicto de esta linea CAMBIO al cerrar el baseline (caso 14): antes decia
# SIN COBERTURA, y era falso por el mismo motivo — sin baseline, `any_suite_red`
# leia ese rojo pre-existente como deteccion y publicaba `ok`. Medido antes del
# arreglo: «0 sin discriminar, 0 sin cobertura» con las tres funciones sin
# ejercer. La deuda de `test-script-naming.sh` es la tarea #306.
salida6=$(timeout 300 python3 "$GATE" --solo classify_agents.py 2>&1)
afirmar "classify_agents se reporta BASELINE ROJO (el juez puede fallar)" "3" \
        "$(printf '%s' "$salida6" | grep -c 'BASELINE ROJO    classify_agents.py')"
# Y el conteo del titular concuerda con las filas: un titular que dijera 0 con
# tres filas debajo seria el mismo defecto que este guion caza, en su reporte.
afirmar "el titular concuerda con las filas que imprime" "1" \
        "$(printf '%s' "$salida6" | grep -c '^check-suite-discrimina: 0 sin discriminar, 0 sin cobertura, 3 con baseline rojo$')"

echo "== 7. el barrido no deja mutantes: el arbol queda como estaba =="
# Un mutante superviviente es peor que un falso positivo: se commitea.
DESPUES="$(git status --porcelain .claude/scripts .claude/hooks | sort)"
afirmar "el barrido no cambia el estado del arbol" "identico" \
        "$([[ "$ANTES" == "$DESPUES" ]] && echo identico || echo alterado)"
# El conteo lo hace `--verificar`, no un grep de esta suite. El grep que estuvo
# aqui hasta #745 volvio a cometer el defecto que su propio comentario nombraba:
# el caso 8 trae la linea del episodio VERBATIM dentro de un heredoc, y el patron
# la contaba como mutante superviviente. `--verificar` no puede caer en eso —
# mide `.py` bajo las raices reales, no cadenas en cualquier archivo.
afirmar "ningun MUTANTE insertado sobrevive al barrido" "0" \
        "$(python3 "$GATE" --verificar >/dev/null 2>&1; echo $?)"

echo "== 8. CONTROL ANULADO — se simula el proceso muerto de H-DOCS-307 =="
# El defecto que #745 cierra: `judge` restaura desde un `finally`, y un `finally`
# protege contra una excepcion pero NO contra la muerte del proceso. Aqui se
# reproduce el desenlace exacto — el archivo mutado en el disco y su entrada
# abierta en el ledger — y se exige que `--verificar` lo nombre.
#
# La linea es la del episodio, VERBATIM. No una fabricada: quien escribio el
# patron no puede validarlo con su propio encuadre.
ARBOL="$TMP/arbol"; mkdir -p "$ARBOL"
LEDGER="$TMP/ledger.json"
cat > "$ARBOL/register_agent_session.py" <<'EOF'
def api_error(transcript_path):
    """La captura de causa de muerte que construyo la tarea #600."""
    return None  # MUTANTE
    ultimo = None
EOF
cat > "$LEDGER" <<EOF
[{"archivo": "$ARBOL/register_agent_session.py", "funcion": "api_error",
  "sentencia": "return None", "desde": "2026-08-22T04:00:00"}]
EOF
salida8=$(SUITE_DISCRIMINA_ROOTS="$ARBOL" SUITE_DISCRIMINA_LEDGER="$LEDGER" \
          python3 "$GATE" --verificar 2>&1); codigo8=$?
afirmar "un mutante vivo hace fallar a --verificar" "1" "$codigo8"
afirmar "y lo nombra VIVO, con su fecha de insercion" "1" \
        "$(printf '%s' "$salida8" | grep -c 'VIVO .*register_agent_session.py :: api_error().*desde 2026-08-22T04:00:00')"

echo "== 9. el barrido de la marca ve lo que el ledger no anoto =="
# Los dos detectores son independientes A PROPOSITO. El ledger no ve un mutante
# anterior a que existiera, ni uno cuya anotacion se perdiera; el barrido si.
# Sin esta asercion, un cero del ledger se leeria como cero de supervivientes.
salida9=$(SUITE_DISCRIMINA_ROOTS="$ARBOL" SUITE_DISCRIMINA_LEDGER="$TMP/vacio.json" \
          python3 "$GATE" --verificar 2>&1); codigo9=$?
afirmar "sin entrada en el ledger, el barrido lo sigue viendo" "1" "$codigo9"
afirmar "y declara que su anotacion falta" "1" \
        "$(printf '%s' "$salida9" | grep -c 'SIN anotación')"

echo "== 10. una entrada sobre archivo limpio es residual, no un mutante vivo =="
# La asimetria de escritura del ledger produce esta entrada de sobra cuando el
# proceso muere entre la anotacion y la escritura. Es ruido inofensivo, y
# llamarlo VIVO convertiria el gate en un generador de falsos positivos.
LIMPIO="$TMP/limpio"; mkdir -p "$LIMPIO"
printf 'def api_error(t):\n    return None\n' > "$LIMPIO/register_agent_session.py"
salida10=$(SUITE_DISCRIMINA_ROOTS="$LIMPIO" SUITE_DISCRIMINA_LEDGER="$LEDGER" \
           python3 "$GATE" --verificar 2>&1); codigo10=$?
afirmar "una entrada huerfana no hace fallar el gate" "0" "$codigo10"
afirmar "y se reporta como residual" "1" \
        "$(printf '%s' "$salida10" | grep -c 'residual .*api_error()')"

echo "== 11. la marca INSERTADA no es la DEFINICION del marcador =="
# El propio mutador declara `MARCA = "# MUTANTE"` a columna 0. Un patron que
# midiera la cadena contaria al instrumento entre los incumplidores y su cero
# dejaria de significar nada — el defecto que el caso 7 ya documenta para grep.
DEF="$TMP/definicion"; mkdir -p "$DEF"
printf 'MARCA = "# MUTANTE"\n' > "$DEF/mutador.py"
codigo11=$(SUITE_DISCRIMINA_ROOTS="$DEF" SUITE_DISCRIMINA_LEDGER="$TMP/vacio.json" \
           python3 "$GATE" --verificar >/dev/null 2>&1; echo $?)
afirmar "declarar el marcador no cuenta como mutante" "0" "$codigo11"

echo "== 12. la entrada de un archivo AUSENTE se poda; la de uno limpio no =="
# La poda es la unica segura: sin archivo no hay mutante que restaurar. Sin ella
# el ledger crece sin cota — cada mutacion sobre un temporal deja su rastro
# cuando el directorio se borra. La entrada del caso 10 (archivo limpio pero
# presente) tiene que SOBREVIVIR: puede ser el rastro de una restauracion a mano.
cat > "$TMP/mixto.json" <<EOF
[{"archivo": "$TMP/no-existe.py", "funcion": "f", "sentencia": "return None",
  "desde": "2026-08-22T04:00:00"},
 {"archivo": "$LIMPIO/register_agent_session.py", "funcion": "api_error",
  "sentencia": "return None", "desde": "2026-08-22T04:00:00"}]
EOF
SUITE_DISCRIMINA_ROOTS="$LIMPIO" SUITE_DISCRIMINA_LEDGER="$TMP/mixto.json" \
    python3 "$GATE" --verificar >/dev/null 2>&1
afirmar "queda exactamente la entrada del archivo presente" "1" \
        "$(python3 -c "import json,sys; print(len(json.load(open(sys.argv[1]))))" "$TMP/mixto.json")"
afirmar "y la que sobrevive es la del archivo limpio" "api_error" \
        "$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))[0]['funcion'])" "$TMP/mixto.json")"

echo "== 14. CONTROL — una suite YA ROJA en arbol limpio no es control =="
# El defecto que este caso cierra: `any_suite_red` no tomaba baseline, asi que
# una suite que sale 1 SIN mutacion devolvia True siempre. El juez leia ese rojo
# pre-existente como "la mutacion se detecto" y publicaba `ok` — el sub-patron D
# cometido por el gate que existe para cazarlo.
#
# El positivo NO es fabricado: `test-script-naming.sh` sale 1 sobre el arbol
# limpio de hoy, y es la unica suite que nombra a `classify_agents.py`. Aqui se
# reproduce esa forma en un arbol sintetico para que el control pueda fallar sin
# depender de que esa deuda siga abierta.
BASELINE_ROJO="$TMP/baseline-rojo"; mkdir -p "$BASELINE_ROJO/src" "$BASELINE_ROJO/tests"
cat > "$BASELINE_ROJO/src/sujeto.py" <<'EOF'
def veredicto(x):
    """Tres retornos del mismo literal: candidata por construccion."""
    if x == 1:
        return None
    if x == 2:
        return None
    return None
EOF
# La suite NOMBRA al sujeto y sale 1 pase lo que pase: no informa de nada.
cat > "$BASELINE_ROJO/tests/test-siempre-roja.sh" <<'EOF'
#!/usr/bin/env bash
# nombra a sujeto.py y no lo ejerce
exit 1
EOF
salida14=$(SUITE_DISCRIMINA_ROOTS="$BASELINE_ROJO/src" \
           SUITE_DISCRIMINA_TESTS="$BASELINE_ROJO/tests" \
           SUITE_DISCRIMINA_LEDGER="$TMP/vacio14.json" \
           timeout 120 python3 "$GATE" 2>&1)
afirmar "una suite ya roja se reporta BASELINE ROJO, no ok" "1" \
        "$(printf '%s' "$salida14" | grep -c 'BASELINE ROJO')"
afirmar "y el titular la cuenta aparte" "1" \
        "$(printf '%s' "$salida14" | grep -c 'con baseline rojo')"

echo "== 13. el arbol real esta limpio y publica su denominador =="
salida12=$(python3 "$GATE" --verificar 2>&1); codigo12=$?
afirmar "--verificar sobre el arbol real sale 0" "0" "$codigo12"
afirmar "el titular publica su alcance medido" "1" \
        "$(printf '%s' "$salida12" | grep -c 'alcance medido: [0-9]\+ archivos .py')"

# ==============================================================================
# LA COTA DEL BARRIDO — H-THYROX-33, TASK-THYROX-0064
# ==============================================================================
# El defecto: el bucle de `main()` recorre TODOS los candidatos sin techo. Medido
# sobre el arbol real: 84 candidatos con suite, 612 corridas de suite, y a 180 s
# de tope cada una son 91.8 h en el peor caso. Un barrido que no termina INVITA a
# matarlo, y matarlo deja el mutante en el disco — ocurrio dos veces el mismo dia
# (`reach.py::env_file_path` devolviendo None incondicional, H-THYROX-33).
#
# La cota se comprueba ENTRE candidatos, nunca a mitad de `judge()`: cortar ahi
# dejaria el mutante escrito, que es exactamente el defecto que se cierra.
#
# El arbol sintetico tiene TRES candidatos, no dos: con dos, «juzga 1» y «juzga
# la mitad» son la misma cifra y el control no discriminaria un tope de 2.

_arbol_de_tres() {   # <destino>  -> un arbol con 3 candidatos y sus 3 suites
    local raiz="$1" n
    mkdir -p "$raiz/src" "$raiz/tests"
    for n in uno dos tres; do
        cat > "$raiz/src/sujeto_$n.py" <<EOF_SUJETO
def veredicto_$n(x):
    """Tres retornos del mismo literal: candidata por construccion."""
    if x == 1:
        return None
    if x == 2:
        return None
    return None
EOF_SUJETO
        # La suite NOMBRA a su sujeto y lo EJERCE: sin ejercerlo el juez la
        # reportaria sin cobertura y no mediria la cota.
        cat > "$raiz/tests/test-sujeto-$n.sh" <<EOF_SUITE
#!/usr/bin/env bash
# ejerce sujeto_$n.py
python3 -c "
import sys; sys.path.insert(0, '$raiz/src')
import sujeto_$n
assert sujeto_$n.veredicto_$n(1) is None
"
EOF_SUITE
    done
}

_juzgados() {   # <salida del gate>  -> el numero que su denominador declara
    printf '%s' "$1" | sed -n 's/.*, \([0-9]\+\) mutada(s) dos veces.*/\1/p'
}

_lineas_json() {   # <ledger>  -> 1 si toda linea no vacia es un objeto JSON
    python3 - "$1" <<'EOF_LINEAS'
import json, pathlib, sys
lineas = [l for l in pathlib.Path(sys.argv[1]).read_text().splitlines() if l.strip()]
print(int(bool(lineas) and all(isinstance(json.loads(l), dict) for l in lineas)))
EOF_LINEAS
}

_entero_no_json() {   # <ledger>  -> 1 si hay >=2 registros y el archivo no parsea
    python3 - "$1" <<'EOF_ENTERO'
import json, pathlib, sys
crudo = pathlib.Path(sys.argv[1]).read_text()
if len([l for l in crudo.splitlines() if l.strip()]) < 2:
    print(0)                      # con un solo registro no discrimina
else:
    try:
        json.loads(crudo); print(0)
    except json.JSONDecodeError:
        print(1)
EOF_ENTERO
}

echo "== 15. --limit acota los candidatos por ejecucion =="
COTA="$TMP/cota"; _arbol_de_tres "$COTA"
LEDGER15="$TMP/ledger15.jsonl"
salida15=$(SUITE_DISCRIMINA_ROOTS="$COTA/src" SUITE_DISCRIMINA_TESTS="$COTA/tests" \
           SUITE_DISCRIMINA_LEDGER="$LEDGER15" \
           timeout 180 python3 "$GATE" --limit 1 2>&1); codigo15=$?
afirmar "con --limit 1 se juzga exactamente uno" "1" "$(_juzgados "$salida15")"
# Exit 3, no 0 ni 1: un barrido truncado NO es completo, y publicar su veredicto
# como si lo fuera es el sub-patron D. La forma la fija `bounded_scan.py`, que
# ya declara su corte con 3.
afirmar "el corte se declara con exit 3, no con un verde" "3" "$codigo15"
afirmar "y el titular nombra la cota con su denominador" "1" \
        "$(printf '%s' "$salida15" | grep -c 'cota alcanzada: 1 de 3')"
# La mitad que hace util a la cota: al cortar, NADA queda en vuelo.
afirmar "al cortar no queda ningun mutante en vuelo" "0" \
        "$(SUITE_DISCRIMINA_ROOTS="$COTA/src" SUITE_DISCRIMINA_LEDGER="$LEDGER15" \
           python3 "$GATE" --verificar >/dev/null 2>&1; echo $?)"

echo "== 16. la segunda ejecucion AVANZA: no re-juzga lo ya juzgado =="
# Sin cursor, cada ejecucion acotada re-juzga los mismos primeros N y el barrido
# nunca progresa. El cursor es lo que convierte la cota en un barrido por tramos.
primero16=$(printf '%s' "$salida15" | grep -oE 'sujeto_(uno|dos|tres)\.py' | head -1)
salida16=$(SUITE_DISCRIMINA_ROOTS="$COTA/src" SUITE_DISCRIMINA_TESTS="$COTA/tests" \
           SUITE_DISCRIMINA_LEDGER="$LEDGER15" \
           timeout 180 python3 "$GATE" --limit 1 2>&1)
segundo16=$(printf '%s' "$salida16" | grep -oE 'sujeto_(uno|dos|tres)\.py' | head -1)
afirmar "la segunda tanda juzga OTRO candidato" "distinto" \
        "$([[ -n "$primero16" && "$primero16" != "$segundo16" ]] \
           && echo distinto || echo "igual:$primero16/$segundo16")"
afirmar "y el titular sigue declarando el universo entero" "1" \
        "$(printf '%s' "$salida16" | grep -c 'cota alcanzada: 1 de 3')"

echo "== 17. ANULACION de la cota — sin tope, los tres en una tanda =="
# El control que discrimina: si al retirar --limit el veredicto no cambiara, la
# cota seria codigo muerto y el verde del caso 15 no informaria nada.
LEDGER17="$TMP/ledger17.jsonl"
salida17=$(SUITE_DISCRIMINA_ROOTS="$COTA/src" SUITE_DISCRIMINA_TESTS="$COTA/tests" \
           SUITE_DISCRIMINA_LEDGER="$LEDGER17" \
           timeout 300 python3 "$GATE" 2>&1); codigo17=$?
afirmar "sin --limit se juzgan los tres" "3" "$(_juzgados "$salida17")"
afirmar "y no se declara ningun corte" "0" \
        "$(printf '%s' "$salida17" | grep -c 'cota alcanzada')"
afirmar "el exit vuelve a ser el del veredicto, no el del corte" "0" "$codigo17"

echo "== 18. el cursor CADUCA cuando el archivo cambia =="
# Un veredicto que sobreviviera a la edicion de su archivo dejaria al gate ciego
# justo sobre lo que acaba de cambiar — el sub-patron D con el cursor de sujeto.
# El cursor se ancla al CONTENIDO, no a la ruta.
#
# El caso NO depende de la salida del 16: fija su propio sujeto. Un control que
# se apoye en el grep de otro caso falla con un error de ruta en vez de con su
# asercion, y entonces no informa de lo que dice medir.
CURSOR="$TMP/cursor"; _arbol_de_tres "$CURSOR"
LEDGER18="$TMP/ledger18.jsonl"
SUITE_DISCRIMINA_ROOTS="$CURSOR/src" SUITE_DISCRIMINA_TESTS="$CURSOR/tests" \
    SUITE_DISCRIMINA_LEDGER="$LEDGER18" timeout 300 python3 "$GATE" >/dev/null 2>&1
# Con los tres ya juzgados y sin editar nada, una segunda tanda no juzga ninguno.
salida18a=$(SUITE_DISCRIMINA_ROOTS="$CURSOR/src" SUITE_DISCRIMINA_TESTS="$CURSOR/tests" \
            SUITE_DISCRIMINA_LEDGER="$LEDGER18" timeout 300 python3 "$GATE" 2>&1)
afirmar "sin cambios, la segunda tanda no vuelve a juzgar" "0" "$(_juzgados "$salida18a")"
# Y editado UNO, vuelve exactamente ese. Ni cero (cursor ciego a la edicion) ni
# tres (cursor inerte): las dos cifras equivocadas son distintas de la correcta.
printf '\n# una linea que cambia el contenido\n' >> "$CURSOR/src/sujeto_dos.py"
salida18b=$(SUITE_DISCRIMINA_ROOTS="$CURSOR/src" SUITE_DISCRIMINA_TESTS="$CURSOR/tests" \
            SUITE_DISCRIMINA_LEDGER="$LEDGER18" timeout 300 python3 "$GATE" 2>&1)
afirmar "editado uno, vuelve exactamente ese" "1" "$(_juzgados "$salida18b")"
afirmar "y es el editado, no otro" "1" \
        "$(printf '%s' "$salida18b" | grep -c 'sujeto_dos\.py')"

echo "== 19. --budget corta por reloj, y tampoco deja nada en vuelo =="
# --limit acota los CANDIDATOS; no acota el reloj, porque un solo candidato puede
# arrastrar 69 suites. El presupuesto es la cota que de verdad impide la muerte
# por timeout del harness.
LENTO="$TMP/lento"; _arbol_de_tres "$LENTO"
for n in uno dos tres; do printf 'sleep 3\n' >> "$LENTO/tests/test-sujeto-$n.sh"; done
LEDGER19="$TMP/ledger19.jsonl"
salida19=$(SUITE_DISCRIMINA_ROOTS="$LENTO/src" SUITE_DISCRIMINA_TESTS="$LENTO/tests" \
           SUITE_DISCRIMINA_LEDGER="$LEDGER19" \
           timeout 300 python3 "$GATE" --budget 1 2>&1); codigo19=$?
afirmar "el presupuesto agotado declara su corte con exit 3" "3" "$codigo19"
afirmar "y nombra el reloj, no el conteo" "1" \
        "$(printf '%s' "$salida19" | grep -c 'presupuesto agotado')"
afirmar "tras el corte por reloj no queda nada en vuelo" "0" \
        "$(SUITE_DISCRIMINA_ROOTS="$LENTO/src" SUITE_DISCRIMINA_LEDGER="$LEDGER19" \
           python3 "$GATE" --verificar >/dev/null 2>&1; echo $?)"

echo "== 20. el ledger es JSONL: se AÑADE, no se reescribe =="
# La directiva de thyrox es JSONL, y aqui ademas es mas seguro que el arreglo
# JSON: un append no puede pisar las entradas previas si el proceso muere a
# mitad de la escritura, y ese es justo el modo de muerte que el ledger existe
# para sobrevivir.
afirmar "el ledger de una tanda existe" "1" "$([[ -f "$LEDGER17" ]] && echo 1 || echo 0)"
afirmar "cada linea es un objeto JSON" "1" "$(_lineas_json "$LEDGER17")"
afirmar "con mas de un registro, el archivo ENTERO no es JSON" "1" \
        "$(_entero_no_json "$LEDGER17")"
# El nombre heredado se sigue LEYENDO, como en los manifiestos: un ledger .json
# de una sesion anterior no se pierde al actualizar el guion.
afirmar "un ledger heredado en .json se sigue leyendo" "1" \
        "$(SUITE_DISCRIMINA_ROOTS="$ARBOL" SUITE_DISCRIMINA_LEDGER="$TMP/ledger.json" \
           python3 "$GATE" --verificar 2>&1 | grep -c 'VIVO .*api_error()')"

echo "== 21. --solo IGNORA el cursor: es una peticion explicita =="
# El defecto que este caso cierra lo destapo la anulacion de la cota, no una
# relectura: con el cursor recien introducido, el control negativo del caso 6
# paso de «3 BASELINE ROJO» a «0» en su SEGUNDA corrida, y su salida no decia
# nada. Un gate que calla lo que se le pregunta por nombre es peor que uno lento.
SOLO="$TMP/solo"; _arbol_de_tres "$SOLO"
LEDGER21="$TMP/ledger21.jsonl"
for _ in 1 2; do
    salida21=$(SUITE_DISCRIMINA_ROOTS="$SOLO/src" SUITE_DISCRIMINA_TESTS="$SOLO/tests" \
               SUITE_DISCRIMINA_LEDGER="$LEDGER21" \
               timeout 180 python3 "$GATE" --solo sujeto_uno.py 2>&1)
done
afirmar "la SEGUNDA corrida de --solo vuelve a juzgar" "1" "$(_juzgados "$salida21")"
# Y el control que discrimina: SIN --solo, el mismo candidato ya juzgado se salta.
salida21b=$(SUITE_DISCRIMINA_ROOTS="$SOLO/src" SUITE_DISCRIMINA_TESTS="$SOLO/tests" \
            SUITE_DISCRIMINA_LEDGER="$LEDGER21" timeout 300 python3 "$GATE" 2>&1)
afirmar "sin --solo, ese mismo candidato si se salta" "1" \
        "$(printf '%s' "$salida21b" | grep -c '1 ya juzgada(s) sin cambio')"

echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))
