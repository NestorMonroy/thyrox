#!/usr/bin/env bash
# test-podman-capabilities.sh — contrato de la sonda de capacidades de Podman.
#
# Tres casos. El primero mide el rechazo: sin Podman en el PATH, la sonda
# REHUSA con exit 2 y no imprime ninguna linea de veredicto — un veredicto
# fabricado sin poder medir seria peor que ningun veredicto. El segundo mide
# el camino real: con el Podman de este contenedor, salen exactamente ocho
# lineas TSV, una por capacidad, y `run`/`cleanup`/`network_none`/
# `read_only_rootfs`/`cpu_limit`/`readonly_mount` —las seis que este
# contenedor sostiene sin condicion— dan `efectivo`. El tercero confirma que
# la sonda no deja rastro: ni la imagen ni ningun contenedor propio sobreviven
# a la ejecucion.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/podman_capabilities.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

if [[ ! -x "$SUBJECT" ]]; then
  bad "no existe o no es ejecutable: $SUBJECT"
  thyrox_summary; exit 1
fi
ok "el sujeto existe y es ejecutable"

VALID_VERDICTS='efectivo no-efectivo error'
EXPECTED_CAPABILITIES='run pids_limit memory_limit cleanup network_none read_only_rootfs cpu_limit readonly_mount'

