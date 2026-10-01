#!/usr/bin/env bash
# =============================================================================
# launcher_freeze.sh — la capa de shell que ejecuta un lanzador de larga vida,
# copiada una vez al lanzar para que el proceso vivo nunca lea un archivo que
# puede cambiar
# =============================================================================
#
# Bash lee un script por partes mientras lo ejecuta: tras cada comando vuelve
# con `lseek` al inicio del siguiente y lee otra vez del archivo. Un pool que
# corre minutos sigue leyendo `src/session/headless-pool.sh` y lo que éste
# carga con `source`, así que editar cualquiera de ellos en el checkout cambia
# lo que el pool vivo hace después, o lo rompe a mitad del análisis.
#
# `thyrox_launcher_freeze` copia `src/session` y `src/lib` a un directorio
# propio bajo el runtime e imprime ese directorio. El lanzador ejecuta la
# copia, y el checkout puede cambiar sin riesgo. Los archivos copiados quedan
# de sólo lectura; los directorios no, para poder retirar la copia al salir.
#
# El runtime es THYROX_RUNTIME_DIR, o `.thyrox/runtime` bajo THYROX_ROOT:
# estado local, nunca versionado (`.gitignore`).
#
# *Ciega a:* los módulos de Python y TypeScript. Se leen enteros al importarse,
# así que una edición no cambia un módulo ya cargado; uno que el lanzador
# importe tarde, después de la edición, sí vería el código nuevo. Y a lo que el
# lanzador alcanza por `bin/`, que se resuelve contra THYROX_ROOT y no se copia.

# thyrox_runtime_dir [source_root] — dónde vive el estado local de ejecución.
thyrox_runtime_dir() {
    local source_root="${1:-}"
    printf '%s\n' "${THYROX_RUNTIME_DIR:-${THYROX_ROOT:-$source_root}/.thyrox/runtime}"
}

# thyrox_launcher_freeze <source_root> <name> — copia la capa de shell de
# <source_root> e imprime la raíz de la copia. Devuelve 1, sin dejar nada, si
# la copia no se completa.
thyrox_launcher_freeze() {
    local source_root="$1" name="$2" runtime destination
    runtime="$(thyrox_runtime_dir "$source_root")"
    destination="$runtime/launchers/$name-$(date -u +%Y%m%dT%H%M%S)-$$"
    mkdir -p "$destination/src" || return 1
    if ! cp -R "$source_root/src/session" "$source_root/src/lib" "$destination/src/"; then
        rm -rf "${destination:?}"
        return 1
    fi
    find "$destination" -type f -exec chmod a-w {} +
    printf '%s\n' "$destination"
}
