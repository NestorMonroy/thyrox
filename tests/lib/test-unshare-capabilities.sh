#!/usr/bin/env bash
# test-unshare-capabilities.sh — contrato de la sonda `unshare` + cgroup `pids`.
#
# Es la contraparte de test-podman-capabilities.sh para el mecanismo sin
# runtime de contenedores (TASK-THYROX-0546). Cuatro casos:
#   1. rechazo: sin `unshare` en el PATH la sonda REHUSA con exit 2 y no
#      imprime ninguna linea de veredicto.
#   2. camino real: en este anfitrion salen exactamente cuatro lineas TSV, una
#      por capacidad, todas `efectivo`; el limite de PIDs acota a <= 16 de 64.
#   3. sin rastro: ningun cgroup de la sonda sobrevive a la ejecucion.
#   4. dos controles de anulacion sobre una COPIA de la sonda: sin la escritura
#      de `pids.max` cae exactamente `pids_limit` (64/64); sin `--pid` en el
#      `unshare` cae exactamente `escape_containment` y `cleanup`, porque el
#      hijo que llamo a `setsid` sobrevive al principal y sigue en el cgroup.
#      Si al quitar la causa el veredicto no cambiara, la sonda no la mediria.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/unshare_capabilities.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

if [[ ! -x "$SUBJECT" ]]; then
  bad "no existe o no es ejecutable: $SUBJECT"
  thyrox_summary; exit 1
fi
ok "el sujeto existe y es ejecutable"

EXPECTED_CAPABILITIES='run pids_limit escape_containment cleanup'
EXPECTED_LINE_COUNT=4
PIDS_LIMIT=16
FORK_ATTEMPTS=64

# verdict_of <salida> <capacidad>: el veredicto de una linea TSV.
verdict_of() { printf '%s\n' "$1" | gawk -F'\t' -v cap="$2" '$1 == cap {print $2}'; }
detail_of()  { printf '%s\n' "$1" | gawk -F'\t' -v cap="$2" '$1 == cap {print $3}'; }
# created_of <detalle>: el primer numero del detalle («logro N/64 ...»).
created_of() { printf '%s\n' "$1" | gawk 'match($0, /[0-9]+/) {print substr($0, RSTART, RLENGTH)}'; }

