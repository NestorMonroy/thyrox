#!/usr/bin/env bash
# Pruebas de `agent_store.py fechar-documentos` — el eje temporal, pieza 2 de 3.
#
# H-DOCS-411 recogió la corrección del ejecutor: el plazo de conservación corre
# sobre el DOCUMENTO, no sobre la tarea. Su eje temporal es el bloque
# `.. meta::`, no un `closed_at` de `tasks`.
#
# La medición que decide el diseño (evento disparador-documental-20260824T215930):
#
#   664 de 4581 (14.5 %) declaran :fecha_actualizacion:
#   de esas 664: 623 ATRASADAS respecto del commit, 41 el mismo día, 0 ADELANTADAS
#   mediana del atraso: 56 días
#
# Dos conclusiones, y la segunda es la que fija la dirección:
#
#   (a) la clave NO puede ser el disparador sola — cubre el 14.5 % del universo;
#   (b) el disparador toma la cota MÁS TARDÍA de las disponibles, no la más
#       temprana. Es el INVERSO de la pieza 1, y no por gusto: lo decide qué
#       cuesta el error de cada lado. Un disparador demasiado temprano arranca
#       el reloj antes de tiempo y el documento se depura ANTES de que su plazo
#       venza — pérdida irreversible. Uno demasiado tardío sólo cuesta
#       almacenamiento. Ante una asimetría así, la cota segura es el máximo.
#
# CASO 4 es el DISCRIMINADOR de esa dirección. Si alguien copiara la pieza 1 y
# tomara el mínimo, TODOS los demás casos seguirían pasando —porque 0 claves van
# adelantadas en el árbol real, así que min y max coinciden en el 100 % de los
# pares medidos— y sólo caería éste. Por eso su segundo documento fabrica la
# única forma que el repo no tiene hoy: una clave POSTERIOR a su commit.
#
# CASO 7 es el control del sub-patrón D: un documento sin ninguna cota queda en
# NULO. Un hueco declarado y un hueco rellenado se leen igual en una columna, y
# sólo el primero es honesto.

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
REPO="$TMP/repo"
mkdir -p "$CLAUDE_DIR"

leer() {  # leer <path> <columna>
    python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
r=list(c.execute(f'SELECT {sys.argv[3]} FROM documents WHERE path=?',(sys.argv[2],)))
print('AUSENTE' if not r else ('NULO' if r[0][0] is None else r[0][0]))
" "$DB" "$1" "$2"
}

doc() {  # doc <ruta-rel> <fecha-declarada|-> <cuerpo>
    local ruta="$REPO/source/$1"
    mkdir -p "$(dirname "$ruta")"
    {
        echo '.. meta::'
        echo '   :autor: Equipo Kaupamex'
        [[ "$2" != "-" ]] && echo "   :fecha_actualizacion: $2"
        echo
        echo "$3"
        echo '========'
    } > "$ruta"
}

commit_en() {  # commit_en <fecha-iso> <mensaje>
    GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" \
        git -C "$REPO" -c user.email=t@t -c user.name=t commit -q -m "$2"
}

echo "== test-agent-store-fecha-documento =="

# --- 1 · sintaxis -----------------------------------------------------------
python3 -m py_compile "$STORE" 2>/dev/null
afirmar "1 el modulo compila" "0" "$?"

