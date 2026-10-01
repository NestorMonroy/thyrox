#!/usr/bin/env bash
# =============================================================================
# podman_lock_recovery.sh — procedimiento EXPLÍCITO de recuperación de locks
# de Podman cuando `podman system renumber` no basta
# =============================================================================
#
# `infrastructure_ensure` detecta el desfase de locks, intenta el mecanismo
# soportado (`podman system renumber`) y, si falla, rehúsa publicando el
# stderr de Podman. No repara internals de Podman. Esta pieza es esa
# reparación, y sólo corre cuando un operador la pide.
#
# Qué hace: retira el marcador `alive` del directorio temporal de libpod. Sin
# él, el siguiente comando de Podman refresca su estado y vuelve a asignar en
# memoria compartida el número de lock que la base guarda por objeto, que es
# lo que ocurre tras reiniciar la máquina. Después mide de nuevo.
#
# Alcance medido, y fuera de él rehúsa: Podman 4.9.x, backend `sqlite`, uid 0
# (directorio temporal `/run/libpod`, o `tmp_dir` de containers.conf), sin
# ningún contenedor con proceso vivo y con el marcador presente. La semántica
# del marcador en otras versiones o backends no está medida (H-THYROX-308).
#
# Uso: podman_lock_recovery [--confirm]
#   sin --confirm   publica la medida y el plan; no toca nada.
#   --confirm       ejecuta la recuperación.
#
# Exit 0  plan publicado, nada que recuperar, o recuperado y equilibrado.
# Exit 2  rehusado: fuera del alcance medido, contenedor vivo, marcador
#         ausente, o Podman no publica la medida. No se toca nada.
# Exit 3  tras recuperar, la medida sigue desequilibrada.
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
readonly ALIVE_MARKER="alive"
readonly CONFIRM_FLAG="--confirm"

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

# @description Rehúsa si el entorno no es el medido o si no es seguro.
# @arg $1 string versión de Podman.
# @arg $2 string backend de su base.
# @arg $3 string ruta del marcador.
refuse_outside_measured_scope() {
  local version="$1" backend="$2" marker="$3" uid live
  uid="$(thyrox_infrastructure_setting THYROX_PODMAN_LOCK_RECOVERY_UID "$(id -u)")"
  [[ "$version" == "$MEASURED_VERSION_PREFIX"* ]] || refuse "Podman $version fuera del alcance medido (${MEASURED_VERSION_PREFIX}x); no se infiere la semántica del marcador."
  [[ "$backend" == "$MEASURED_BACKEND" ]] || refuse "backend $backend fuera del alcance medido ($MEASURED_BACKEND)."
  [[ "$uid" == "$MEASURED_UID" ]] || refuse "uid $uid fuera del alcance medido (root, $DEFAULT_LIBPOD_TMP_DIR)."
  live="$(thyrox_podman_live_containers | paste -sd, -)"
  [[ -z "$live" ]] || refuse "contenedores con proceso vivo: $live. Detenerlos antes de recuperar."
  [[ -e "$marker" ]] || refuse "no existe $marker; sin el marcador medido no se recupera."
}

main() {
  local confirm=false
  case "${1:-}" in
    "") ;;
    "$CONFIRM_FLAG") confirm=true ;;
    *) refuse "argumento desconocido: $1 (uso: podman_lock_recovery [$CONFIRM_FLAG])" ;;
  esac

  local version backend marker balance allocated referenced
  version="$("$PODMAN" version --format '{{.Client.Version}}' 2>/dev/null)"
  backend="$("$PODMAN" info --format '{{.Host.DatabaseBackend}}' 2>/dev/null)"
  marker="$(libpod_tmp_dir)/$ALIVE_MARKER"
  balance="$(thyrox_podman_lock_balance)" || refuse "Podman no publica los locks libres; no hay medida."
  read -r allocated referenced <<< "$balance"
  printf 'podman %s · backend %s · locks asignados %s, referenciados %s · marcador %s\n' \
    "$version" "$backend" "$allocated" "$referenced" "$marker"

  if (( allocated >= referenced )); then
    echo "nada que recuperar: la medida está equilibrada."
    return 0
  fi
  refuse_outside_measured_scope "$version" "$backend" "$marker"
  if [[ "$confirm" != true ]]; then
    echo "plan: retirar $marker y dejar que Podman refresque la asignación de locks. Ejecutar con $CONFIRM_FLAG."
    return 0
  fi

  rm -f -- "$marker"
  "$PODMAN" ps -a --format '{{.Names}}' >/dev/null 2>&1
  read -r allocated referenced <<< "$(thyrox_podman_lock_balance)"
  printf 'tras refrescar: locks asignados %s, referenciados %s\n' "$allocated" "$referenced"
  (( allocated >= referenced )) || exit "$EXIT_STILL_IMBALANCED"
}

main "$@"
