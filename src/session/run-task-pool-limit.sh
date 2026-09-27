#!/bin/bash
# =============================================================================
# run-task-pool-limit.sh — la cota de memoria de `run-task-pool`, para `--limit`
# =============================================================================
#
# GNU Parallel 20231122 consulta este guion antes de admitir cada trabajo y en
# cada vuelta de su espera (`/usr/bin/parallel:4109` y `:6853`), y obra según
# su salida (`sub limit`, `:7535`): 0 admite otro trabajo, 1 no admite ninguno,
# 2 mata al más joven.
#
# Su `--memfree` propio lee `/proc/meminfo` a fuego y cuenta `Shmem` como
# libre. La medida aquí es `mem_available_bytes` de `src/lib/memory.sh`
# —`MemAvailable`, con el awk declarado y la ruta que
# `THYROX_POOL_MEMINFO_PATH` permite sustituir—, la misma de `bg.sh --memfree`.
#
# Este guion nunca sale 2: cuando la memoria cae por debajo de la mitad de la
# cota, él mismo manda TERM al trabajo más joven y sale 1. La razón está en
# `kill_youngest_if_over_limit` (`:6893`): recorre los trabajos del más joven
# al más viejo y vuelve a consultar este guion POR CADA TRABAJO, matando al
# primero para el que salga 2. Si la respuesta cambia a mitad del recorrido
# —un trabajo que muere entre dos consultas cambia el conteo—, el 2 le toca a
# uno más viejo. Medido bajo carga: cayó el más viejo. Aquí la elección es una
# sola, sobre una sola foto del proceso.
#
# Las reglas de la elección:
#   - cuentan como vivos los envoltorios de trabajo hijos de Parallel que este
#     guion no haya señalado ya: uno señalado sigue vivo mientras suelta su
#     fila del ledger, y contarlo haría matar a otro por el mismo déficit;
#   - con cero vivos se admite aunque falte memoria: sin eso, un trabajo mayor
#     que la cota bloquearía el despacho para siempre;
#   - no se mata al ÚLTIMO vivo: no libera memoria que otro trabajo del
#     despacho pueda usar, sólo repite el mismo trabajo;
#   - el más joven es el de arranque más reciente (`/proc/<pid>/stat`, campo
#     22, en tics de reloj: los segundos de `ps` empatan).
#
# El envoltorio que recibe TERM suelta su fila y sale 143, que es la única
# salida que `--retries` repite: así el trabajo vuelve a la cola.
#
# Uso: run-task-pool-limit.sh <cota-en-bytes> <directorio-de-estado>
# =============================================================================

set -uo pipefail

{
LIMIT="$1" STATE_DIR="$2"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/../lib/memory.sh"
SIGNALLED="$STATE_DIR/limit.signalled"

# Parallel corre esta consulta con `system($shell, "-c", …)`: con un comando
# simple el shell hace exec y el padre es Parallel; con uno compuesto queda un
# shell entre medias. Se sube por la ascendencia hasta el proceso `parallel`.
PARALLEL_PID="$PPID"
until [ "$(ps -o comm= -p "$PARALLEL_PID" 2>/dev/null)" = parallel ]; do
    [ "$PARALLEL_PID" -gt 1 ] || exit 0
    PARALLEL_PID="$(ps -o ppid= -p "$PARALLEL_PID" | tr -d ' ')"
done

# Los envoltorios vivos y no señalados, con su instante de arranque.
ALIVE=()
for pid in $(pgrep -P "$PARALLEL_PID" -f run-task-pool-job.sh); do
    grep -qx "$pid" "$SIGNALLED" 2>/dev/null && continue
    start="$(gawk '{ sub(/^.*\) /, ""); print $20 }' "/proc/$pid/stat" 2>/dev/null)" || continue
    [ -n "$start" ] && ALIVE+=("$start $pid")
done

[ "${#ALIVE[@]}" -gt 0 ] || exit 0
AVAILABLE="$(mem_available_bytes)" || exit 0
if [ "$AVAILABLE" -lt $(( LIMIT / 2 )) ] && [ "${#ALIVE[@]}" -gt 1 ]; then
    youngest="$(printf '%s\n' "${ALIVE[@]}" | sort -n | tail -1 | cut -d' ' -f2)"
    echo "$youngest" >> "$SIGNALLED"
    kill -TERM "$youngest" 2>/dev/null
    exit 1
fi
[ "$AVAILABLE" -lt "$LIMIT" ] && exit 1
exit 0
}
