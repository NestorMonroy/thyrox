#!/usr/bin/env bash
# =============================================================================
# model_coordinator.sh — el ciclo de vida del coordinador de modelos del
# anfitrión (ADR-007 1.14.0, TASK-THYROX-0910)
# =============================================================================
#
#   model_coordinator start    lo lanza si no corre; imprime el socket canónico
#   model_coordinator status   sale 0 si el coordinador corre
#   model_coordinator stop     lo detiene por el RPC del daemon
#   model_coordinator run      el daemon en primer plano (lo que `start` lanza)
#
# El coordinador vive dentro del daemon de thyrox, que es único por anfitrión
# (`daemonLock`). Esta entrada no añade un supervisor: `start` entrega `run` a
# `thyrox-bg`, que le da log, ledger y barrera, y `status`/`stop` hablan con el
# daemon por su RPC (`daemon bg status|stop`). El origen es `service`: un
# coordinador declarado no sale por inactividad entre dos clientes; lo detiene
# quien lo declaró.
#
# El socket es el de `model-scheduling-socket-path`, el mismo que los
# consumidores montan en una unidad (`headless-pool.sh`). `start` lo da por
# arrancado cuando acepta conexiones, no cuando el archivo existe: un socket
# de una encarnación muerta también existe.
#
# `THYROX_MODEL_COORDINATOR_DAEMON` sólo declara un doble que habla el
# contrato `bg run|status|stop`, como `THYROX_MANAGED_EXECUTION_RUNNER`.
#
# Salidas: 0 hecho · 1 `status` sin coordinador · 2 uso · 3 el socket no
# apareció a tiempo.
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly JOB_NAME="model-coordinator"
readonly START_TIMEOUT_SECONDS=120

# @description El argv del daemon, un elemento por línea.
daemon_argv() {
  if [[ -n "${THYROX_MODEL_COORDINATOR_DAEMON:-}" ]]; then
    printf '%s\n' "$THYROX_MODEL_COORDINATOR_DAEMON"
    return
  fi
  source "$ROOT/src/lib/toolchain.sh"
  THYROX_TOOLCHAIN_NODE_MODULES_HOME="${THYROX_TOOLCHAIN_NODE_MODULES_HOME:-$ROOT/node_modules}" \
    thyrox_toolchain_require_bun >&2 || return 1
  printf '%s\n' "${THYROX_TOOLCHAIN_BUN_BIN:-bun}" --feature=DAEMON --feature=UDS_INBOX \
    "$ROOT/src/packages/cli/src/entry/cli.tsx" daemon
}

socket_path() {
  bash "$ROOT/bin/model-scheduling-socket-path"
}

# @description ¿Acepta conexiones el socket? Un archivo sin servidor no cuenta.
accepts_connections() {
  python3 -c 'import socket, sys; s = socket.socket(socket.AF_UNIX); s.connect(sys.argv[1])' "$1" 2>/dev/null
}

daemon() {
  local argv
  mapfile -t argv < <(daemon_argv) || return 1
  [[ ${#argv[@]} -gt 0 ]] || return 1
  "${argv[@]}" bg "$@"
}

start() {
  local socket
  socket="$(socket_path)" || return 2
  if accepts_connections "$socket"; then
    echo "model_coordinator: ya corre" >&2
    echo "$socket"
    return 0
  fi
  bash "$ROOT/bin/thyrox-bg" start "$JOB_NAME" --grace 0 -- "$ROOT/bin/model_coordinator" run >&2 || return $?
  local waited=0
  until accepts_connections "$socket"; do
    if [[ "$(bash "$ROOT/bin/thyrox-bg" status "$JOB_NAME" 2>/dev/null)" == done:* ]]; then
      echo "model_coordinator: el daemon terminó sin abrir $socket; log: bash bin/thyrox-bg log $JOB_NAME" >&2
      return 3
    fi
    if (( waited >= START_TIMEOUT_SECONDS * 10 )); then
      echo "model_coordinator: el socket $socket no aceptó conexiones en ${START_TIMEOUT_SECONDS} s; log: bash bin/thyrox-bg log $JOB_NAME" >&2
      return 3
    fi
    sleep 0.1
    waited=$((waited + 1))
  done
  echo "$socket"
}

case "${1:-}" in
  start) start ;;
  status) daemon status ;;
  stop) daemon stop ;;
  run) shift; daemon run --origin service "$@" ;;
  *) echo "uso: model_coordinator start|status|stop|run" >&2; exit 2 ;;
esac
