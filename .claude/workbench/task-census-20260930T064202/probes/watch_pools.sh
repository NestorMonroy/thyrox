#!/usr/bin/env bash
# Vigila los pools de implementación y sale en cuanto hay algo que atender:
# un ítem cerrado, un pool terminado, un ítem cuyo stream no crece en
# WATCH_STALL_SECONDS o un AVISO de la sonda de stdin. Imprime el motivo.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" || exit 2
readonly STALL_SECONDS="${WATCH_STALL_SECONDS:-900}"
readonly POLL_SECONDS="${WATCH_POLL_SECONDS:-60}"
readonly BENCH=.claude/workbench/task-census-20260930T064202
readonly OUTPUTS=("$BENCH/impl-pool-a/outputs-2" "$BENCH/impl-pool-b/outputs")
readonly JOBS=(impl-pool-a2 impl-pool-b)

closed_count() { bash bin/pool_lifecycle closed-items "$1" | wc -l; }

declare -A baseline
previous_warnings=""
for out in "${OUTPUTS[@]}"; do baseline[$out]="$(closed_count "$out")"; done

stalled_items() {
    local now runtime stream age
    now="$(date +%s)"
    for runtime in .thyrox/runtime/pool/*/; do
        for session in "$runtime"*.session; do
            [[ -e "$session" ]] || continue
            stream="${session%.session}.stream.jsonl"
            [[ -e "$stream" ]] || continue
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
    # Un AVISO sólo cuenta si el mismo pid lo repite en dos vueltas: el shell
    # de un ítem lo emite un instante al arrancar y desaparece (medido: los
    # pids 16999 y 17029 ya no existían al consultarlos).
    warnings="$(bash bin/wait-jobs probe 2>&1 | gawk '/AVISO/')"
    persistent="$(comm -12 <(printf '%s\n' "$previous_warnings" | sort) <(printf '%s\n' "$warnings" | sort) | gawk 'NF')"
    [[ -z "$persistent" ]] || { echo "$persistent"; exit 0; }
    previous_warnings="$warnings"
    sleep "$POLL_SECONDS"
done
