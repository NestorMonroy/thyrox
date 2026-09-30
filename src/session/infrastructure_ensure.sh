#!/usr/bin/env bash
# =============================================================================
# infrastructure_ensure.sh — bootstrap idempotente de la infraestructura
# gestionada (TASK-THYROX-0606, ADR-THYROX-007 v1.2.0 Regla 4)
# =============================================================================
#
# Aqui no hay systemd (PID 1 es `process_api`): nada de lo que declara
# `src/lib/infrastructure.sh` vuelve solo tras reiniciar la VM. Este guion es
# el CONSUMIDOR de esa declaracion — la unica pieza que de verdad invoca
# `podman` — con el flujo exacto del ADR, por contenedor:
#
#   cargar la declaracion -> inspeccionar -> validar el proceso real (estado
#   reportado + PID vivo) -> ausente o stale (running con el PID muerto) ->
#   rm -f + recrear -> arrancar -> correr el health check explicitamente,
#   repetido hasta sano o hasta el plazo -> declararlo listo; si no, fallar
#   con causa y diagnostico.
#
# La decision de conservar o recrear NUNCA sale solo del estado reportado:
# `running` con el PID muerto es stale (medido, TASK-THYROX-0605: `podman
# start` sobre ese estado sale 0 sin arrancar nada), y se recrea igual que un
# contenedor ausente.
#
# Salida: una linea por contenedor en stdout (nombre, estado reportado, si
# el PID vive, la accion tomada y el resultado de salud); el diagnostico de
# lo que no llego a sano va a stderr.
#
# Exit 0  todos los contenedores quedaron sanos.
# Exit 1  alguno no llego a sano dentro del plazo (nombrado en stderr).
# Exit 2  falta podman o la credencial de PostgreSQL — no se toca nada —, o la
#         imagen de un contenedor falta y su pull no cabe en disco (se rehusa
#         antes de `podman create`, TASK-THYROX-0671).
# =============================================================================
set -uo pipefail

_INFRA_ENSURE_HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$_INFRA_ENSURE_HERE/../lib/toolchain.sh"
# shellcheck source=/dev/null
source "$_INFRA_ENSURE_HERE/../lib/infrastructure.sh"

# Plazo e intervalo del health check, con prefijo THYROX_INFRA_ como el resto
# de la declaracion. `THYROX_INFRA_ENSURE_SLEEP_BIN` no es un parametro de
# produccion: es el punto de inyeccion que permite a la suite recorrer el
# bucle de reintentos sin dormir de verdad.
HEALTH_TIMEOUT="${THYROX_INFRA_HEALTH_TIMEOUT:-60}"
HEALTH_INTERVAL="${THYROX_INFRA_HEALTH_INTERVAL:-2}"
SLEEP_BIN="${THYROX_INFRA_ENSURE_SLEEP_BIN:-sleep}"
# La admision de disco antes de un pull (TASK-THYROX-0671): el envoltorio de
# `resource_admission`, con su contrato `disk-admit`/`disk-release`. Se declara
# para que la suite ejercite el orden sin tocar el disco real.
DISK_ADMISSION_BIN="${THYROX_INFRA_DISK_ADMISSION_BIN:-$_INFRA_ENSURE_HERE/../../bin/resource_admission}"
# El banco que mide por que el techo es `Avail` y no el tamaño del dispositivo.
readonly DISK_ADMISSION_BENCH="disk-reserve-reach-20260930T191002"
readonly EXIT_REFUSED=2

# --- precondiciones: NADA se toca hasta que las dos esten satisfechas ---
if [[ -z "${THYROX_INFRA_POSTGRES_PASSWORD:-}" ]]; then
  echo "infrastructure_ensure: falta THYROX_INFRA_POSTGRES_PASSWORD (credencial de PostgreSQL)." >&2
  echo "                       No se invoca podman ni se toca nada." >&2
  exit 2
fi

if ! thyrox_toolchain_require_podman; then
  echo "infrastructure_ensure: podman no esta disponible; no se toca nada." >&2
  exit 2
fi
PODMAN="$THYROX_TOOLCHAIN_PODMAN_BIN"

# @description Asegura la red propia de la infraestructura: existe -> nada,
# falta -> se crea. La red vive en la misma declaracion que los contenedores
# (`_INFRASTRUCTURE_NETWORK`, ya en scope tras sourcear infrastructure.sh).
_infra_ensure_network() {
  if "$PODMAN" network exists "$_INFRASTRUCTURE_NETWORK" >/dev/null 2>&1; then
    return 0
  fi
  "$PODMAN" network create "$_INFRASTRUCTURE_NETWORK" >/dev/null 2>&1
}

if ! _infra_ensure_network; then
  echo "infrastructure_ensure: no se pudo asegurar la red $_INFRASTRUCTURE_NETWORK." >&2
  exit 1
fi

# @description Corre el comando de salud declarado, repitiendolo hasta que
# responda sano o se agote el plazo. El plazo se mide en INTENTOS
# (plazo/intervalo), no en reloj de pared: asi la espera entre intentos es lo
# UNICO que hay que inyectar para que la suite no duerma.
# @arg $1 string nombre del contenedor.
# @stdout `healthy`, o `unhealthy: <ultima salida>`.
# @exitcode 0 sano dentro del plazo.
# @exitcode 1 nunca respondio sano.
_infra_run_health_check() {
  local name="$1"
  local -a health_argv
  mapfile -t health_argv < <(thyrox_infrastructure_health_check_argv "$name")

  local max_attempts=$(( (HEALTH_TIMEOUT + HEALTH_INTERVAL - 1) / HEALTH_INTERVAL ))
  (( max_attempts < 1 )) && max_attempts=1

  local attempt=1 output="" rc=1
  while (( attempt <= max_attempts )); do
    output="$("$PODMAN" exec "$name" "${health_argv[@]}" 2>&1)"; rc=$?
    if (( rc == 0 )); then
      printf 'healthy'
      return 0
    fi
    if (( attempt < max_attempts )); then
      "$SLEEP_BIN" "$HEALTH_INTERVAL"
    fi
    attempt=$(( attempt + 1 ))
  done
  printf 'unhealthy: %s' "$output"
  return 1
}

