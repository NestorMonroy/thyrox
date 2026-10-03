#!/usr/bin/env bash
# =============================================================================
# podman_lock_recovery.sh — medir, clasificar y reparar el desfase de locks de
# Podman (la autoridad del defecto conocido del motor)
# =============================================================================
#
# `infrastructure_ensure` detecta el desfase de locks y rehúsa nombrando esta
# pieza: converger el estado declarado y reparar el motor son dos contratos.
# Aquí vive todo lo segundo: la medida, la firma del caso conocido y la
# reparación.
#
# Qué repara: retira el marcador `alive` del directorio temporal de libpod.
# Sin él, el siguiente comando de Podman refresca su estado y vuelve a asignar
# en memoria compartida el número de lock que la base guarda por objeto, que
# es lo que ocurre tras reiniciar la máquina. Después mide de nuevo.
#
# La firma post-reboot (H-THYROX-442): aquí /run no es volátil, así que el
# marcador del arranque anterior sobrevive al reinicio, Podman no refresca y
# la memoria compartida de locks nace vacía. Se reconoce sólo si se cumplen
# JUNTAS todas las guardas: Podman 4.9.x, backend `sqlite`, uid 0, marcador
# presente con mtime anterior al `btime` del núcleo, ningún lock asignado,
# alguno referenciado y ningún contenedor con proceso vivo. Un desfase parcial
# no es esta firma. La semántica del marcador en otras versiones o backends no
# está medida (H-THYROX-308).
#
# Uso: podman_lock_recovery [--classify | --after-reboot | --confirm]
#   sin argumento   publica la medida y el plan; no toca nada.
#   --classify      publica UNA línea legible por máquina y no muta nada:
#                     HEALTHY | KNOWN_POST_REBOOT_RECOVERABLE | REFUSED <razón>
#                   Sale 0 en los tres casos: el veredicto está en stdout.
#   --after-reboot  vuelve a clasificar y repara SÓLO la firma post-reboot;
#                   exige HEALTHY al volver a medir. Nunca cae a --confirm.
#   --confirm       reparación del operador sobre cualquier desfase dentro del
#                   alcance medido (versión, backend, uid, sin vivos, marcador).
#
# Exit 0  veredicto publicado, plan publicado, nada que recuperar, o
#         recuperado y equilibrado.
# Exit 2  uso incorrecto, o rehusado sin tocar nada.
# Exit 3  tras reparar, la medida sigue desequilibrada.
# =============================================================================
set -uo pipefail

_LOCK_RECOVERY_HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$_LOCK_RECOVERY_HERE/../lib/podman_locks.sh"

readonly EXIT_REFUSED=2
readonly EXIT_STILL_IMBALANCED=3
readonly MEASURED_VERSION_PREFIX="4.9."
readonly MEASURED_BACKEND="sqlite"
readonly MEASURED_UID="0"
readonly DEFAULT_LIBPOD_TMP_DIR="/run/libpod"
readonly DEFAULT_PROC_STAT="/proc/stat"
readonly ALIVE_MARKER="alive"
readonly CLASSIFY_FLAG="--classify"
readonly AFTER_REBOOT_FLAG="--after-reboot"
readonly CONFIRM_FLAG="--confirm"
readonly VERDICT_HEALTHY="HEALTHY"
readonly VERDICT_RECOVERABLE="KNOWN_POST_REBOOT_RECOVERABLE"
readonly VERDICT_REFUSED="REFUSED"

PODMAN="${THYROX_TOOLCHAIN_PODMAN_BIN:-podman}"

refuse() {
  printf 'podman_lock_recovery: %s\n' "$1" >&2
  exit "$EXIT_REFUSED"
}

# @description Directorio temporal de libpod: el declarado para las suites,
# el `tmp_dir` de containers.conf, o el default de Podman para root.
# @stdout la ruta.
libpod_tmp_dir() {
  local declared conf
  declared="$(thyrox_infrastructure_setting THYROX_PODMAN_LIBPOD_TMP_DIR '')"
  [[ -n "$declared" ]] && { echo "$declared"; return; }
  for conf in /etc/containers/containers.conf /usr/share/containers/containers.conf; do
    [[ -f "$conf" ]] || continue
    declared="$(sed -n 's/^[[:space:]]*tmp_dir[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "$conf" | tail -1)"
    [[ -n "$declared" ]] && { echo "$declared"; return; }
  done
  echo "$DEFAULT_LIBPOD_TMP_DIR"
}

