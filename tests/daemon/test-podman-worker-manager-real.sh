#!/usr/bin/env bash
# test-podman-worker-manager-real.sh — PodmanWorkerManager contra el Podman
# real del anfitrion (TASK-THYROX-0557, item 1).
#
# La suite unitaria del manager corre sobre un Podman falso; esta mide que el
# mismo orden de pasos —create, start, vida por PID, retiro— se sostiene con
# el binario real. Cada caso llama al manager a traves de
# `podman_worker_manager_probe.ts`, que publica su resultado como lineas
# `clave=valor`, y comprueba el efecto en el anfitrion con Podman y con el PID,
# nunca con lo que el propio manager dice de si mismo:
#
#   1. un worker CPU se lanza: su contenedor existe y su PID esta vivo;
#   2. `retire` no deja ni contenedor ni proceso;
#   3. una imagen inexistente falla en la etapa `create` y no deja contenedor;
#   4. un comando que sale al instante falla en `liveness` y no deja
#      contenedor;
#   5. un contenedor con la etiqueta de un daemon muerto lo retira
#      `reconcileOrphans`;
#   6. un worker CUDA en este anfitrion rehusa con exit 2 y no crea nada.
#
# La imagen se construye SIN red, con la tecnica de
# `src/lib/podman_capabilities.sh`: un ayudante estatico en C dentro de un tar
# propio, `podman import`. Los nombres de imagen y de worker llevan el
# identificador de esta ejecucion, y un `trap` retira todo lo creado aunque un
# caso falle.
#
# Metrica: existencia del contenedor (`podman container exists`) y vida del
# PID (`kill -0`) tras cada operacion del manager.
# Ciega a: una GPU real (el caso 6 solo ve el rechazo), a Podman rootless y a
# un proceso zombi que `kill -0` aun contaria vivo durante un instante; por
# eso la muerte se espera con un plazo acotado y con nombre.
#
# @exitcode 0 Los seis casos en verde.
# @exitcode 1 Algun caso fallo.
# @exitcode 2 No se pudo medir: falta Podman, gcc o bun. Sin conteo.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PROBE="$HERE/podman_worker_manager_probe.ts"
# shellcheck source=/dev/null
source "$ROOT/src/lib/toolchain.sh"
# shellcheck source=/dev/null
source "$ROOT/src/lib/assert.sh"

# Plazo, en intentos de un decimo de segundo, para que un PID retirado deje de
# existir: `podman rm -f` puede volver antes de que conmon coseche al proceso.
readonly PROCESS_EXIT_POLL_ATTEMPTS=50
readonly PROCESS_EXIT_POLL_INTERVAL=0.1
# El worker vivo duerme mas que lo que tarda la suite entera.
readonly LIVE_WORKER_SLEEP_SECONDS=120
readonly CUDA_VRAM_MIB=1024
readonly UNSUPPORTED_EXIT_CODE=2
readonly LAUNCH_FAILURE_EXIT_CODE=1

thyrox_toolchain_require_podman || exit 2
PODMAN="$THYROX_TOOLCHAIN_PODMAN_BIN"
if ! command -v gcc >/dev/null 2>&1; then
  echo "test-podman-worker-manager-real: falta gcc; sin conteo." >&2
  exit 2
fi
if ! command -v bun >/dev/null 2>&1; then
  echo "test-podman-worker-manager-real: falta bun; sin conteo." >&2
  exit 2
fi

RUN_ID="$$-${RANDOM}"
IMAGE="localhost/thyrox-pwm-real-${RUN_ID}"
MISSING_IMAGE="localhost/thyrox-pwm-real-missing-${RUN_ID}"
WORKER_PREFIX="pwm-real-${RUN_ID}"
CONTAINER_PREFIX="thyrox-worker-${WORKER_PREFIX}"
WORK=""
IMAGE_IMPORTED=""

# Retira todo contenedor de esta ejecucion, la imagen y el directorio de
# trabajo; corre por `trap ... EXIT`, asi que cubre tambien un caso a medias.
cleanup() {
  local name
  while read -r name; do
    [[ -n "$name" ]] && "$PODMAN" rm -f "$name" >/dev/null 2>&1
  done < <("$PODMAN" ps -a --filter "name=^${CONTAINER_PREFIX}" --format '{{.Names}}' 2>/dev/null)
  if [[ -n "$IMAGE_IMPORTED" ]]; then
    "$PODMAN" rmi -f "$IMAGE" >/dev/null 2>&1
  fi
  if [[ -n "$WORK" && -d "$WORK" ]]; then
    rm -rf -- "${WORK:?}"
  fi
}
trap cleanup EXIT

