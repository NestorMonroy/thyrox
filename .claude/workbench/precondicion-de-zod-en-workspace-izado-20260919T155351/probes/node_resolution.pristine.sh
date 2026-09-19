#!/usr/bin/env bash
# node_resolution.sh — resolver una dependencia como lo hace Node, para gates
# de shell que van a invocar `bun run` sobre un paquete del workspace.
#
# Por que existe. Dos gates —`check-agent-artifacts.sh` y
# `check-cross-model-read.sh`— exigian `node_modules` BAJO el paquete. Esa
# premisa de UBICACION queda rancia en cuanto el workspace iza las
# dependencias a la raiz, que es la forma que la referencia ejerce: el
# directorio no existe, Node resuelve subiendo, y los dos gates rehusaban con
# exit 2 sobre CADA archivo real del paquete con el arbol correcto.
#
# La regla que implementa es la de Node: desde el directorio de partida se
# sube padre a padre y gana el PRIMER `node_modules` que aparece. El mas
# cercano, no la raiz — por eso el caso que lo mide usa dos anidados.
#
# Las dos funciones REHUSAN con exit 1 y sin emitir nada cuando no hallan
# nada. Un eco vacio con exit 0 no distinguiria «no hay» de «hay uno en la
# raiz del sistema», que es el sub-patron D aplicado al propio resolutor:
# quien lo consumiera compondria una ruta a partir de la nada.

# Duenyo del primer `node_modules` de la cadena de resolucion.
#   $1 = directorio de partida
#   exit 0 = lo emite por stdout   |   exit 1 = no hay ninguno, sin emitir
node_modules_owner() {
    local dir="${1:?node_modules_owner: falta el directorio de partida}"
    dir="$(cd "$dir" 2>/dev/null && pwd)" || return 1
    while [[ -n "$dir" && "$dir" != "/" ]]; do
        if [[ -d "$dir/node_modules" ]]; then
            printf '%s\n' "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    [[ -d "/node_modules" ]] && { printf '/\n'; return 0; }
    return 1
}

# Directorio del paquete resuelto, no el del `node_modules` que lo contiene.
#   $1 = directorio de partida   |   $2 = nombre del paquete
#   exit 0 = lo emite por stdout   |   exit 1 = no resuelve, sin emitir
resolved_package_dir() {
    local dir="${1:?resolved_package_dir: falta el directorio de partida}"
    local package="${2:?resolved_package_dir: falta el nombre del paquete}"
    dir="$(cd "$dir" 2>/dev/null && pwd)" || return 1
    while [[ -n "$dir" && "$dir" != "/" ]]; do
        if [[ -d "$dir/node_modules/$package" ]]; then
            printf '%s\n' "$dir/node_modules/$package"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    [[ -d "/node_modules/$package" ]] && { printf '/node_modules/%s\n' "$package"; return 0; }
    return 1
}
