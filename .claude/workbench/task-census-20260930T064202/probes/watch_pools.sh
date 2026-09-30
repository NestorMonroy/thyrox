#!/usr/bin/env bash
# Vigila los pools de implementación y sale en cuanto hay algo que atender:
# un ítem cerrado, un pool terminado, un ítem cuyo stream no crece en
# WATCH_STALL_SECONDS o un AVISO de la sonda de stdin. Imprime el motivo.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" || exit 2
readonly STALL_SECONDS="${WATCH_STALL_SECONDS:-900}"
readonly POLL_SECONDS="${WATCH_POLL_SECONDS:-60}"
readonly BENCH=.claude/workbench/task-census-20260930T064202
readonly OUTPUTS=("$BENCH/impl-pool-d/outputs")
readonly JOBS=(impl-pool-d)

closed_count() { bash bin/pool_lifecycle closed-items "$1" | wc -l; }

declare -A baseline
declare -A first_seen
for out in "${OUTPUTS[@]}"; do baseline[$out]="$(closed_count "$out")"; done

stalled_items() {
    local now runtime stream age launcher_pid
    now="$(date +%s)"
    for runtime in .thyrox/runtime/pool/*/; do
        # El sufijo del runtime es el pid del lanzador; uno muerto es un
        # runtime conservado para reconcile, no un ítem que avance.
        launcher_pid="${runtime%/}"; launcher_pid="${launcher_pid##*-}"
        kill -0 "$launcher_pid" 2>/dev/null || continue
        for session in "$runtime"*.session; do
            [[ -e "$session" ]] || continue
            stream="${session%.session}.stream.jsonl"
            # `thyrox -p` (C7) escribe su stream-json al terminar: vacío no es
            # atascado. La cota de un ítem así es su --timeout.
            [[ -s "$stream" ]] || continue
            # Con el `result` emitido el runner ya salió y el ítem verifica: el
            # stream no vuelve a crecer y la verificación tiene su propio timeout.
            tail -n 5 "$stream" | grep -q '"type":"result"' && continue
            age=$(( now - $(stat -c %Y "$stream") ))
            (( age > STALL_SECONDS )) && echo "sin avance ${age}s: $stream"
        done
    done
}

while true; do
    for out in "${OUTPUTS[@]}"; do
        current="$(closed_count "$out")"
        [[ "$current" == "${baseline[$out]}" ]] || { echo "cerrado: $out ($current ítem(s))"; exit 0; }
    done
    for job in "${JOBS[@]}"; do
        state="$(bash bin/thyrox-bg status "$job")"
        [[ "$state" == running ]] || { echo "pool terminado: $job ($state)"; exit 0; }
    done
    stalled="$(stalled_items)"
    [[ -z "$stalled" ]] || { echo "$stalled"; exit 0; }
    # Un AVISO de socket cuenta sólo si el mismo pid lo sostiene más de
    # STALL_SECONDS. La herramienta Bash de la delegación entrega a cada hijo un
    # socket como stdin (medido: fd 0 de un `timeout 590 bash tests/…` de un
    # ítem), así que todo comando largo de un ítem lo emite y no está colgado;
    # un pipe con escritor vivo es el final de un pipeline y se cierra solo.
    now="$(date +%s)"
    while read -r pid; do
        [[ -n "$pid" ]] || continue
        [[ -n "${first_seen[$pid]:-}" ]] || first_seen[$pid]="$now"
        (( now - first_seen[$pid] > STALL_SECONDS )) && { echo "stdin de socket ${STALL_SECONDS}s+: pid $pid"; exit 0; }
    done < <(bash bin/wait-jobs probe 2>&1 | gawk '/AVISO.*socket/ { for (i = 1; i <= NF; i++) if ($i == "pid") print $(i + 1) }')
    sleep "$POLL_SECONDS"
done