WORK="$(mktemp -d)" || exit 2
# El runtime deja artefactos relativos al cwd de quien invoca Podman
# (`podman_capabilities.sh`): se ancla al directorio propio.
cd "$WORK" || exit 2

# --- la imagen: ayudante estatico con dos modos ---
#   run          sale 0 de inmediato: el worker que no sobrevive al arranque.
#   sleep <n>    duerme <n> segundos: el worker vivo.
cat > "$WORK/helper.c" <<'HELPER_C_EOF'
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

int main(int argc, char **argv) {
    if (argc >= 2 && strcmp(argv[1], "run") == 0) return 0;
    if (argc >= 3 && strcmp(argv[1], "sleep") == 0) {
        sleep((unsigned int) atoi(argv[2]));
        return 0;
    }
    return 1;
}
HELPER_C_EOF
if ! gcc -static -O2 -o "$WORK/helper" "$WORK/helper.c" 2>"$WORK/gcc.err"; then
  echo "test-podman-worker-manager-real: gcc -static fallo:" >&2
  cat "$WORK/gcc.err" >&2
  exit 2
fi
mkdir -p "$WORK/rootfs/bin"
cp "$WORK/helper" "$WORK/rootfs/bin/helper"
tar -C "$WORK/rootfs" -cf "$WORK/rootfs.tar" . || exit 2
if ! "$PODMAN" import "$WORK/rootfs.tar" "$IMAGE" >"$WORK/import.log" 2>&1; then
  echo "test-podman-worker-manager-real: 'podman import' fallo:" >&2
  cat "$WORK/import.log" >&2
  exit 2
fi
IMAGE_IMPORTED=1

# --- utilidades de medida ---

# Corre la sonda; deja su salida en PROBE_OUT y su codigo en PROBE_RC.
run_probe() {
  PROBE_OUT="$(bun "$PROBE" "$@" 2>"$WORK/probe.err")"
  PROBE_RC=$?
}

# Valor de `clave=` en la ultima salida de la sonda.
probe_field() {
  printf '%s\n' "$PROBE_OUT" | sed -n "s/^$1=//p" | head -n 1
}

container_exists() {
  "$PODMAN" container exists "thyrox-worker-$1"
}

process_alive() {
  [[ "$1" =~ ^[0-9]+$ && "$1" -gt 0 ]] && kill -0 "$1" 2>/dev/null
}

# Espera, con plazo acotado, a que el PID deje de existir.
process_exits_within_deadline() {
  local attempt
  for (( attempt = 0; attempt < PROCESS_EXIT_POLL_ATTEMPTS; attempt++ )); do
    process_alive "$1" || return 0
    sleep "$PROCESS_EXIT_POLL_INTERVAL"
  done
  return 1
}

# Un PID que existio y ya no existe: el dueño de un daemon muerto.
dead_pid() {
  local pid
  sleep 0 & pid=$!
  wait "$pid"
  printf '%s\n' "$pid"
}

# Registra el caso $1 segun el predicado que sigue: `check <descripcion> <comando...>`.
check() {
  local description="$1"; shift
  if "$@"; then
    thyrox_ok "$description"
  else
    thyrox_fail "$description (sonda rc=$PROBE_RC: $(tr '\n' ' ' <<<"$PROBE_OUT") $(head -c 300 "$WORK/probe.err"))" || true
  fi
}

probe_launched() {
  [[ $PROBE_RC -eq 0 && "$(probe_field result)" == launched ]]
}

probe_retired_container() {
  [[ $PROBE_RC -eq 0 && "$(probe_field removed)" == true ]]
}

# La sonda salio con el codigo $1 y publico el error de nombre $2.
probe_failed_with() {
  [[ $PROBE_RC -eq $1 && "$(probe_field error)" == "$2" ]]
}

probe_failed_at_stage() {
  [[ "$(probe_field stage)" == "$1" ]]
}

container_absent() {
  ! container_exists "$1"
}

orphan_launched() {
  probe_launched && container_exists "$1"
}

probe_reports_retired() {
  [[ $PROBE_RC -eq 0 ]] && printf '%s\n' "$PROBE_OUT" | grep -qx "retired=thyrox-worker-$1"
}

