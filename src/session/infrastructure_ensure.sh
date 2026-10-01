#!/usr/bin/env bash
# =============================================================================
# infrastructure_ensure.sh — bootstrap idempotente de la infraestructura
# gestionada (TASK-THYROX-0606, 0740; ADR-THYROX-007 Regla 4, enmienda 1.15.0)
# =============================================================================
#
# Aqui no hay systemd (PID 1 es `process_api`): nada de lo que declara
# `src/lib/infrastructure.sh` vuelve solo tras reiniciar la VM. Este guion
# ORQUESTA esa vuelta y no materializa nada: la unica via que crea, arranca,
# recrea y comprueba la salud de un recurso Podman gestionado es la primitiva
# de `@thyrox/podman-execution`, a la que llega por InfrastructureBootstrap
# (`bin/infrastructure-bootstrap`).
#
#   seleccion y credencial -> preflight de podman -> balance de locks ->
#   admision del disco de las imagenes que faltan -> estado deseado (JSON)
#   -> InfrastructureBootstrap -> primitiva -> Podman
#
# Lo que este guion invoca de `podman` es sólo medida: `info`, `ps`,
# `inspect`, `image exists` y, como mecanismo soportado ante un desfase de
# locks, `system renumber`.
#
# Salida: la del bootstrap, una linea por recurso (accion, deriva, creado,
# arrancado, salud, volumenes); su diagnostico va a stderr.
#
# Uso: infrastructure_ensure [contenedor...] — sin argumentos, todos los que
#       declara `infrastructure.sh`; con nombres, sólo esos.
#
# Exit 0  todos los recursos seleccionados quedaron sanos.
# Exit 1  alguno fallo (el bootstrap lo nombra).
# Exit 2  rehusado sin tocar nada: contenedor desconocido, falta podman, falta
#         la credencial de PostgreSQL con PostgreSQL seleccionado, o las
#         imagenes que faltan no caben en disco (TASK-THYROX-0671); o el
#         bootstrap rehuso por una colision de dueño.
# Exit 3  colision de locks de Podman: desfase con contenedores vivos, o
#         renumber que no lo corrige; o el bootstrap choco con un lock ajeno.
# =============================================================================
set -uo pipefail

_INFRA_ENSURE_HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$_INFRA_ENSURE_HERE/../lib/toolchain.sh"
# shellcheck source=/dev/null
source "$_INFRA_ENSURE_HERE/../lib/infrastructure.sh"
# shellcheck source=/dev/null
source "$_INFRA_ENSURE_HERE/../lib/podman_locks.sh"

# La admision de disco antes de bajar imagenes (TASK-THYROX-0671), con su
# contrato `disk-admit`/`disk-release`, y el bootstrap que materializa. Las dos
# se declaran para que la suite ejercite el orden sin tocar el disco ni Podman.
DISK_ADMISSION_BIN="$(thyrox_infrastructure_setting THYROX_INFRA_DISK_ADMISSION_BIN "$_INFRA_ENSURE_HERE/../../bin/resource_admission")"
BOOTSTRAP_BIN="$(thyrox_infrastructure_setting THYROX_INFRA_BOOTSTRAP_BIN "$_INFRA_ENSURE_HERE/../../bin/infrastructure-bootstrap")"
# El banco que mide por que el techo es `Avail` y no el tamaño del dispositivo.
readonly DISK_ADMISSION_BENCH="disk-reserve-reach-20260930T191002"
readonly POSTGRES_PASSWORD_KEY="THYROX_INFRA_POSTGRES_PASSWORD"
readonly EXIT_REFUSED=2
readonly EXIT_LOCK_COLLISION=3

# @description Exit 0 si el nombre esta en la lista que siguen los argumentos.
# @arg $1 string nombre buscado.
# @arg $@ string la lista, desde el segundo argumento.
_infra_list_contains() {
  local wanted="$1" candidate
  shift
  for candidate in "$@"; do
    [[ "$candidate" == "$wanted" ]] && return 0
  done
  return 1
}

