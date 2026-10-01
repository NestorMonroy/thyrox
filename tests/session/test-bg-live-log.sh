#!/usr/bin/env bash
# =============================================================================
# test-bg-live-log.sh — el log de un trabajo vive en el runtime mientras corre
# =============================================================================
# El run de la familia `jobs` es versionado. Si el trabajo escribe su log ahí
# mientras corre, un commit por pathspec puede llevarse un log incompleto como
# si fuera evidencia. El log vivo va al runtime (ignorado por git) y llega al
# run sólo terminado, con el marcador incluido.
#
# El trabajo espera en una FIFO: la prueba lo observa EN CURSO sin sleep.
#
# Casos:
#   1. en curso, el run no tiene `salida.log` ni `.time`, y ningún proceso
#      tiene abierto para escribir un archivo del run;
#   2. en curso, el log vive en el runtime y `status` dice running;
#   3. al terminar, el log completo (con el marcador) está en el run y el del
#      runtime se retiró; `status` asienta el código;
#   4. la barrera de `wait-jobs`, registrada con `bg.sh register`, recoge el
#      trabajo por el log del run;
#   5. la forma plana (`BG_DIR`) no cambia.
# Control de anulación: con el log vivo escrito directo en el run caen los
# casos 1 y 2 y ninguno más.
# =============================================================================
set -uo pipefail
# El payload de thyrox-bg va a la primitiva; aquí lo recibe su doble (managed_execution.sh).
THYROX_MANAGED_EXECUTION_RUNNER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/doubles/managed-execution-runner"
export THYROX_MANAGED_EXECUTION_RUNNER
cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 1
BG=src/session/bg.sh
ok=0; failures=0
check() { if [[ "$2" == "$3" ]]; then echo "  ok    $1"; ok=$((ok+1));
        else echo "  FALLA $1 — esperado [$3] obtenido [$2]"; failures=$((failures+1)); fi; }

# El hogar REAL de trabajos, resuelto antes de aislar nada: la suite no puede
# dejar ahí ninguna ejecución. Medido 2026-09-30: con `THYROX_JOBS_THYROX`
# declarado en el `.env`, la clave del clon le ganaba a la global de abajo y
# `vivo`, `plana` y `barrera` aterrizaban en `.claude/jobs/` del árbol.
real_jobs_home="$(PYTHONPATH=src python3 -c 'from session import job_runs; print(job_runs.jobs_dir())')"
real_jobs_before="$(ls "$real_jobs_home" 2>/dev/null | sort)"
TMP="$(mktemp -d)"; pid=""
# Si una aserción deja el trabajo bloqueado en la FIFO, la limpieza lo termina
# por grupo: el trabajo nace líder de su sesión.
trap '[[ -z "$pid" ]] || kill -- "-$pid" 2>/dev/null; rm -rf "${TMP:?}"' EXIT
# shellcheck source=src/lib/test_homes.sh
source src/lib/test_homes.sh
thyrox_isolate_homes "$TMP/homes"
export THYROX_SESSION_LEDGER_DIR="$TMP/ledger"
export THYROX_RUNTIME_DIR="$TMP/runtime"
unset BG_DIR

# writers_under <dir>: procesos que tienen abierto para escribir algo bajo <dir>.
writers_under() {
  local dir="$1" fd target flags count=0
  for fd in /proc/[0-9]*/fd/*; do
    target="$(readlink "$fd" 2>/dev/null)" || continue
    [[ "$target" == "$dir"/* ]] || continue
    flags="$(sed -n 's/^flags:\t//p' "${fd/\/fd\//\/fdinfo\/}" 2>/dev/null)"
    [[ -n "$flags" ]] || continue
    (( (8#$flags & 3) != 0 )) && count=$((count+1))
  done
  echo "$count"
}

mkfifo "$TMP/release"
start_output="$($BG start vivo --grace 0 --task TASK-THYROX-0001 --kind test -- bash -c "echo linea-uno; read -r _ < '$TMP/release'; echo linea-dos")"
run="$(sed -n 's/^RUN=//p' <<<"$start_output")"
pid="$(sed -n 's/^PID=//p' <<<"$start_output")"
live="$THYROX_RUNTIME_DIR/jobs/$(basename "$run")/salida.log"
# Espera acotada: si el log vivo no aparece en el runtime, el caso 2 lo dice.
deadline=$(( SECONDS + 15 ))
until grep -q linea-uno "$live" 2>/dev/null || grep -q linea-uno "$run/outputs/salida.log" 2>/dev/null \
      || (( SECONDS >= deadline )); do :; done

echo "== 1. en curso, el run versionado no tiene el log vivo =="
check "el run no tiene salida.log" "$([[ -e "$run/outputs/salida.log" ]] && echo si || echo no)" "no"
check "el run no tiene salida.log.time" "$([[ -e "$run/outputs/salida.log.time" ]] && echo si || echo no)" "no"
check "ningún proceso escribe bajo el run" "$(writers_under "$run")" "0"

echo "== 2. en curso, el log vive en el runtime =="
check "el runtime tiene el log vivo" "$(grep -c linea-uno "$live" 2>/dev/null)" "1"
check "status dice running" "$($BG status vivo)" "running"

echo "== 3. al terminar, el log completo está en el run =="
exec {release_fd}<> "$TMP/release"; echo go >&"$release_fd"; exec {release_fd}>&-
timeout 30 tail --pid="$pid" -f /dev/null
check "el run tiene las dos líneas" "$(grep -c '^linea-' "$run/outputs/salida.log" 2>/dev/null)" "2"
check "y el marcador" "$(grep -c '^__BG_EXIT__=0$' "$run/outputs/salida.log" 2>/dev/null)" "1"
check "el log del runtime se retiró" "$([[ -e "$live" ]] && echo si || echo no)" "no"
check "y su directorio también" "$([[ -d "$(dirname "$live")" ]] && echo si || echo no)" "no"
check "status asienta el código" "$($BG status vivo)" "done:0"

echo "== 4. la barrera recoge el trabajo por el log del run =="
$BG start barrera --grace 0 --task TASK-THYROX-0001 --kind test -- bash -c 'echo hecho' >/dev/null
$BG register barrera >/dev/null
check "wait-jobs lo recoge OK" \
  "$(bash src/session/wait-jobs.sh wait --only barrera --timeout 30 2>/dev/null | grep -c '^OK *barrera')" "1"

echo "== 5. la forma plana no cambia =="
flat_home="$TMP/flat_home"
BG_DIR="$flat_home" $BG start plana --grace 0 --task TASK-THYROX-0001 --kind test -- bash -c 'echo plana' >/dev/null
flat_pid="$(cat "$flat_home/plana.pid")"
timeout 30 tail --pid="$flat_pid" -f /dev/null
check "el log flat_home está en su hogar" "$(grep -c '^plana$' "$flat_home/plana.log" 2>/dev/null)" "1"

echo "== 6. el hogar real de trabajos no gana ejecuciones =="
check "ninguna ejecución de la suite aterrizó en $real_jobs_home" \
  "$(comm -13 <(printf '%s\n' "$real_jobs_before") <(ls "$real_jobs_home" 2>/dev/null | sort) \
      | grep -cE '^(vivo|plana|barrera)-')" "0"

echo "test-bg-live-log: $((ok + failures)) aserciones — $ok ok, $failures falla(s)"
[[ "$failures" -eq 0 ]]
