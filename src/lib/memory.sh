#!/usr/bin/env bash
# La sonda de memoria que comparten `run-task-pool.sh` y `bg.sh` para
# `--memfree`. Vivía dentro del pool; `bg.sh` la necesitó cuando dos
# lanzamientos independientes —el lazo tsc cero y un censo del programa
# completo— agotaron la memoria de una máquina sin swap y el kernel mató al
# primero con SIGKILL. Una sola copia: dos habrían divergido.
#
# Quien la carga declara `AWK_BIN` antes de medir (el pool lo resuelve con
# `thyrox_config_value THYROX_TOOLCHAIN_AWK_BIN awk`); sin él se usa `awk`.

# parse_binary_size <texto> -> bytes, o falla. Mayuscula o sufijo `i` es
# binario (1024); minuscula sin `i` es decimal (1000), como
# `multiply_binary_prefix` de la referencia (`:6368-6398`).
parse_binary_size() {
    local spec="$1" digits unit binary base exponent
    [[ "$spec" =~ ^([0-9]+)([KMGTkmgt])?(i)?$ ]] || return 1
    digits="${BASH_REMATCH[1]}"; unit="${BASH_REMATCH[2]}"; binary="${BASH_REMATCH[3]}"
    if [ -z "$unit" ]; then
        [ -z "$binary" ] || return 1
        echo "$digits"; return 0
    fi
    case "$unit" in K|k) exponent=1 ;; M|m) exponent=2 ;; G|g) exponent=3 ;; T|t) exponent=4 ;; esac
    base=1000
    [[ -n "$binary" || "$unit" =~ [KMGT] ]] && base=1024
    echo $(( digits * base ** exponent ))
}

# mem_available_bytes -> bytes disponibles, o falla si no se puede medir.
# La ruta es inyectable para que la suite conduzca la memoria sin consumirla.
# El awk es `AWK_BIN`, que declara quien carga este archivo.
mem_available_bytes() {
    local path="${THYROX_POOL_MEMINFO_PATH:-/proc/meminfo}"
    [ -r "$path" ] || return 1
    "${AWK_BIN:-awk}" '/^MemAvailable:/ { available = $2 }
         /^(MemFree|Buffers|Cached|SwapCached):/ { legacy += $2 }
         END { if (available != "") print available * 1024
               else if (legacy > 0) print legacy * 1024
               else exit 1 }' "$path"
}