# --- Caso 1: sin podman en el PATH, la sonda rehusa sin imprimir veredictos ---
#
# Se reconstruye el PATH con un symlink por cada binario resoluble HOY,
# salvo `podman`: asi `gcc`, `mktemp`, `tar`, `dirname` y compania siguen
# disponibles y lo unico que cambia es que `podman` deja de resolver — la
# condicion exacta que gobierna `thyrox_toolchain_require_podman`.
FAKEBIN="$(mktemp -d)"
IFS=':' read -ra _path_dirs <<< "$PATH"
for _d in "${_path_dirs[@]}"; do
  [[ -d "$_d" ]] || continue
  for _f in "$_d"/*; do
    [[ -e "$_f" ]] || continue
    _b="$(basename "$_f")"
    [[ "$_b" == "podman" ]] && continue
    [[ -e "$FAKEBIN/$_b" ]] && continue
    ln -s "$_f" "$FAKEBIN/$_b" 2>/dev/null || true
  done
done
unset IFS

if command -v podman >/dev/null 2>&1; then
  out="$(PATH="$FAKEBIN" THYROX_INSTALL_PODMAN='' bash "$SUBJECT" 2>/dev/null)"; rc=$?
  err="$(PATH="$FAKEBIN" THYROX_INSTALL_PODMAN='' bash "$SUBJECT" 2>&1 >/dev/null)"
  if [[ $rc -eq 2 ]]; then
    ok "sin podman en el PATH, rehusa con exit 2"
  else
    bad "esperaba exit 2 sin podman en el PATH, dio $rc"
  fi
  if [[ -z "$out" ]]; then
    ok "sin podman en el PATH, no imprime ninguna linea de veredicto"
  else
    bad "sin podman en el PATH, imprimio salida: '$out'"
  fi
  if [[ -n "$err" ]]; then
    ok "el rechazo explica el motivo por stderr"
  else
    bad "el rechazo no dijo nada por stderr"
  fi
else
  bad "no se pudo montar el caso 1: 'podman' ya no resuelve en el PATH de este proceso"
fi
rm -rf "$FAKEBIN"

# --- Caso 2: con el Podman real, cuatro lineas TSV validas ---
if command -v podman >/dev/null 2>&1 && podman info >/dev/null 2>&1; then
  REAL_OUT="$(bash "$SUBJECT")"; REAL_RC=$?
  if [[ $REAL_RC -eq 0 ]]; then
    ok "con Podman real, sale 0"
  else
    bad "con Podman real, esperaba exit 0, dio $REAL_RC. Salida:\n$REAL_OUT"
  fi

  LINE_COUNT="$(printf '%s\n' "$REAL_OUT" | grep -c . || true)"
  if [[ "$LINE_COUNT" -eq 8 ]]; then
    ok "publica exactamente ocho lineas"
  else
    bad "esperaba 8 lineas, dio $LINE_COUNT. Salida:\n$REAL_OUT"
  fi

  declare -A SEEN_CAP=()
  declare -A VERDICT_OF=()
  while IFS=$'\t' read -r cap verdict detail; do
    [[ -z "$cap" ]] && continue
    SEEN_CAP["$cap"]=1
    VERDICT_OF["$cap"]="$verdict"
    if [[ " $VALID_VERDICTS " == *" $verdict "* ]]; then
      ok "capacidad '$cap' trae un veredicto valido ($verdict): $detail"
    else
      bad "capacidad '$cap' trae un veredicto invalido: '$verdict'"
    fi
  done <<< "$REAL_OUT"

  for cap in $EXPECTED_CAPABILITIES; do
    if [[ -n "${SEEN_CAP[$cap]:-}" ]]; then
      ok "aparece la capacidad '$cap'"
    else
      bad "falta la capacidad '$cap' en la salida"
    fi
  done

  if [[ "${VERDICT_OF[run]:-}" == "efectivo" ]]; then
    ok "'run' da efectivo"
  else
    bad "'run' esperaba efectivo, dio '${VERDICT_OF[run]:-(ausente)}'"
  fi
  if [[ "${VERDICT_OF[cleanup]:-}" == "efectivo" ]]; then
    ok "'cleanup' da efectivo"
  else
    bad "'cleanup' esperaba efectivo, dio '${VERDICT_OF[cleanup]:-(ausente)}'"
  fi
  # Las cuatro capacidades nuevas se sostienen sin condicion en este
  # anfitrion (Podman 4.9.3, uid 0), medido en
  # .claude/workbench/podman-isolation-2b-20260929T100450/ y
  # .claude/workbench/podman-isolation-2b-gaps-20260929T140754/.
  for cap in network_none read_only_rootfs cpu_limit readonly_mount; do
    if [[ "${VERDICT_OF[$cap]:-}" == "efectivo" ]]; then
      ok "'$cap' da efectivo"
    else
      bad "'$cap' esperaba efectivo, dio '${VERDICT_OF[$cap]:-(ausente)}'"
    fi
  done
  # pids_limit y memory_limit se informan tal cual: no se fuerza su veredicto.
  if [[ -n "${VERDICT_OF[pids_limit]:-}" ]]; then
    ok "'pids_limit' se informa (${VERDICT_OF[pids_limit]}), sin forzar el valor"
  else
    bad "'pids_limit' no aparecio"
  fi
  if [[ -n "${VERDICT_OF[memory_limit]:-}" ]]; then
    ok "'memory_limit' se informa (${VERDICT_OF[memory_limit]}), sin forzar el valor"
  else
    bad "'memory_limit' no aparecio"
  fi

  # --- Caso 3: no queda rastro ---
  LEFTOVER_IMAGES="$(podman images --format '{{.Repository}}' 2>/dev/null \
    | grep -c '^localhost/thyrox-podman-capabilities-' || true)"
  if [[ "$LEFTOVER_IMAGES" -eq 0 ]]; then
    ok "no queda ninguna imagen de la sonda"
  else
    bad "quedaron $LEFTOVER_IMAGES imagen(es) de la sonda"
  fi

  LEFTOVER_CONTAINERS="$(podman ps -a --format '{{.Names}}' 2>/dev/null \
    | grep -c '^thyrox-podman-cap-' || true)"
  if [[ "$LEFTOVER_CONTAINERS" -eq 0 ]]; then
    ok "no queda ningun contenedor de la sonda"
  else
    bad "quedaron $LEFTOVER_CONTAINERS contenedor(es) de la sonda"
  fi
else
  bad "no hay Podman real disponible en este contenedor para el caso 2/3"
fi

thyrox_summary
