#!/usr/bin/env bash
# Pruebas de check_suite_discrimina.py (#613, H-DOCS-241).
#
# EL INSTRUMENTO SE PRUEBA CONTRA POSITIVOS REALES DEL REPO, no fabricados
# (`hallazgo-abierto-genera-sucesor.md`): un incumplidor escrito por quien
# escribio el patron hereda su encuadre y confirma el instrumento en vez de
# medirlo. Los dos positivos de aqui existen en el arbol:
#
#   - `reconciliar_store.py::_veredicto` — la funcion de H-DOCS-224, con tres
#     retornos de ('running', None). El detector DEBE verla como candidata.
#   - `clasificar_agentes.py` — tres funciones que `test-script-naming.sh`
#     nombra sin ejecutar. El juez DEBE reportarlas SIN COBERTURA.
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
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

GATE=.claude/scripts/gates/check_suite_discrimina.py
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

echo "== 2. CONTROL POSITIVO del detector — _veredicto, la funcion de H-DOCS-224 =="
# Sin la rama IfExp de literals_of el conteo seria 2, no 3: el retorno final de
# _veredicto es un ternario, y ahi vive la mitad tardia del literal ambiguo.
# Esta asercion es la que atrapo al detector v2, que declaraba NADA sobre su
# propio control positivo.
sitios=$(python3 - "$GATE" <<'PY'
import ast, importlib.util, pathlib, sys
spec = importlib.util.spec_from_file_location("csd", sys.argv[1])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
arbol = ast.parse(pathlib.Path(".claude/scripts/agents/reconciliar_store.py").read_text())
fn = next(n for n in ast.walk(arbol)
          if isinstance(n, ast.FunctionDef) and n.name == "_veredicto")
print(m.ambiguous_literals(fn).get("('running', None)", 0))
PY
)
afirmar "_veredicto: el literal sale de 3 sitios de retorno" "3" "$sitios"

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
# test-script-naming.sh crea un archivo VACIO llamado clasificar_agentes.py en un
# arbol temporal — lo nombra sin correrlo nunca. Por eso el veredicto no sale de
# esta lista sino del sabotaje. Declarar la limitacion aqui la vuelve auditable.
nombra=$(python3 - "$GATE" <<'PY'
import importlib.util, pathlib, sys
spec = importlib.util.spec_from_file_location("csd", sys.argv[1])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
suites = m.suites_naming(pathlib.Path(".claude/scripts/agents/clasificar_agentes.py"))
print("si" if any(s.name == "test-script-naming.sh" for s in suites) else "no")
PY
)
afirmar "una suite que solo MENCIONA el archivo entra en la cota superior" "si" "$nombra"

echo "== 5. el juez NO reporta lo que ya se cerro (register_agent_session) =="
# Sus tres funciones estaban SIN DISCRIMINAR hasta que H-DOCS-241 les puso
# aserciones. Si esto vuelve a reportar, la cobertura se perdio.
salida=$(timeout 300 python3 "$GATE" --solo register_agent_session.py 2>&1 | head -1)
afirmar "register_agent_session: 0 sin discriminar" \
        "check-suite-discrimina: 0 sin discriminar, 0 sin cobertura" "$salida"

echo "== 6. CONTROL NEGATIVO — el juez SI reporta un positivo real del repo =="
# `test-script-naming.sh` crea un archivo VACIO llamado clasificar_agentes.py
# (caso 4 de arriba) — lo nombra y no lo corre. Asi que el sabotaje de sus
# funciones no enrojece a nadie, y ese es el veredicto que el juez debe emitir.
# El positivo ejercita `judge()` ENTERA: la mutacion se escribe, la suite se
# corre, y el archivo se restaura. Si esto deja de reportar, el instrumento se
# quedo ciego.
salida6=$(timeout 300 python3 "$GATE" --solo clasificar_agentes.py 2>&1)
afirmar "clasificar_agentes se reporta SIN COBERTURA (el juez puede fallar)" "3" \
        "$(printf '%s' "$salida6" | grep -c 'SIN COBERTURA    clasificar_agentes.py')"
# Y el conteo del titular concuerda con las filas: un titular que dijera 0 con
# tres filas debajo seria el mismo defecto que este guion caza, en su reporte.
afirmar "el titular concuerda con las filas que imprime" "1" \
        "$(printf '%s' "$salida6" | grep -c '^check-suite-discrimina: 0 sin discriminar, 3 sin cobertura$')"

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

echo "== 13. el arbol real esta limpio y publica su denominador =="
salida12=$(python3 "$GATE" --verificar 2>&1); codigo12=$?
afirmar "--verificar sobre el arbol real sale 0" "0" "$codigo12"
afirmar "el titular publica su alcance medido" "1" \
        "$(printf '%s' "$salida12" | grep -c 'alcance medido: [0-9]\+ archivos .py')"

echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))