# @description ¿Falta la imagen del contenedor en el almacen local? Solo
# entonces `podman create` la baja y hay que reservar disco.
# @arg $1 string nombre del contenedor.
# @exitcode 0 la imagen falta.
_infra_image_missing() {
  local image
  image="$(thyrox_infrastructure_image "$1")" || return 0
  ! "$PODMAN" image exists "$image" >/dev/null 2>&1
}

# @description Reserva el disco que exige bajar la imagen, a nombre de este
# proceso. Si no se admite, rehusa el ensure entero con exit 2 nombrando
# contenedor, necesidad, techo y el banco, sin llegar a `podman create`.
# @arg $1 string nombre del contenedor.
_infra_admit_disk_or_refuse() {
  local name="$1" need verdict
  need="$(thyrox_infrastructure_disk_need_bytes "$name")"
  if verdict="$("$DISK_ADMISSION_BIN" disk-admit --need-bytes "$need" --owner "$$" 2>&1)"; then
    return 0
  fi
  echo "infrastructure_ensure: $name no cabe en disco: necesidad $need bytes; $verdict" >&2
  echo "                       El techo es el que el sistema de archivos declara accesible" >&2
  echo "                       (banco $DISK_ADMISSION_BENCH). No se invoca podman create." >&2
  exit "$EXIT_REFUSED"
}

# @description Suelta la reserva de disco de este proceso, haya ido bien o
# no el `podman create`.
_infra_release_disk() {
  "$DISK_ADMISSION_BIN" disk-release --owner "$$" >/dev/null 2>&1
}

# @description Compone y corre `podman create`, reservando disco antes solo
# si la imagen falta localmente.
# @arg $1 string nombre del contenedor.
# @exitcode 0 argv compuesto (el resultado del create se mide por la salud).
# @exitcode 1 no se pudo componer el argv.
_infra_create_container() {
  local name="$1"
  local -a create_argv
  mapfile -t create_argv < <(thyrox_infrastructure_create_argv "$name")
  [[ "${#create_argv[@]}" -gt 0 ]] || return 1
  if _infra_image_missing "$name"; then
    _infra_admit_disk_or_refuse "$name"
    "$PODMAN" "${create_argv[@]}" >/dev/null 2>&1
    _infra_release_disk
  else
    "$PODMAN" "${create_argv[@]}" >/dev/null 2>&1
  fi
  return 0
}

# @description Asegura un contenedor: inspecciona, decide kept/created/
# recreated/started, ejecuta el health check y publica su linea de estado.
# Acumula en FAILED_CONTAINERS cualquier contenedor que no llego a sano.
# @arg $1 string nombre del contenedor (uno de los que declara infrastructure.sh).
_infra_ensure_container() {
  local name="$1"
  local status pid pid_alive action inspect_out

  if inspect_out="$("$PODMAN" inspect --format '{{.State.Status}}\t{{.State.Pid}}' "$name" 2>/dev/null)"; then
    status="${inspect_out%%$'\t'*}"
    pid="${inspect_out##*$'\t'}"
  else
    status="absent"
    pid="0"
  fi

  pid_alive="no"
  if [[ "$status" == "running" && "$pid" != "0" ]] && kill -0 "$pid" 2>/dev/null; then
    pid_alive="yes"
  fi

  if [[ "$status" == "running" && "$pid_alive" == "yes" ]]; then
    action="kept"
  else
    if [[ "$status" == "absent" ]]; then
      action="created"
    elif [[ "$status" == "running" ]]; then
      # running reportado, PID muerto: stale. rm -f SOLO retira el
      # contenedor — el volumen con nombre (verdad durable de postgres)
      # nunca aparece en este comando.
      action="recreated"
      "$PODMAN" rm -f "$name" >/dev/null 2>&1
    else
      action="started"
    fi

    if [[ "$action" == "created" || "$action" == "recreated" ]] && ! _infra_create_container "$name"; then
      printf '%s status=%s pid_alive=%s action=error health=no-intentado\n' \
        "$name" "$status" "$pid_alive"
      FAILED_CONTAINERS+=("$name: no se pudo componer el argv de creacion")
      return
    fi
    "$PODMAN" start "$name" >/dev/null 2>&1
  fi

  local health_result
  if health_result="$(_infra_run_health_check "$name")"; then
    printf '%s status=%s pid_alive=%s action=%s health=healthy\n' \
      "$name" "$status" "$pid_alive" "$action"
  else
    printf '%s status=%s pid_alive=%s action=%s health=%s\n' \
      "$name" "$status" "$pid_alive" "$action" "$health_result"
    FAILED_CONTAINERS+=("$name: $health_result")
  fi
}

FAILED_CONTAINERS=()
while IFS= read -r _infra_container_name; do
  _infra_ensure_container "$_infra_container_name"
done < <(thyrox_infrastructure_container_names)

if [[ "${#FAILED_CONTAINERS[@]}" -gt 0 ]]; then
  for _infra_failure in "${FAILED_CONTAINERS[@]}"; do
    echo "infrastructure_ensure: $_infra_failure" >&2
  done
  exit 1
fi

exit 0