# @description Arranque del núcleo en segundos desde la época: el `btime` de
# /proc/stat, o del archivo que THYROX_PODMAN_PROC_STAT declare en las suites.
# @stdout el epoch; nada si no se pudo leer.
kernel_boot_epoch() {
  local proc_stat
  proc_stat="$(thyrox_infrastructure_setting THYROX_PODMAN_PROC_STAT "$DEFAULT_PROC_STAT")"
  gawk '$1 == "btime" && $2 ~ /^[0-9]+$/ { print $2; exit }' "$proc_stat" 2>/dev/null
}

# @description Mide el motor y deja la medida en las variables ENGINE_*.
# Sin locks libres publicados no hay balance: sale 1 sin inferirlo.
measure_engine() {
  local balance
  ENGINE_VERSION="$("$PODMAN" version --format '{{.Client.Version}}' 2>/dev/null)"
  ENGINE_BACKEND="$("$PODMAN" info --format '{{.Host.DatabaseBackend}}' 2>/dev/null)"
  ENGINE_MARKER="$(libpod_tmp_dir)/$ALIVE_MARKER"
  balance="$(thyrox_podman_lock_balance)" || return 1
  read -r ENGINE_ALLOCATED ENGINE_REFERENCED <<< "$balance"
}

publish_measure() {
  printf 'podman %s · backend %s · locks asignados %s, referenciados %s · marcador %s\n' \
    "${ENGINE_VERSION:-?}" "${ENGINE_BACKEND:-?}" "$ENGINE_ALLOCATED" "$ENGINE_REFERENCED" "$ENGINE_MARKER"
}

engine_is_balanced() { (( ENGINE_ALLOCATED >= ENGINE_REFERENCED )); }

# @description Las guardas del alcance medido, comunes a --confirm y a la
# firma post-reboot: una sola fuente. Imprime `<razón>\t<detalle>` de la
# primera que falla; nada si todas se cumplen.
scope_refusal() {
  local uid live
  uid="$(thyrox_infrastructure_setting THYROX_PODMAN_LOCK_RECOVERY_UID "$(id -u)")"
  if [[ "$ENGINE_VERSION" != "$MEASURED_VERSION_PREFIX"* ]]; then
    printf 'unsupported-version\tPodman %s fuera del alcance medido (%sx); no se infiere la semántica del marcador.\n' "$ENGINE_VERSION" "$MEASURED_VERSION_PREFIX"
  elif [[ "$ENGINE_BACKEND" != "$MEASURED_BACKEND" ]]; then
    printf 'unsupported-backend\tbackend %s fuera del alcance medido (%s).\n' "$ENGINE_BACKEND" "$MEASURED_BACKEND"
  elif [[ "$uid" != "$MEASURED_UID" ]]; then
    printf 'unsupported-uid\tuid %s fuera del alcance medido (root, %s).\n' "$uid" "$DEFAULT_LIBPOD_TMP_DIR"
  elif live="$(thyrox_podman_live_containers | paste -sd, -)"; [[ -n "$live" ]]; then
    printf 'live-containers\tcontenedores con proceso vivo: %s. Detenerlos antes de recuperar.\n' "$live"
  elif [[ ! -e "$ENGINE_MARKER" ]]; then
    printf 'marker-absent\tno existe %s; sin el marcador medido no se recupera.\n' "$ENGINE_MARKER"
  fi
}

# @description Lo que la firma post-reboot exige además del alcance medido:
# el marcador es del arranque anterior y la memoria de locks nació vacía.
# Imprime `<razón>\t<detalle>` de la primera que falla; nada si se cumplen.
post_reboot_refusal() {
  local boot_epoch marker_epoch
  boot_epoch="$(kernel_boot_epoch)"
  marker_epoch="$(stat -c %Y "$ENGINE_MARKER" 2>/dev/null)"
  if [[ -z "$boot_epoch" || -z "$marker_epoch" ]]; then
    printf 'measurement-incomplete\tsin btime del núcleo o sin mtime del marcador.\n'
  elif (( marker_epoch >= boot_epoch )); then
    printf 'marker-current-boot\tel marcador (mtime %s) es del arranque actual (btime %s).\n' "$marker_epoch" "$boot_epoch"
  elif (( ENGINE_ALLOCATED != 0 )); then
    printf 'partial-allocation\t%s de %s locks asignados: un desfase parcial no es la firma post-reboot.\n' "$ENGINE_ALLOCATED" "$ENGINE_REFERENCED"
  fi
}