DAEMON_PID=$$

# --- Caso 1: un worker CPU se lanza ---
CPU_WORKER="${WORKER_PREFIX}-cpu"
run_probe launch --worker-id "$CPU_WORKER" --image "$IMAGE" --daemon-pid "$DAEMON_PID" \
  -- /bin/helper sleep "$LIVE_WORKER_SLEEP_SECONDS"
CPU_PID="$(probe_field pid)"
check "caso 1: launch CPU sale 0 y publica result=launched" probe_launched
check "caso 1: el contenedor del worker existe" container_exists "$CPU_WORKER"
check "caso 1: el PID del worker esta vivo en el anfitrion" process_alive "$CPU_PID"

# --- Caso 2: retire no deja ni contenedor ni proceso ---
run_probe retire --worker-id "$CPU_WORKER" --daemon-pid "$DAEMON_PID"
check "caso 2: retire sale 0 y declara el contenedor retirado" probe_retired_container
check "caso 2: tras retire el contenedor no existe" container_absent "$CPU_WORKER"
check "caso 2: tras retire el PID del worker no existe" process_exits_within_deadline "$CPU_PID"

# --- Caso 3: imagen inexistente falla en create ---
# El prefijo `localhost/` resuelve la ausencia sin tocar un registro externo.
MISSING_WORKER="${WORKER_PREFIX}-missing"
run_probe launch --worker-id "$MISSING_WORKER" --image "$MISSING_IMAGE" --daemon-pid "$DAEMON_PID" \
  -- /bin/helper sleep "$LIVE_WORKER_SLEEP_SECONDS"
check "caso 3: la imagen inexistente falla como WorkerLaunchError" probe_failed_with "$LAUNCH_FAILURE_EXIT_CODE" WorkerLaunchError
check "caso 3: la etapa que falla es create" probe_failed_at_stage create
check "caso 3: no queda contenedor" container_absent "$MISSING_WORKER"

# --- Caso 4: un comando que sale al instante falla en liveness ---
SHORT_WORKER="${WORKER_PREFIX}-short"
run_probe launch --worker-id "$SHORT_WORKER" --image "$IMAGE" --daemon-pid "$DAEMON_PID" \
  -- /bin/helper run
check "caso 4: el comando instantaneo falla como WorkerLaunchError" probe_failed_with "$LAUNCH_FAILURE_EXIT_CODE" WorkerLaunchError
check "caso 4: la etapa que falla es liveness" probe_failed_at_stage liveness
check "caso 4: no queda contenedor" container_absent "$SHORT_WORKER"

# --- Caso 5: reconcileOrphans retira el contenedor de un daemon muerto ---
ORPHAN_WORKER="${WORKER_PREFIX}-orphan"
ORPHAN_DAEMON_PID="$(dead_pid)"
run_probe launch --worker-id "$ORPHAN_WORKER" --image "$IMAGE" --daemon-pid "$ORPHAN_DAEMON_PID" \
  -- /bin/helper sleep "$LIVE_WORKER_SLEEP_SECONDS"
ORPHAN_PID="$(probe_field pid)"
check "caso 5: el huerfano existe antes de reconciliar" orphan_launched "$ORPHAN_WORKER"
run_probe reconcile --daemon-pid "$DAEMON_PID"
check "caso 5: reconcileOrphans nombra al huerfano como retirado" probe_reports_retired "$ORPHAN_WORKER"
check "caso 5: tras reconciliar el huerfano no existe" container_absent "$ORPHAN_WORKER"
check "caso 5: tras reconciliar su PID no existe" process_exits_within_deadline "$ORPHAN_PID"

# --- Caso 6: un worker CUDA rehusa con exit 2 y no crea nada ---
CUDA_WORKER="${WORKER_PREFIX}-cuda"
run_probe launch --worker-id "$CUDA_WORKER" --image "$IMAGE" --daemon-pid "$DAEMON_PID" \
  --accelerator cuda --vram-mib "$CUDA_VRAM_MIB" -- /bin/helper sleep "$LIVE_WORKER_SLEEP_SECONDS"
check "caso 6: CUDA rehusa con exit 2 como UnsupportedAcceleratorError" probe_failed_with "$UNSUPPORTED_EXIT_CODE" UnsupportedAcceleratorError
check "caso 6: no se creo contenedor" container_absent "$CUDA_WORKER"

thyrox_summary