# @description Rehusa, sin tocar nada, un nombre que la declaracion no conoce.
_infra_refuse_unknown_names() {
  local selected
  for selected in "${SELECTED_CONTAINERS[@]}"; do
    _infra_list_contains "$selected" "${DECLARED_CONTAINERS[@]}" && continue
    echo "infrastructure_ensure: contenedor desconocido: $selected" >&2
    echo "                       declarados: ${DECLARED_CONTAINERS[*]}. No se toca nada." >&2
    exit "$EXIT_REFUSED"
  done
}

# @description Locks desfasados tras reiniciar la VM: la
# memoria compartida de Podman se rehace vacía y la base conserva el número
# de lock de cada objeto, así que el siguiente objeto nuevo recibe un lock
# ocupado. Se mide ANTES de materializar. Con un contenedor vivo se rehúsa.
# Sin ninguno, se intenta el mecanismo soportado, `podman system renumber`, y
# su salida se conserva: si falla, o si no corrige la medida, se rehúsa
# publicándolo, y se nombra el defecto conocido de sqlite cuando el mensaje
# coincide. El ensure no repara internals de Podman: esa
# recuperación es el procedimiento explícito `bin/podman_lock_recovery`.
_infra_reconcile_locks() {
  local balance allocated objects live renumber_output renumber_rc
  balance="$(thyrox_podman_lock_balance)" || return 0
  read -r allocated objects <<< "$balance"
  (( allocated >= objects )) && return 0
  live="$(thyrox_podman_live_containers | paste -sd, -)"
  if [[ -n "$live" ]]; then
    echo "infrastructure_ensure: locks de Podman desfasados (asignados $allocated, referenciados $objects) con contenedores vivos: $live." >&2
    echo "                       Detenerlos y ejecutar \`$_INFRASTRUCTURE_RENUMBER_COMMAND\`; no se renumera con procesos vivos." >&2
    exit "$EXIT_LOCK_COLLISION"
  fi
  # Podman 4.9.3 escribe este error en stdout, no en stderr: se capturan los dos.
  renumber_output="$("$PODMAN" system renumber 2>&1)"
  renumber_rc=$?
  local after_allocated after_objects
  read -r after_allocated after_objects <<< "$(thyrox_podman_lock_balance)"
  if (( renumber_rc == 0 && after_allocated >= after_objects )); then
    printf 'locks asignados %s de referenciados %s: desfasados, renumerados (ahora %s)\n' "$allocated" "$objects" "$after_allocated"
    return 0
  fi
  _infra_refuse_unreconciled_locks "$renumber_rc" "$renumber_output" "$after_allocated" "$after_objects"
}

# @description Rehúsa tras un renumber que falló o no corrigió la medida:
# publica la medida, el exit y la salida verbatim de Podman, y el remedio.
# @arg $1 int exit de renumber.
# @arg $2 string salida de renumber (stdout y stderr).
# @arg $3 int locks asignados tras renumber.
# @arg $4 int números de lock referenciados tras renumber.
_infra_refuse_unreconciled_locks() {
  local rc="$1" output_text="$2" after_allocated="$3" after_objects="$4"
  echo "infrastructure_ensure: \`$_INFRASTRUCTURE_RENUMBER_COMMAND\` no corrigió los locks (asignados $after_allocated, referenciados $after_objects; exit $rc)." >&2
  [[ -n "$output_text" ]] && printf '                       salida de Podman: %s\n' "$output_text" >&2
  if thyrox_podman_is_sqlite_volume_renumber_defect "$output_text"; then
    echo "                       Es el defecto conocido de Podman 4.9.3 con backend sqlite (H-THYROX-308): renumber se detiene en el primer volumen." >&2
  fi
  echo "                       El ensure no repara internals de Podman. Recuperación explícita: bin/podman_lock_recovery (sin --confirm muestra el plan)." >&2
  exit "$EXIT_LOCK_COLLISION"
}

# @description Contenedores seleccionados cuya imagen falta en el almacen
# local: sólo esos obligan a bajar una imagen y a reservar disco.
# @stdout un nombre por linea.
_infra_missing_images() {
  local name image
  for name in "${SELECTED_CONTAINERS[@]}"; do
    image="$(thyrox_infrastructure_image "$name")" || { echo "$name"; continue; }
    "$PODMAN" image exists "$image" >/dev/null 2>&1 || echo "$name"
  done
}

