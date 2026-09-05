#!/usr/bin/env bash
# Pruebas de `agent_store.py clasificar-documentos` — el eje temporal, pieza 3.
#
# Un catálogo de disposición documental NO clasifica archivos sueltos: clasifica
# SERIES. H-DOCS-411 re-encuadró #765 sobre eso, y la pregunta previa a cualquier
# plazo es qué agrupa una serie.
#
# Medido (evento unidad-de-conservacion-*), ninguno de los cuatro ejes simples
# particiona el fondo:
#
#   iniciativa        272 series · deja 1932 documentos (42 %) SIN serie
#   tipo de artefacto  13 series · su mayor es `otro` con 1116 (24 %)
#   ruta funcional     16 series · `gestion` se traga 3147 (69 %)
#   submódulo          11 series · sólo cubre pm/, deja 1438 fuera
#
# El COMPUESTO sí: 47 series, mediana 11, la mayor concentra 15 %, 11 unitarias.
# Y no es una invención — es la estructura de dos niveles que la norma usa:
# sección (la función) → serie (el tipo documental).
#
# CASO 4 es el DISCRIMINADOR de que la serie sea COMPUESTA. Dos documentos del
# MISMO tipo en secciones distintas caen en series DISTINTAS. Un comando que
# clasificara sólo por tipo —o sólo por sección— pasaría todo lo demás y sólo
# caería aquí.
#
# CASO 6 es el control del sub-patrón D: un tipo que no está en el vocabulario
# cae en `otro` DECLARADO, no en NULL silencioso. `otro` es un veredicto —"no
# reconozco este tipo"— y NULL sería "no miré".

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

STORE=.claude/scripts/agents/agent_store.py
OK=0; FALLO=0
afirmar() {
    if [[ "$2" == "$3" ]]; then printf '  ok    %s\n' "$1"; (( OK++ ))
    else printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ )); fi
}
cleanup() { [[ -n "${TMP:-}" ]] && rm -rf "$TMP"; }
trap cleanup EXIT
TMP=$(mktemp -d); CLAUDE_DIR="$TMP/.claude/agent-results"; DB="$CLAUDE_DIR/agent_store.sqlite3"
REPO="$TMP/repo"; mkdir -p "$CLAUDE_DIR"

leer() {
    python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
r=list(c.execute(f'SELECT {sys.argv[3]} FROM documents WHERE path=?',(sys.argv[2],)))
print('AUSENTE' if not r else ('NULO' if r[0][0] is None else r[0][0]))
" "$DB" "$1" "$2"
}
doc() { mkdir -p "$(dirname "$REPO/source/$1")"; printf '.. meta::\n   :autor: x\n\nT\n=\n' > "$REPO/source/$1"; }

echo "== test-agent-store-clasificar-documentos =="

python3 -m py_compile "$STORE" 2>/dev/null
afirmar "1 el modulo compila" "0" "$?"