# @description Mide y decide en ESTA shell: deja el veredicto en VERDICT y
# la medida en ENGINE_*, para que quien mute actúe sobre la misma medida que
# decidió. Lo humano va a stderr.
measure_and_decide() {
  local refusal
  if ! measure_engine; then
    echo "podman_lock_recovery: Podman no publica los locks libres; no hay medida." >&2
    VERDICT="$VERDICT_REFUSED measurement-incomplete"
    return
  fi
  publish_measure >&2
  if engine_is_balanced; then
    VERDICT="$VERDICT_HEALTHY"
    return
  fi
  if [[ -z "$ENGINE_VERSION" || -z "$ENGINE_BACKEND" ]]; then
    echo "podman_lock_recovery: Podman no publica versión o backend." >&2
    VERDICT="$VERDICT_REFUSED measurement-incomplete"
    return
  fi
  refusal="$(scope_refusal)"
  [[ -n "$refusal" ]] || refusal="$(post_reboot_refusal)"
  if [[ -n "$refusal" ]]; then
    printf 'podman_lock_recovery: %s\n' "${refusal#*$'\t'}" >&2
    VERDICT="$VERDICT_REFUSED ${refusal%%$'\t'*}"
    return
  fi
  VERDICT="$VERDICT_RECOVERABLE"
}

# @description El veredicto, como línea del contrato.
# @stdout HEALTHY | KNOWN_POST_REBOOT_RECOVERABLE | REFUSED <razón>
classify_verdict() {
  measure_and_decide
  echo "$VERDICT"
}

# @description La reparación: retirar el marcador, dejar que Podman refresque
# y volver a medir.
refresh_lock_allocation() {
  rm -f -- "$ENGINE_MARKER"
  "$PODMAN" ps -a --format '{{.Names}}' >/dev/null 2>&1
  read -r ENGINE_ALLOCATED ENGINE_REFERENCED <<< "$(thyrox_podman_lock_balance)"
  printf 'tras refrescar: locks asignados %s, referenciados %s\n' "$ENGINE_ALLOCATED" "$ENGINE_REFERENCED"
}

recover_after_reboot() {
  measure_and_decide
  echo "antes: $VERDICT"
  [[ "$VERDICT" == "$VERDICT_RECOVERABLE" ]] || refuse "--after-reboot sólo repara $VERDICT_RECOVERABLE; veredicto: $VERDICT. No se toca nada."
  # TOCTOU: una guarda puede cambiar entre la clasificación publicada y la
  # mutación. La decisión que autoriza retirar el marcador se toma sobre la
  # medida inmediatamente anterior a retirarlo.
  measure_and_decide
  [[ "$VERDICT" == "$VERDICT_RECOVERABLE" ]] || refuse "la firma cambió entre la clasificación y la reparación (ahora: $VERDICT). No se toca nada."
  refresh_lock_allocation
  measure_and_decide
  echo "después: $VERDICT"
  [[ "$VERDICT" == "$VERDICT_HEALTHY" ]] || exit "$EXIT_STILL_IMBALANCED"
}

operator_recovery() {
  local confirm="$1" refusal
  measure_engine || refuse "Podman no publica los locks libres; no hay medida."
  publish_measure
  if engine_is_balanced; then
    echo "nada que recuperar: la medida está equilibrada."
    return 0
  fi
  refusal="$(scope_refusal)"
  [[ -z "$refusal" ]] || refuse "${refusal#*$'\t'}"
  if [[ "$confirm" != true ]]; then
    echo "plan: retirar $ENGINE_MARKER y dejar que Podman refresque la asignación de locks. Ejecutar con $CONFIRM_FLAG."
    return 0
  fi
  refresh_lock_allocation
  engine_is_balanced || exit "$EXIT_STILL_IMBALANCED"
}

main() {
  case "${1:-}" in
    "") operator_recovery false ;;
    "$CONFIRM_FLAG") operator_recovery true ;;
    "$CLASSIFY_FLAG") classify_verdict ;;
    "$AFTER_REBOOT_FLAG") recover_after_reboot ;;
    *) refuse "argumento desconocido: $1 (uso: podman_lock_recovery [$CLASSIFY_FLAG | $AFTER_REBOOT_FLAG | $CONFIRM_FLAG])" ;;
  esac
}

main "$@"
