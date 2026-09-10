#!/usr/bin/env bash
# reach.sh — la raiz de thyrox y el padre de los clones, para guiones de shell.
#
# Por que existe. `src/paths/reach.py` ya toma esta decision con su precedencia
# completa —variable del proceso, declaracion del `.env`, ascenso por marcador,
# hermano validado—, pero un `.sh` no puede preguntarle sin localizarlo antes.
# Trece guiones resolvieron ese huevo-y-gallina cada uno por su cuenta, con
# `$(dirname "${BASH_SOURCE[0]}")/../../..`, y esa cadena es exactamente lo que
# la mudanza a thyrox invalido: calibrada para la profundidad que tenian en
# `kaupamex-docs/.claude/scripts/`, desde `thyrox/src/<familia>/` aterriza en el
# PADRE de los clones.
#
# Y el fallo es silencioso, que es lo caro: `/home/user` existe, asi que el
# guion no revienta — mide el arbol equivocado y publica su cero. Medido al
# escribir esto: 65 guiones (8 en `src/`, 57 en `tests/legacy/`).
#
# El ascenso por marcador que hace este archivo es el minimo imprescindible —
# sin hallar `reach.py` no hay a quien preguntar—; toda la precedencia que
# viene despues se delega, no se reimplementa. Es la conducta que el docstring
# de `--thyrox-root` prescribe.
#
# Uso:
#   source "<ruta a este archivo>"
#   ROOT="$(thyrox_root)"        # la raiz de thyrox
#   TREE="$(thyrox_tree_root)"   # el padre de los clones
#
# Ambas REHUSAN con codigo 2 y un motivo en stderr en vez de imprimir una ruta
# plausible: un consumidor que recibiera una ruta inexistente seguiria en verde
# apuntando al vacio, que es el defecto que este archivo cierra.

#: El marcador por el que se reconoce la raiz al ascender. Es un ARCHIVO y no
#: el nombre del directorio a proposito, igual que `THYROX_MARKER` en la mitad
#: Python: un clon renombrado sigue siendo thyrox, y un directorio llamado
#: `thyrox` sin el mecanismo dentro no lo es.
#:
#: Va por CONSTANTE con su entrada de entorno, no cableado (DEC-04): quien
#: reestructure thyrox declara `THYROX_LOCATOR` y el mecanismo lo sigue. Un
#: literal fijo aqui le quitaria al consumidor la decision de donde van las
#: cosas — que es el mismo defecto que la aritmetica `parents[3]`, sin la
#: aritmetica.

# Guard de doble inclusion — mecanismo tomado de `vvv: provision/provisioners.sh:5-8`.
# Un archivo que se hace `source` desde varios sitios se re-evalua una vez por
# sitio; sin el guard, cada `source` vuelve a exportar y a redefinir. Es barato
# y su ausencia no revienta: por eso nadie la nota hasta que el orden importa.
[[ -n "${THYROX_REACH_SH_LOADED:-}" ]] && return 0
THYROX_REACH_SH_LOADED=1

THYROX_SH_MARKER="${THYROX_LOCATOR:-src/paths/reach.py}"

# _thyrox_ascend <from_dir> — el ascenso minimo hasta el marcador. Imprime la raiz
# o nada. Es privado: quien lo necesite pasa por `thyrox_root`.
_thyrox_ascend() {
    local level; level="$(cd "${1:-.}" 2>/dev/null && pwd)" || return 1
    while [[ -n "$level" && "$level" != "/" ]]; do
        [[ -f "$level/$THYROX_SH_MARKER" ]] && { printf '%s' "$level"; return 0; }
        level="$(dirname "$level")"
    done
    [[ -f "/$THYROX_SH_MARKER" ]] && { printf '%s' "/"; return 0; }
    return 1
}

# _thyrox_delegate <modo> [args...] — pregunta a la mitad Python, que es la
# duena de la precedencia. Cae al ascenso solo si no hay python3: un entorno sin
# el sigue necesitando la raiz, y el ascenso es correcto aunque sea menos
# completo.
#
# Los argumentos que siguen al modo se REENVIAN tal cual. Sin ese reenvio,
# `--value` llegaba sin su clave y la mitad Python respondia «--value exige una
# clave» — un fallo ruidoso, que es la suerte que tuvo: un modo que aceptara
# argumentos opcionales habria respondido otra cosa en silencio.
_thyrox_delegate() {
    local mode="$1"; shift
    local from_dir root output
    from_dir="$(cd "$(dirname "${BASH_SOURCE[1]:-$0}")" 2>/dev/null && pwd)" || from_dir="$PWD"
    root="$(_thyrox_ascend "$from_dir")" || root="$(_thyrox_ascend "$PWD")" || {
        echo "reach.sh: no se hallo $THYROX_SH_MARKER ascendiendo desde $from_dir" \
             "ni desde $PWD. Declara THYROX_ROOT o invoca desde dentro del arbol." >&2
        return 2
    }
    if command -v python3 >/dev/null 2>&1; then
        local code
        output="$(python3 "$root/$THYROX_SH_MARKER" "$mode" "$@" 2>&1)"; code=$?
        # El codigo se PROPAGA, no se aplana a 2. La mitad Python distingue
        # «rehuso» (2) de «la clave no esta declarada y no hay default» (1), y
        # colapsarlos aqui le quitaria al llamador la unica senal que separa un
        # fallo del mecanismo de una ausencia legitima — el sub-patron D, un
        # nivel mas abajo.
        if (( code != 0 )); then
            printf '%s\n' "$output" >&2; return "$code"
        fi
        printf '%s' "$output"; return 0
    fi
    [[ "$mode" == "--thyrox-root" ]] || {
        echo "reach.sh: $mode exige python3, que no esta en PATH." >&2; return 2
    }
    printf '%s' "$root"
}

