#!/usr/bin/env bash
# Escribe el `.env` de este clon derivando cada valor del árbol real.
#
# Es la mitad que faltaba de la DEC-04. Los lectores estaban cableados —12
# archivos leen `THYROX_ROOT` / `THYROX_ENV_FILE`— y **ningún** escritor
# declaraba nada, así que la segunda entrada era una rama que nunca se ejecutó y
# todo consumidor caía al ascenso, que es el último recurso.
#
# `.env` SÍ se versiona desde 2026-09-10 (directiva del ejecutor). Antes decía
# aquí que no, por la DEC-04 aplicada a sí misma: su valor es del CONSUMIDOR.
# Ese razonamiento no se retira, se paga — un clon en otra ruta hereda el
# `THYROX_ROOT` de este árbol, y quien clone corre `--force` para reescribirlo.
# El contrato sigue siendo `.env.example`; ahora además se lee el valor vigente.
#
# Salidas: 0 escrito · 1 ya existía y no se pisa (usar --force) · 2 no pudo
# derivar la raíz.
set -euo pipefail

_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/${THYROX_LOCATOR:-src/paths/reach.py}" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
if [[ ! -f "$_thyrox_root/${THYROX_LOCATOR:-src/paths/reach.py}" ]]; then
    echo "write-env: no se pudo derivar la raíz de thyrox. NO se escribe un" >&2
    echo "  .env a medias: un valor equivocado es peor que ninguno, porque el" >&2
    echo "  ascenso deja de correr y nadie ve por qué." >&2
    exit 2
fi
source "$_thyrox_root/${THYROX_LIB_REACH:-src/lib/reach.sh}"

FORCE=false; DEST=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --force)  FORCE=true; shift ;;
        --out)    DEST="$2"; shift 2 ;;
        -h|--help)
            sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
            exit 0 ;;
        -*) echo "write-env: opción desconocida: $1" >&2; exit 2 ;;
        *)  echo "write-env: argumento inesperado: $1" >&2; exit 2 ;;
    esac
done

ROOT="$(thyrox_root)" || exit 2
TREE="$(thyrox_tree_root)" || TREE=""
DEST="${DEST:-$ROOT/.env}"

if [[ -f "$DEST" && "$FORCE" != true ]]; then
    echo "write-env: $DEST ya existe y NO se pisa — puede llevar valores que" >&2
    echo "  este clon eligió a mano. Pasar --force para reescribirlo." >&2
    exit 1
fi

# Las claves que ESTE guion emite. Se declaran una vez para que la
# conservacion de abajo sepa que es suyo y que es del ejecutor.
OWNED=(THYROX_ROOT THYROX_REACH_ROOT THYROX_LOCATOR THYROX_LIB_REACH
       THYROX_LAYER_SIGNALS THYROX_WORKBENCH_DIR THYROX_JOBS_DIR)

# Lo que el guion NO puede derivar se conserva. Una clave de POLITICA —el hogar
# por clon de una familia, `THYROX_JOBS_API`, cuyo valor decide el ejecutor— no
# sale del arbol: sale de una decision. Borrarla en cada `--force` convertia la
# segunda entrada de la DEC-04 en una nota que caduca, y el fallo era silencioso:
# el `.env` seguia siendo valido, sólo que sin la declaracion.
#
# Se lee ANTES del `>`, que trunca. Las claves propias NO se conservan: se
# regeneran, que es para lo que existe `--force`.
PRESERVED=""
if [[ -f "$DEST" ]]; then
    PRESERVED="$(awk -v owned="${OWNED[*]}" '
        BEGIN { split(owned, o, " "); for (i in o) mine[o[i]] = 1 }
        /^THYROX_[A-Z0-9_]*=/ {
            k = substr($0, 1, index($0, "=") - 1)
            if (!(k in mine)) print
        }' "$DEST")"
fi

{
    echo "# Generado por src/session/write-env.sh — $(date -u +%Y-%m-%dT%H:%M:%S)"
    echo "# El contrato y el significado de cada clave: .env.example"
    echo "THYROX_ROOT=$ROOT"
    [[ -n "$TREE" ]] && echo "THYROX_REACH_ROOT=$TREE"
    echo "THYROX_LOCATOR=${THYROX_LOCATOR:-src/paths/reach.py}"
    echo "THYROX_LIB_REACH=${THYROX_LIB_REACH:-src/lib/reach.sh}"
    # Sin esta clave el derivador de capa se APAGA entero y toda tarea
    # aterriza en la capa desconocida — no falla, devuelve el hueco, que se
    # lee como «no habia señal». Se emite aqui o el proximo regenerado la
    # borra del `.env` y el defecto vuelve en silencio.
    echo "THYROX_LAYER_SIGNALS=${THYROX_LAYER_SIGNALS:-src/task/layer_signals.tsv}"
    # El hogar del banco de evidencia, ABSOLUTO y derivado del arbol — nunca
    # un segmento relativo. Anclar una relativa al proveedor es la via por la
    # que L-028 midio once bancos perdidos, y el proveedor es ademas el unico
    # caso que `workbench_dir()` NO puede resolver por ascenso: su marcador no
    # lo distingue de un consumidor, asi que rehusa. Con la clave declarada
    # devuelve el valor tal cual (`paths.py:257`).
    #
    # Solo se emite cuando el destino es el `.env` DEL PROVEEDOR: en el `.env`
    # de un consumidor este valor seria el hogar de otro arbol, que es el
    # defecto que la familia `THYROX_WORKBENCH_<CLON>` existe para evitar.
    if [[ "$DEST" == "$ROOT/.env" ]]; then
        echo "THYROX_WORKBENCH_DIR=${THYROX_WORKBENCH_DIR:-$ROOT/.claude/workbench}"
        # El hogar de los TRABAJOS, hermano del banco y con la misma guarda.
        # Sin el, `jobs_dir()` cae al default y devuelve un SEGMENTO relativo
        # —`.claude/jobs`— que resuelve contra el CWD. El de cada consumidor
        # vive en SU `.env` como `THYROX_JOBS_<CLON>`; aqui va solo el propio.
        echo "THYROX_JOBS_DIR=${THYROX_JOBS_DIR:-$ROOT/.claude/jobs}"
    fi
    if [[ -n "$PRESERVED" ]]; then
        echo
        echo "# Declaradas por el ejecutor — este guion no las deriva, sólo las"
        echo "# conserva. Su significado, en .env.example."
        printf '%s\n' "$PRESERVED"
    fi
} > "$DEST"

echo "write-env: escrito $DEST ($(grep -c '^[A-Z]' "$DEST") clave(s) declarada(s))"