# --- 2 · la tabla existe tras conectar --------------------------------------
python3 "$STORE" init --claude-dir "$CLAUDE_DIR" >/dev/null 2>&1
TIENE=$(python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
print(1 if list(c.execute(\"select 1 from sqlite_master where type='table' and name='documents'\")) else 0)
" "$DB")
afirmar "2 la tabla documents existe tras conectar" "1" "$TIENE"

# --- 3 · siembra ------------------------------------------------------------
mkdir -p "$REPO/source"
git -C "$REPO" init -q

#  a · clave VIEJA, commit NUEVO  -> gana el commit
doc "a-clave-vieja.rst" "2026-01-10T00:00:00" "A"
#  b · clave FUTURA respecto del commit -> gana la clave (el discriminador)
doc "b-clave-futura.rst" "2026-12-31T00:00:00" "B"
#  c · sin clave -> sólo hay commit
doc "c-sin-clave.rst" "-" "C"
#  d · clave del MISMO día que el commit -> ambas
doc "d-mismo-dia.rst" "2026-06-15T09:00:00" "D"
git -C "$REPO" add -A
commit_en "2026-06-15T18:00:00" "seed"

#  e · sin clave y SIN commit (untracked) -> sin ninguna cota
doc "e-sin-nada.rst" "-" "E"
#  f · con clave y SIN commit -> la clave es la única cota
doc "f-solo-clave.rst" "2026-03-03T00:00:00" "F"

N=$(find "$REPO/source" -name '*.rst' | wc -l)
afirmar "3 seis documentos sembrados" "6" "$N"

# --- 4 · DISCRIMINADOR: gana la MÁS TARDÍA ----------------------------------
python3 "$STORE" fechar-documentos --claude-dir "$CLAUDE_DIR" --repo-docs "$REPO" >/dev/null 2>&1
afirmar "4a clave vieja  -> gana el commit"      "git-commit"     "$(leer source/a-clave-vieja.rst updated_at_source)"
afirmar "4b clave futura -> gana la clave"       "meta-declarada" "$(leer source/b-clave-futura.rst updated_at_source)"
afirmar "4c el valor de b es el declarado"       "2026-12-31T00:00:00" "$(leer source/b-clave-futura.rst updated_at)"

# --- 5 · mismo día -> ambas -------------------------------------------------
afirmar "5 mismo dia -> ambas"                   "ambas"          "$(leer source/d-mismo-dia.rst updated_at_source)"

# --- 6 · sin clave ----------------------------------------------------------
afirmar "6a sin clave -> git-commit"             "git-commit"     "$(leer source/c-sin-clave.rst updated_at_source)"
afirmar "6b sin clave -> declared_at NULO"       "NULO"           "$(leer source/c-sin-clave.rst declared_at)"

# --- 7 · CONTROL D: sin ninguna cota -> NULO, no fecha inventada ------------
afirmar "7a sin cota -> updated_at NULO"         "NULO"           "$(leer source/e-sin-nada.rst updated_at)"
afirmar "7b sin cota -> source NULO"             "NULO"           "$(leer source/e-sin-nada.rst updated_at_source)"
afirmar "7c la fila EXISTE (no se omite)"        "NULO"           "$(leer source/e-sin-nada.rst commit_at)"

# --- 8 · una sola cota ------------------------------------------------------
afirmar "8a solo clave -> meta-declarada"        "meta-declarada" "$(leer source/f-solo-clave.rst updated_at_source)"
afirmar "8b solo clave -> commit_at NULO"        "NULO"           "$(leer source/f-solo-clave.rst commit_at)"

# --- 9 · las dos cotas quedan guardadas, no sólo la ganadora ----------------
afirmar "9a a conserva su declarada"             "2026-01-10T00:00:00" "$(leer source/a-clave-vieja.rst declared_at)"
NOVACIO=$(python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
r=list(c.execute(\"select commit_at from documents where path='source/a-clave-vieja.rst'\"))
print(1 if r and r[0][0] and r[0][0].startswith('2026-06-15') else 0)
" "$DB")
afirmar "9b a conserva su commit"                "1"              "$NOVACIO"

# --- 10 · idempotencia ------------------------------------------------------
python3 "$STORE" fechar-documentos --claude-dir "$CLAUDE_DIR" --repo-docs "$REPO" >/dev/null 2>&1
afirmar "10a idempotente en la fuente"           "git-commit"     "$(leer source/a-clave-vieja.rst updated_at_source)"
FILAS=$(python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1]); print(list(c.execute('select count(*) from documents'))[0][0])
" "$DB")
afirmar "10b sin filas duplicadas"               "6"              "$FILAS"

# --- 11 · denominador junto al conteo ---------------------------------------
SALIDA=$(python3 "$STORE" fechar-documentos --claude-dir "$CLAUDE_DIR" --repo-docs "$REPO" --dry-run 2>&1)
echo "$SALIDA" | grep -q "alcance medido"
afirmar "11a --dry-run publica denominador"      "0" "$?"
echo "$SALIDA" | grep -qi "sin ninguna cota"
afirmar "11b --dry-run nombra los sin cota"      "0" "$?"

# --- 12 · --dry-run no escribe ----------------------------------------------
rm -f "$DB"* 2>/dev/null
python3 "$STORE" fechar-documentos --claude-dir "$CLAUDE_DIR" --repo-docs "$REPO" --dry-run >/dev/null 2>&1
# La tabla puede NO existir: un dry-run puro ni siquiera abre el store, asi que
# tampoco corre el schema. Ausente y vacia son la misma afirmacion —"no escribio
# ninguna fila"— y el control sigue discriminando: si el dry-run escribiera,
# habria 6.
VACIO=$(python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
try:
    print(list(c.execute('select count(*) from documents'))[0][0])
except sqlite3.OperationalError:
    print(0)
" "$DB")
afirmar "12 --dry-run no escribe filas"          "0"              "$VACIO"

# --- 13 · el barrido NO reescribe la fila que no se movio -------------------
# El defecto que esta seccion cierra: `scanned_at` se estampaba con `now()` en
# CADA barrido, asi que recorrer un arbol intacto reescribia el registro entero.
# Medido sobre el store vivo antes del arreglo (banco
# `churn-de-documents-20260918T000003`): segundo barrido con el arbol intacto,
# 5689 filas TOCADAS y 0 MOVIDAS — el 100 % del churn era esa columna.
#
# El control discrimina porque el barrido publica ahora cuantas filas ESCRIBIO,
# no cuantas recorrio. Sin la guarda `WHERE` del upsert, un UPDATE con valores
# identicos sigue contando como escritura y esta asercion cae.
# El caso 12 borro el store, asi que el PRIMER barrido de aqui vuelve a
# sembrar las seis filas — y ese primero no discrimina: mezcla movimiento real
# con reescritura. El discriminador es el SEGUNDO, con el arbol intacto entre
# los dos. Confundirlos fue el defecto que la tarjeta de #373 tenia escrito.
python3 "$STORE" fechar-documentos --claude-dir "$CLAUDE_DIR" \
    --repo-docs "$REPO" >/dev/null 2>&1
ESCRITAS=$(python3 "$STORE" fechar-documentos --claude-dir "$CLAUDE_DIR" \
    --repo-docs "$REPO" 2>&1 | sed -n 's/.*filas escritas: \([0-9]*\) .*/\1/p')
afirmar "13a un barrido sobre arbol intacto no escribe" "0" "$ESCRITAS"

# Control positivo del mismo instrumento: si algo SI se movio, lo escribe. Sin
# el, un `WHERE` que rechazara toda escritura publicaria el mismo 0 y 13a no
# distinguiria «no habia nada que escribir» de «el barrido dejo de escribir».
doc "g-nueva.rst" "2026-07-07T00:00:00" "G"
ESCRITAS=$(python3 "$STORE" fechar-documentos --claude-dir "$CLAUDE_DIR" \
    --repo-docs "$REPO" 2>&1 | sed -n 's/.*filas escritas: \([0-9]*\) .*/\1/p')
afirmar "13b un documento nuevo SI se escribe"        "1" "$ESCRITAS"

# --- 14 · `scanned_at` no es del registro: es del cache ---------------------
# «cuando mire» no es dato del documento, y es la UNICA columna incompatible
# con 13a: su valor cambia por definicion en cada recorrido, asi que conservarla
# y no reescribir la fila intacta son dos cosas que no pueden coexistir.
# Medido al retirarla: 0 lectores fuera de `agent_store.py` en src/, tests/ y bin/.
TIENE_SCANNED=$(python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
print(1 if any(r[1]=='scanned_at' for r in c.execute('PRAGMA table_info(documents)')) else 0)
" "$DB")
afirmar "14 scanned_at ya no es columna de documents"  "0" "$TIENE_SCANNED"

# --- 15 · CONTROL DE LA MIGRACION, no del esquema ---------------------------
# El caso 14 mide un store NACIDO de CORE_SCHEMA, donde la columna ya no se
# declara: nunca ejercita la migracion. Un store ANTERIOR si la tiene, y es el
# unico sujeto que puede distinguir «el esquema cambio» de «los stores que ya
# existian se migran». Sin este caso, retirar la migracion deja la suite verde.
VIEJO="$TMP/viejo/agent-results"
mkdir -p "$VIEJO"
python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1] + '/agent_store.sqlite3')
c.execute('CREATE TABLE documents (path TEXT PRIMARY KEY, updated_at TEXT, '
          'updated_at_source TEXT, declared_at TEXT, commit_at TEXT, '
          'scanned_at TEXT NOT NULL)')
c.execute(\"INSERT INTO documents VALUES ('source/v.rst','2026-01-01','git-commit',NULL,'2026-01-01','2026-01-01')\")
c.commit()" "$VIEJO"
python3 "$STORE" init --claude-dir "$VIEJO" >/dev/null 2>&1
MIGRADA=$(python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1] + '/agent_store.sqlite3')
print(1 if any(r[1]=='scanned_at' for r in c.execute('PRAGMA table_info(documents)')) else 0)" "$VIEJO")
afirmar "15a la migracion retira la columna de un store previo" "0" "$MIGRADA"
# Y NO se lleva la fila por delante: retirar una columna no es vaciar la tabla.
SOBREVIVE=$(python3 -c "
import sqlite3,sys
c=sqlite3.connect(sys.argv[1] + '/agent_store.sqlite3')
print(list(c.execute(\"select updated_at_source from documents where path='source/v.rst'\"))[0][0])" "$VIEJO")
afirmar "15b la fila previa sobrevive a la migracion" "git-commit" "$SOBREVIVE"

echo
echo "  $OK ok · $FALLO fallas"
[[ $FALLO -eq 0 ]]
