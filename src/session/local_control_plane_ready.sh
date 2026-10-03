#!/usr/bin/env bash
# =============================================================================
# local_control_plane_ready.sh — deja listo el plano de control local tras un
# arranque, componiendo la recuperación del motor y la convergencia (P0c2)
# =============================================================================
#
# Es una COMPOSICIÓN, no una autoridad. Cada responsabilidad tiene su dueño y
# aquí no se repite ninguna:
#
#   podman_lock_recovery   mide, clasifica y repara el defecto conocido del motor
#   infrastructure_ensure  converge la infraestructura declarada
#
# Este guion sólo lee el veredicto contractual de `--classify` y decide el
# orden. No conoce la firma, la versión ni el backend del motor, y no invoca
# el motor: todo eso es de `podman_lock_recovery`.
#
#   --classify ─ HEALTHY ───────────────────────────────────────→ ensure
#             ├─ KNOWN_POST_REBOOT_RECOVERABLE → --after-reboot
#             │      → --classify (tiene que ser HEALTHY) ─────────→ ensure
#             └─ REFUSED <razón> o cualquier otra salida → cierra en falso
#
# Tras la infraestructura (TASK-THYROX-0928) compone dos autoridades más:
#
#   podman-execution-execute reconcile-orphans   retira los contenedores cuyo dueño murió
#   model_coordinator start | status              deja el coordinador de modelos en marcha
#
# Uso: local_control_plane_ready [contenedor...] — converge; los argumentos son
#      la selección que recibe infrastructure_ensure.
#      local_control_plane_ready --status — sólo mide: veredicto del motor y
#      estado del coordinador. No repara ni converge. Exit 0 listo, 1 no listo.
#      local_control_plane_ready --help — imprime este uso y no llama a nada.
#
# Exit 0  plano de control listo: infraestructura, huérfanos y coordinador.
# Exit 2  cerrado en falso: veredicto REFUSED, fuera del contrato, o la
#         reparación no dejó el motor sano. Nada converge.
# Otro    la salida de --after-reboot o de infrastructure_ensure, propagada.
# =============================================================================
set -uo pipefail

_READY_HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$_READY_HERE/../lib/reach.sh"

readonly EXIT_FAIL_CLOSED=2
readonly VERDICT_HEALTHY="HEALTHY"
readonly VERDICT_RECOVERABLE="KNOWN_POST_REBOOT_RECOVERABLE"

LOCK_RECOVERY_BIN="$(thyrox_config_value THYROX_CONTROL_PLANE_LOCK_RECOVERY_BIN "$_READY_HERE/../../bin/podman_lock_recovery")"
INFRA_ENSURE_BIN="$(thyrox_config_value THYROX_CONTROL_PLANE_INFRA_ENSURE_BIN "$_READY_HERE/../../bin/infrastructure_ensure")"
RECONCILE_BIN="$(thyrox_config_value THYROX_CONTROL_PLANE_RECONCILE_BIN "$_READY_HERE/../../bin/podman-execution-execute")"
COORDINATOR_BIN="$(thyrox_config_value THYROX_CONTROL_PLANE_COORDINATOR_BIN "$_READY_HERE/../../bin/model_coordinator")"
readonly EXIT_NOT_READY=1

fail_closed() {
  printf 'local_control_plane_ready: %s\n' "$1" >&2
  exit "$EXIT_FAIL_CLOSED"
}

# @description El veredicto de la recuperación, tal cual. Una clasificación
# que no sale 0 no tiene veredicto que leer.
# @stdout la línea del veredicto.
classify() {
  local verdict
  verdict="$(bash "$LOCK_RECOVERY_BIN" --classify)" || fail_closed "--classify no pudo clasificar; no se converge."
  printf '%s' "$verdict"
}

recover_after_reboot() {
  local status verdict
  bash "$LOCK_RECOVERY_BIN" --after-reboot
  status=$?
  if (( status != 0 )); then
    printf 'local_control_plane_ready: --after-reboot salió %s; no se converge.\n' "$status" >&2
    exit "$status"
  fi
  verdict="$(classify)"
  [[ "$verdict" == "$VERDICT_HEALTHY" ]] || fail_closed "tras --after-reboot el veredicto es «$verdict», no $VERDICT_HEALTHY; no se converge."
}

usage() {
  sed -n '/^# Uso:/,/^# Exit 0/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

# @description Sólo mide: el veredicto del motor y el estado del coordinador.
# Nunca repara ni converge — un status que actúa fue el episodio de 0928.
report_status() {
  local verdict ready=0
  verdict="$(classify)"
  printf 'motor: %s\n' "$verdict"
  [[ "$verdict" == "$VERDICT_HEALTHY" ]] || ready=1
  bash "$COORDINATOR_BIN" status || ready=1
  (( ready == 0 )) || exit "$EXIT_NOT_READY"
}

# @description Tras la infraestructura: huérfanos fuera y coordinador en marcha.
# Cada paso que falla corta la composición con su salida.
converge_runtime() {
  bash "$RECONCILE_BIN" reconcile-orphans || exit $?
  bash "$COORDINATOR_BIN" start >/dev/null || exit $?
  bash "$COORDINATOR_BIN" status
}

converge() {
  local verdict status
  verdict="$(classify)"
  case "$verdict" in
    "$VERDICT_HEALTHY") ;;
    "$VERDICT_RECOVERABLE") recover_after_reboot ;;
    *) fail_closed "veredicto «$verdict»: no es $VERDICT_HEALTHY ni $VERDICT_RECOVERABLE; no se repara ni se converge." ;;
  esac
  bash "$INFRA_ENSURE_BIN" "$@"
  status=$?
  (( status == 0 )) || exit "$status"
  converge_runtime
}

main() {
  case "${1:-}" in
    --help) usage ;;
    --status) report_status ;;
    *) converge "$@" ;;
  esac
}

main "$@"