python3 "$STORE" init --claude-dir "$CLAUDE_DIR" >/dev/null 2>&1
TIENE=$(python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
cols=[r[1] for r in c.execute('pragma table_info(documents)')]
print(1 if 'section' in cols and 'series' in cols else 0)
" "$DB")
afirmar "2 columnas section/series tras conectar" "1" "$TIENE"

# --- 3 · siembra: el discriminador necesita MISMO tipo en secciones distintas
mkdir -p "$REPO/source"; git -C "$REPO" init -q
doc "gestion/pm/docs/iniciativas/x/analisis-uno.rst"
doc "requisitos/casos-uso/analisis-dos.rst"          # MISMO tipo, otra sección
doc "gestion/pm/docs/iniciativas/x/hallazgos/hallazgo-H-DOCS-1-y.rst"
doc "arquitectura-tecnica/modulos/vista-de-modulos.rst"   # tipo desconocido
git -C "$REPO" add -A
git -C "$REPO" -c user.email=t@t -c user.name=t commit -q -m seed
afirmar "3 cuatro documentos sembrados" "4" "$(find "$REPO/source" -name '*.rst' | wc -l)"

python3 "$STORE" clasificar-documentos --claude-dir "$CLAUDE_DIR" --repo-docs "$REPO" >/dev/null 2>&1

# --- 4 · DISCRIMINADOR: la serie es COMPUESTA -------------------------------
A=$(leer source/gestion/pm/docs/iniciativas/x/analisis-uno.rst series)
B=$(leer source/requisitos/casos-uso/analisis-dos.rst series)
afirmar "4a mismo tipo, seccion gestion"     "gestion/analisis"   "$A"
afirmar "4b mismo tipo, seccion requisitos"  "requisitos/analisis" "$B"
[[ "$A" != "$B" ]]
afirmar "4c y por tanto son series DISTINTAS" "0" "$?"

# --- 5 · las dos mitades quedan legibles por separado -----------------------
afirmar "5a section"  "gestion"  "$(leer source/gestion/pm/docs/iniciativas/x/analisis-uno.rst section)"
afirmar "5b el tipo sale del nombre, no de la ruta" "requisitos/analisis" "$B"
afirmar "5c hallazgo bajo su seccion" "gestion/hallazgo" \
        "$(leer source/gestion/pm/docs/iniciativas/x/hallazgos/hallazgo-H-DOCS-1-y.rst series)"

# --- 6 · CONTROL D: tipo desconocido -> `otro` DECLARADO, no NULO -----------
afirmar "6a tipo desconocido -> otro"  "arquitectura-tecnica/otro" \
        "$(leer source/arquitectura-tecnica/modulos/vista-de-modulos.rst series)"
afirmar "6b y NO queda en NULO"        "arquitectura-tecnica" \
        "$(leer source/arquitectura-tecnica/modulos/vista-de-modulos.rst section)"

# --- 7 · idempotencia -------------------------------------------------------
python3 "$STORE" clasificar-documentos --claude-dir "$CLAUDE_DIR" --repo-docs "$REPO" >/dev/null 2>&1
afirmar "7a idempotente" "gestion/analisis" "$A"
afirmar "7b sin filas duplicadas" "4" "$(python3 -c "
import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); print(list(c.execute('select count(*) from documents'))[0][0])" "$DB")"

# --- 8 · no pisa las columnas de fecha --------------------------------------
python3 "$STORE" fechar-documentos --claude-dir "$CLAUDE_DIR" --repo-docs "$REPO" >/dev/null 2>&1
python3 "$STORE" clasificar-documentos --claude-dir "$CLAUDE_DIR" --repo-docs "$REPO" >/dev/null 2>&1
NOVACIO=$(python3 -c "
import sqlite3,sys; c=sqlite3.connect(sys.argv[1])
r=list(c.execute(\"select updated_at_source from documents where path='source/gestion/pm/docs/iniciativas/x/analisis-uno.rst\"\"'\"))
print(1 if r and r[0][0] else 0)" "$DB")
afirmar "8 clasificar no borra la fecha" "1" "$NOVACIO"

# --- 9 · denominador + series publicadas ------------------------------------
SALIDA=$(python3 "$STORE" clasificar-documentos --claude-dir "$CLAUDE_DIR" --repo-docs "$REPO" --dry-run 2>&1)
echo "$SALIDA" | grep -q "alcance medido"
afirmar "9a publica denominador" "0" "$?"
echo "$SALIDA" | grep -qE "[0-9]+ serie"
afirmar "9b publica cuantas series salieron" "0" "$?"

# --- 10 · el plazo NO se inventa: queda NULO y bloqueado por #760 -----------
afirmar "10 el plazo queda NULO (bloqueado por #760)" "NULO" \
        "$(leer source/gestion/pm/docs/iniciativas/x/analisis-uno.rst retention_years)"

echo; echo "  $OK ok · $FALLO fallas"
[[ $FALLO -eq 0 ]]