# --- Caso 1: sin unshare en el PATH, la sonda rehusa sin imprimir veredictos ---
FAKEBIN="$(mktemp -d)"
IFS=':' read -ra _path_dirs <<< "$PATH"
for _d in "${_path_dirs[@]}"; do
  [[ -d "$_d" ]] || continue
  for _f in "$_d"/*; do
    [[ -e "$_f" ]] || continue
    _b="$(basename "$_f")"
    [[ "$_b" == "unshare" ]] && continue
    [[ -e "$FAKEBIN/$_b" ]] && continue
    ln -s "$_f" "$FAKEBIN/$_b" 2>/dev/null || true
  done
done
unset IFS

out="$(PATH="$FAKEBIN" bash "$SUBJECT" 2>/dev/null)"; rc=$?
err="$(PATH="$FAKEBIN" bash "$SUBJECT" 2>&1 >/dev/null)"
if [[ $rc -eq 2 ]]; then ok "sin unshare en el PATH, rehusa con exit 2"; else bad "esperaba exit 2 sin unshare, dio $rc"; fi
if [[ -z "$out" ]]; then ok "sin unshare, no imprime ninguna linea de veredicto"; else bad "sin unshare imprimio: '$out'"; fi
if [[ -n "$err" ]]; then ok "el rechazo explica el motivo por stderr"; else bad "el rechazo no dijo nada por stderr"; fi
rm -rf "$FAKEBIN"

# --- Precondicion de los casos 2-4: este anfitrion admite el mecanismo ---
host_admits_mechanism() {
  unshare --pid --fork true >/dev/null 2>&1 || return 1
  local probe_dir="/sys/fs/cgroup/pids/thyrox-unshare-cap-precheck-$$"
  mkdir "$probe_dir" 2>/dev/null || return 1
  rmdir "$probe_dir"
}
if ! host_admits_mechanism; then
  bad "este anfitrion no admite unshare --pid o un cgroup pids escribible: los casos 2-4 no se pueden montar"
  thyrox_summary; exit 1
fi

# --- Caso 2: camino real, cuatro lineas, todas efectivo ---
REAL_OUT="$(bash "$SUBJECT")"; REAL_RC=$?
if [[ $REAL_RC -eq 0 ]]; then ok "con el mecanismo real, sale 0"; else bad "esperaba exit 0, dio $REAL_RC. Salida:\n$REAL_OUT"; fi
LINE_COUNT="$(printf '%s\n' "$REAL_OUT" | grep -c . || true)"
if [[ "$LINE_COUNT" -eq "$EXPECTED_LINE_COUNT" ]]; then ok "publica exactamente $EXPECTED_LINE_COUNT lineas"; else bad "esperaba $EXPECTED_LINE_COUNT lineas, dio $LINE_COUNT. Salida:\n$REAL_OUT"; fi
for cap in $EXPECTED_CAPABILITIES; do
  verdict="$(verdict_of "$REAL_OUT" "$cap")"
  if [[ "$verdict" == efectivo ]]; then
    ok "'$cap' da efectivo: $(detail_of "$REAL_OUT" "$cap")"
  else
    bad "'$cap' esperaba efectivo, dio '${verdict:-(ausente)}': $(detail_of "$REAL_OUT" "$cap")"
  fi
done
created="$(created_of "$(detail_of "$REAL_OUT" pids_limit)")"
if [[ -n "$created" && "$created" -le "$PIDS_LIMIT" ]]; then
  ok "el limite de PIDs acoto a $created de $FORK_ATTEMPTS (<= $PIDS_LIMIT)"
else
  bad "el limite de PIDs no acoto: creo '${created:-?}' de $FORK_ATTEMPTS"
fi

# --- Caso 3: no queda rastro ---
LEFTOVER="$(find /sys/fs/cgroup/pids -maxdepth 1 -name 'thyrox-unshare-cap-*' | wc -l)"
if [[ "$LEFTOVER" -eq 0 ]]; then ok "no queda ningun cgroup de la sonda"; else bad "quedaron $LEFTOVER cgroup(s) de la sonda"; fi

# --- Caso 4: controles de anulacion sobre una copia ---
MUTANT_DIR="$(mktemp -d)"

# 4a: sin la escritura de pids.max —sustituida por un no-op, para que la
# copia siga siendo bash valido— el limite no existe y la sonda lo mide.
NO_LIMIT="$MUTANT_DIR/unshare_capabilities.sh"
cp "$SUBJECT" "$NO_LIMIT"
gawk -i inplace '/echo "\$_UNSHARE_CAP_PIDS_LIMIT" >/ {print "  true"; next} {print}' "$NO_LIMIT"
if [[ "$(grep -c '> "\$_UNSHARE_CAP_CGROUP/pids\.max"' "$NO_LIMIT")" -eq 0 ]]; then ok "control 4a: la escritura de pids.max se retiro"; else bad "control 4a: la copia aun escribe pids.max"; fi
NO_LIMIT_OUT="$(bash "$NO_LIMIT")"
if [[ "$(verdict_of "$NO_LIMIT_OUT" pids_limit)" == no-efectivo ]]; then
  ok "control 4a: sin pids.max cae 'pids_limit': $(detail_of "$NO_LIMIT_OUT" pids_limit)"
else
  bad "control 4a: sin pids.max 'pids_limit' deberia dar no-efectivo, dio '$(verdict_of "$NO_LIMIT_OUT" pids_limit)'"
fi
created="$(created_of "$(detail_of "$NO_LIMIT_OUT" pids_limit)")"
if [[ "$created" == "$FORK_ATTEMPTS" ]]; then ok "control 4a: sin limite crea los $FORK_ATTEMPTS"; else bad "control 4a: sin limite creo '$created', no $FORK_ATTEMPTS"; fi
for cap in run escape_containment cleanup; do
  if [[ "$(verdict_of "$NO_LIMIT_OUT" "$cap")" == efectivo ]]; then ok "control 4a: '$cap' sigue efectivo"; else bad "control 4a: '$cap' cayo sin depender del limite"; fi
done

# 4b: sin --pid, el hijo con setsid sobrevive al principal: es la ceguera
# declarada de process_ownership.py, reproducida.
NO_NAMESPACE="$MUTANT_DIR/unshare_capabilities.sh"
cp "$SUBJECT" "$NO_NAMESPACE"
gawk -i inplace '/^_UNSHARE_CAP_NAMESPACE_FLAGS=/ {sub(/--pid /, "")} {print}' "$NO_NAMESPACE"
if [[ "$(grep -c '^_UNSHARE_CAP_NAMESPACE_FLAGS=.*--pid' "$NO_NAMESPACE")" -eq 0 ]]; then ok "control 4b: --pid se retiro"; else bad "control 4b: la copia aun pasa --pid"; fi
NO_NAMESPACE_OUT="$(bash "$NO_NAMESPACE")"
for cap in escape_containment cleanup; do
  if [[ "$(verdict_of "$NO_NAMESPACE_OUT" "$cap")" == no-efectivo ]]; then
    ok "control 4b: sin --pid cae '$cap': $(detail_of "$NO_NAMESPACE_OUT" "$cap")"
  else
    bad "control 4b: sin --pid '$cap' deberia dar no-efectivo, dio '$(verdict_of "$NO_NAMESPACE_OUT" "$cap")'"
  fi
done
for cap in run pids_limit; do
  if [[ "$(verdict_of "$NO_NAMESPACE_OUT" "$cap")" == efectivo ]]; then ok "control 4b: '$cap' sigue efectivo"; else bad "control 4b: '$cap' cayo sin depender del namespace"; fi
done
# La copia sin namespace deja un escapado que su propio trap retira: se mide.
LEFTOVER="$(find /sys/fs/cgroup/pids -maxdepth 1 -name 'thyrox-unshare-cap-*' | wc -l)"
if [[ "$LEFTOVER" -eq 0 ]]; then ok "control 4b: aun sin namespace, el trap retiro el cgroup"; else bad "control 4b: quedaron $LEFTOVER cgroup(s)"; fi
if ! pgrep -f '[t]hyrox-unshare-cap-escapee' >/dev/null; then ok "control 4b: el trap retiro al escapado"; else bad "control 4b: el escapado sigue vivo"; fi
rm -rf "$MUTANT_DIR"

thyrox_summary