# @description Reserva, a nombre de este proceso, el disco que exige bajar
# todas las imagenes que faltan. Si no se admite, rehusa con exit 2 nombrando
# los contenedores, la necesidad, el techo y el banco, sin invocar el bootstrap.
# @arg $@ string los contenedores cuya imagen falta.
_infra_admit_disk_or_refuse() {
  local need=0 name verdict
  for name in "$@"; do
    need=$(( need + $(thyrox_infrastructure_disk_need_bytes "$name") ))
  done
  if verdict="$("$DISK_ADMISSION_BIN" disk-admit --need-bytes "$need" --owner "$$" 2>&1)"; then
    return 0
  fi
  echo "infrastructure_ensure: $* no cabe(n) en disco: necesidad $need bytes; $verdict" >&2
  echo "                       El techo es el que el sistema de archivos declara accesible" >&2
  echo "                       (banco $DISK_ADMISSION_BENCH). No se invoca el bootstrap." >&2
  exit "$EXIT_REFUSED"
}

# @description El estado deseado de la seleccion, como el arreglo JSON que
# lee InfrastructureBootstrap. Declara los secretos por nombre; nunca su valor.
# @stdout el arreglo.
_infra_desired_state() {
  local name
  for name in "${SELECTED_CONTAINERS[@]}"; do
    thyrox_infrastructure_desired_resource "$name" || return 1
  done | jq -s .
}

# @description Entrega el estado deseado al bootstrap. La credencial de
# PostgreSQL viaja sólo por su entorno, y sólo si PostgreSQL esta seleccionado.
# @arg $1 string el estado deseado.
# @exitcode el del bootstrap.
_infra_run_bootstrap() {
  local desired="$1"
  if [[ -n "$POSTGRES_PASSWORD" ]]; then
    printf '%s' "$desired" | env "$POSTGRES_PASSWORD_KEY=$POSTGRES_PASSWORD" "$BOOTSTRAP_BIN"
  else
    printf '%s' "$desired" | env -u "$POSTGRES_PASSWORD_KEY" "$BOOTSTRAP_BIN"
  fi
}

mapfile -t DECLARED_CONTAINERS < <(thyrox_infrastructure_container_names)
if [[ "$#" -gt 0 ]]; then
  SELECTED_CONTAINERS=("$@")
else
  SELECTED_CONTAINERS=("${DECLARED_CONTAINERS[@]}")
fi
_infra_refuse_unknown_names

POSTGRES_PASSWORD=""
if _infra_list_contains "$_INFRASTRUCTURE_POSTGRES_NAME" "${SELECTED_CONTAINERS[@]}"; then
  POSTGRES_PASSWORD="$(thyrox_infrastructure_setting "$POSTGRES_PASSWORD_KEY" '')"
  if [[ -z "$POSTGRES_PASSWORD" ]]; then
    echo "infrastructure_ensure: falta $POSTGRES_PASSWORD_KEY (credencial de PostgreSQL)." >&2
    echo "                       No se invoca podman ni se toca nada." >&2
    exit "$EXIT_REFUSED"
  fi
fi

if ! thyrox_toolchain_require_podman; then
  echo "infrastructure_ensure: podman no esta disponible; no se toca nada." >&2
  exit "$EXIT_REFUSED"
fi
PODMAN="$THYROX_TOOLCHAIN_PODMAN_BIN"

_infra_reconcile_locks

if ! DESIRED_STATE="$(_infra_desired_state)"; then
  echo "infrastructure_ensure: no se pudo componer el estado deseado; no se toca nada." >&2
  exit "$EXIT_REFUSED"
fi

mapfile -t MISSING_IMAGES < <(_infra_missing_images)
if [[ "${#MISSING_IMAGES[@]}" -gt 0 ]]; then
  _infra_admit_disk_or_refuse "${MISSING_IMAGES[@]}"
  _infra_run_bootstrap "$DESIRED_STATE"
  bootstrap_rc=$?
  "$DISK_ADMISSION_BIN" disk-release --owner "$$" >/dev/null 2>&1
else
  _infra_run_bootstrap "$DESIRED_STATE"
  bootstrap_rc=$?
fi
exit "$bootstrap_rc"
