#!/usr/bin/env bash
# Aísla los hogares declarados de una suite: nada de lo que la suite lance
# escribe en el workbench, los trabajos, la caché ni los logs del árbol real.
#
# Exportar la clave GLOBAL (`THYROX_JOBS_DIR`) no aísla: los resolvedores dan
# precedencia a la clave POR CLON (`THYROX_JOBS_THYROX`), y si el `.env` del
# árbol la declara, la suite escribe en el hogar real aunque haya exportado la
# global. Por eso esta función neutraliza el archivo además de exportar.
#
# Por qué por este camino y no cambiando la precedencia: que la clave del clon
# gane es el contrato (DEC-04, `job_runs.jobs_dir`), y cambiarlo es decisión
# del ejecutor. Una suite, en cambio, sí puede declarar que ningún archivo
# gobierna su proceso: `THYROX_ENV_FILE` apuntado a un archivo vacío hace que
# `production_declarations` lea sólo el proceso y ese archivo.
#
# Métrica: las familias de hogar por clon que el árbol compone
# (`THYROX_<FAMILIA>_<CLONE>`) y sus globales.
# Ciega a: un hogar que un guion componga a mano, sin pasar por el resolvedor
# (`tests/session/test-headless-pool-worktree.sh:20` lo hace con la caché).

#: Las familias de hogar que tienen clave por clon además de la global.
_ISOLATED_HOME_FAMILIES=(WORKBENCH JOBS CACHE RULES BACKGROUND_LOG)

# @description Aísla los hogares declarados bajo <dir>: un `.env` vacío como
#   único archivo de declaraciones, ninguna clave de hogar heredada del proceso
#   y las globales apuntando a subdirectorios de <dir>.
# @arg $1 string el directorio temporal de la suite
thyrox_isolate_homes() {
    local dir="${1:?thyrox_isolate_homes: falta el directorio}" family name
    mkdir -p "$dir" || return 2
    : > "$dir/isolated.env"
    export THYROX_ENV_FILE="$dir/isolated.env"
    for family in "${_ISOLATED_HOME_FAMILIES[@]}"; do
        while IFS= read -r name; do
            unset "$name"
        done < <(compgen -e | grep -E "^THYROX_${family}_[A-Z]+$")
    done
    export THYROX_WORKBENCH_DIR="$dir/workbench"
    export THYROX_JOBS_DIR="$dir/jobs"
    export THYROX_CACHE_DIR="$dir/cache"
    export THYROX_BACKGROUND_LOG_DIR="$dir/build-logs"
}
