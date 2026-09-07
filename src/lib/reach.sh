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
#   RAIZ="$(thyrox_root)"        # la raiz de thyrox
#   ARBOL="$(thyrox_tree_root)"  # el padre de los clones
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
THYROX_SH_MARKER="${THYROX_LOCATOR:-src/paths/reach.py}"

# _thyrox_ascend <desde> — el ascenso minimo hasta el marcador. Imprime la raiz
# o nada. Es privado: quien lo necesite pasa por `thyrox_root`.
_thyrox_ascend() {
    local nivel; nivel="$(cd "${1:-.}" 2>/dev/null && pwd)" || return 1
    while [[ -n "$nivel" && "$nivel" != "/" ]]; do
        [[ -f "$nivel/$THYROX_SH_MARKER" ]] && { printf '%s' "$nivel"; return 0; }
        nivel="$(dirname "$nivel")"
    done
    [[ -f "/$THYROX_SH_MARKER" ]] && { printf '%s' "/"; return 0; }
    return 1
}

# _thyrox_delegate <modo> — pregunta a la mitad Python, que es la duena de la
# precedencia. Cae al ascenso solo si no hay python3: un entorno sin el sigue
# necesitando la raiz, y el ascenso es correcto aunque sea menos completo.
_thyrox_delegate() {
    local modo="$1" desde raiz salida
    desde="$(cd "$(dirname "${BASH_SOURCE[1]:-$0}")" 2>/dev/null && pwd)" || desde="$PWD"
    raiz="$(_thyrox_ascend "$desde")" || raiz="$(_thyrox_ascend "$PWD")" || {
        echo "reach.sh: no se hallo $THYROX_SH_MARKER ascendiendo desde $desde" \
             "ni desde $PWD. Declara THYROX_ROOT o invoca desde dentro del arbol." >&2
        return 2
    }
    if command -v python3 >/dev/null 2>&1; then
        salida="$(python3 "$raiz/$THYROX_SH_MARKER" "$modo" 2>&1)" || {
            printf '%s\n' "$salida" >&2; return 2
        }
        printf '%s' "$salida"; return 0
    fi
    [[ "$modo" == "--thyrox-root" ]] || {
        echo "reach.sh: $modo exige python3, que no esta en PATH." >&2; return 2
    }
    printf '%s' "$raiz"
}

# thyrox_root — la raiz de thyrox mismo.
thyrox_root() { _thyrox_delegate --thyrox-root; }

# thyrox_tree_root — el padre de los clones, que es OTRA pregunta: thyrox puede
# vivir fuera del arbol que gobierna, y confundirlas es como se codifico
# `/home/user` en el instalador de hooks.
thyrox_tree_root() { _thyrox_delegate --tree-root; }