# thyrox_root — la raiz de thyrox mismo.
thyrox_root() { _thyrox_delegate --thyrox-root; }

# thyrox_tree_root — el padre de los clones, que es OTRA pregunta: thyrox puede
# vivir fuera del arbol que gobierna, y confundirlas es como se codifico
# `/home/user` en el instalador de hooks.
thyrox_tree_root() { _thyrox_delegate --tree-root; }

# thyrox_config_value <CLAVE> [DEFAULT] — el valor de UNA clave de configuracion.
#
# Es el analogo de `get_config_value <key> <default>` de VVV, y se adapta por su
# RAZON, no por su forma: alli los provisioners nunca leen el YAML — preguntan
# por clave a una funcion exportada, y el analisis vive en un solo sitio
# (`vvv: provision/provision-helpers.sh:22-27`, con `VVV_CONFIG` y su fallback).
# Aqui el analisis de las dos entradas —la variable del proceso, y despues la
# declaracion del `.env` que `THYROX_ENV_FILE` nombra— vive en `env_value`, y un
# `.sh` que hiciera su propio `grep` del `.env` seria su segunda fuente de
# verdad. Esa deriva es silenciosa: el guion seguiria imprimiendo un valor.
#
# Los tres desenlaces se distinguen a proposito:
#   declarada        -> imprime el valor, exit 0
#   ausente con def. -> imprime el default, exit 0
#   ausente sin def. -> NO imprime, exit 1
# Colapsar los dos ultimos en «cadena vacia, exit 0» impediria separar
# «declarada vacia» de «no declarada» — el sub-patron D aplicado a la config.
thyrox_config_value() {
    local key="${1:-}"
    if [[ -z "$key" ]]; then
        echo "thyrox_config_value: falta la clave" >&2; return 2
    fi
    # La clave se valida por FORMA antes de viajar. No es por inyeccion —viaja
    # como argv, no por `eval`— sino porque un nombre imposible debe fallar
    # nombrandose, en vez de confundirse con «no declarada».
    if [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
        echo "thyrox_config_value: clave invalida: $key" >&2; return 2
    fi
    if [[ $# -gt 1 ]]; then
        _thyrox_delegate --value "$key" "$2"
    else
        _thyrox_delegate --value "$key"
    fi
}

# thyrox_config_home <CLAVE> [DEFAULT] — el valor de una clave, RESUELTO como
# ruta contra la raiz de thyrox: absoluta tal cual, `~` expandida, relativa
# compuesta sobre la raiz.
#
# Es `thyrox_config_value` mas la resolucion, y no se compone aqui con un
# `[[ "$v" = /* ]] || v="$root/$v"` a proposito: esa linea seria la segunda
# fuente de verdad de una regla que ya vive en `resolve_home`, y su deriva no
# reventaria — compondria una ruta plausible.
#
# La tercera via es la que importa para una clave de FAMILIA: como segmento
# relativo, una sola clave dice lo correcto para varios arboles («en cada uno,
# este subdirectorio»), mientras que una absoluta le da a todos el hogar de uno.
thyrox_config_home() {
    local key="${1:-}"
    if [[ -z "$key" ]]; then
        echo "thyrox_config_home: falta la clave" >&2; return 2
    fi
    if [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
        echo "thyrox_config_home: clave invalida: $key" >&2; return 2
    fi
    if [[ $# -gt 1 ]]; then
        _thyrox_delegate --home "$key" "$2"
    else
        _thyrox_delegate --home "$key"
    fi
}

# `export -f` es el cuarto mecanismo de VVV que se adapta: alli los provisioners
# se invocan como PROCESOS y aun asi ven `get_config_value`, porque la funcion
# se exporta al entorno. Sin esto, `source reach.sh` solo sirve a la shell que
# lo hizo, y un guion que la invoque tendria que volver a hacer `source` — o
# reimplementar, que es como nacen las trece copias que este archivo retiro.
export -f thyrox_root thyrox_tree_root thyrox_config_value thyrox_config_home \
    _thyrox_delegate _thyrox_ascend 2>/dev/null || true
