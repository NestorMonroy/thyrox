#!/usr/bin/env bash
# @description Sonda de capacidades de `unshare` + cgroup `pids` como frontera de
# un item del pool, sin runtime de contenedores.
#
# Es la contraparte de podman_capabilities.sh para el mecanismo que el kernel
# ofrece a pelo: un espacio de nombres de PID nuevo (`unshare --pid --fork`),
# que mata a todo lo que quede dentro cuando su init sale, y un cgroup `pids`
# propio, que acota cuantos procesos puede crear el item y lista a TODOS sus
# miembros —tambien al que llame a `setsid` y salga de la sesion—. El item se
# inscribe solo en el cgroup con la forma que la referencia usa para su cgroup
# de memoria (`echo 0 > <cgroup>/cgroup.procs; exec "$@"`).
#
# Publica en stdout una linea TSV por capacidad —`capacidad<TAB>veredicto
# <TAB>detalle`—, con veredicto `efectivo`, `no-efectivo` o `error`. Un
# veredicto `no-efectivo`/`error` no es un fallo del guion: es la MEDIDA. Lo
# unico que hace fallar al guion (exit 2, sin imprimir ninguna linea) es no
# poder medir: falta `unshare`, `python3` o `gawk`, o el cgroup `pids` no admite un
# hijo escribible.
#
# Cuatro capacidades, en este orden:
#   run                 `unshare --pid --fork` corre el ayudante y sale 0
#   pids_limit          con pids.max=16, el ayudante que intenta 64 procesos
#                       logra <= 16
#   escape_containment  el ayudante deja un hijo que llama a setsid() y
#                       duerme, y su principal sale; efectivo si ese hijo ya
#                       no existe en el anfitrion (murio con el init del
#                       espacio de nombres). Es la ceguera declarada de
#                       process_ownership.py, medida.
#   cleanup             tras salir el principal, cgroup.procs esta vacio y el
#                       cgroup se retira con rmdir
#
# @exitcode 0 Se pudieron medir las cuatro capacidades (cualquiera sea su
#             veredicto).
# @exitcode 2 No se pudo medir: falta `unshare` (util-linux) o `python3`, o no
#             se pudo crear el cgroup. No se imprime ninguna linea de veredicto.

set -uo pipefail

# Identificador unico de esta ejecucion: nombre del cgroup y marcador que
# identifica al escapado en la tabla de procesos del anfitrion.
_UNSHARE_CAP_RUN_ID="$$-${RANDOM}"
_UNSHARE_CAP_CGROUP_NAME="thyrox-unshare-cap-${_UNSHARE_CAP_RUN_ID}"
_UNSHARE_CAP_ESCAPEE_MARKER="thyrox-unshare-cap-escapee-${_UNSHARE_CAP_RUN_ID}"

# Los espacios de nombres que aislan al item. `--fork` es obligatorio con
# `--pid`: quien llama no puede entrar en un espacio de PID nuevo, solo sus
# hijos. Un control de anulacion retira `--pid` de esta linea.
_UNSHARE_CAP_NAMESPACE_FLAGS=(--pid --fork)

readonly _UNSHARE_CAP_PIDS_LIMIT=16
readonly _UNSHARE_CAP_FORK_ATTEMPTS=64
# Cuanto duerme el escapado si nadie lo mata, y cuanto se espera a que el
# kernel lo retire tras salir el init: SETTLE_POLLS sondeos de POLL_SECONDS.
readonly _UNSHARE_CAP_ESCAPEE_SECONDS=30
readonly _UNSHARE_CAP_SETTLE_POLLS=20
readonly _UNSHARE_CAP_POLL_SECONDS=0.1

_UNSHARE_CAP_WORK=""
_UNSHARE_CAP_CGROUP=""

# _unshare_cap_cgroup_members — los pids inscritos en el cgroup de la sonda.
_unshare_cap_cgroup_members() {
  [[ -r "$_UNSHARE_CAP_CGROUP/cgroup.procs" ]] || return 0
  grep -E '^[0-9]+$' "$_UNSHARE_CAP_CGROUP/cgroup.procs" || true
}

# _unshare_cap_cleanup — retira SIEMPRE lo que esta sonda creo: mata a
# cualquier miembro que quede en el cgroup (un escapado de un control de
# anulacion), retira el cgroup y el directorio de trabajo. Corre por
# `trap ... EXIT`, asi que ve cualquier salida, incluido un `exit 2` temprano.
_unshare_cap_cleanup() {
  local pid
  if [[ -n "$_UNSHARE_CAP_CGROUP" && -d "$_UNSHARE_CAP_CGROUP" ]]; then
    for pid in $(_unshare_cap_cgroup_members); do
      kill -KILL "$pid" 2>/dev/null || true
    done
    _unshare_cap_wait_cgroup_empty
    rmdir "$_UNSHARE_CAP_CGROUP" 2>/dev/null || true
  fi
  if [[ -n "$_UNSHARE_CAP_WORK" && -d "$_UNSHARE_CAP_WORK" ]]; then
    rm -rf -- "$_UNSHARE_CAP_WORK"
  fi
}
trap _unshare_cap_cleanup EXIT

# _unshare_cap_wait_cgroup_empty — espera, hasta el plazo de asentamiento, a
# que el cgroup no tenga miembros. Sale 0 si quedo vacio, 1 si venció el plazo.
_unshare_cap_wait_cgroup_empty() {
  local polls=0
  while [[ -n "$(_unshare_cap_cgroup_members)" ]]; do
    if [[ "$polls" -ge "$_UNSHARE_CAP_SETTLE_POLLS" ]]; then
      return 1
    fi
    sleep "$_UNSHARE_CAP_POLL_SECONDS"
    polls=$((polls + 1))
  done
  return 0
}

# _unshare_cap_pids_cgroup_parent — donde crear el cgroup hijo: bajo el cgroup
# `pids` del propio proceso en la jerarquia v1, o bajo su cgroup unificado en
# v2. Sale 1 si no hay controlador `pids` que se pueda leer.
_unshare_cap_pids_cgroup_parent() {
  local own_path
  own_path="$(gawk -F: '$2 == "pids" {print $3; exit}' /proc/self/cgroup)"
  if [[ -n "$own_path" ]]; then
    printf '/sys/fs/cgroup/pids%s\n' "${own_path%/}"
    return 0
  fi
  if [[ -r /sys/fs/cgroup/cgroup.controllers ]]; then
    own_path="$(gawk -F: '$1 == "0" {print $3; exit}' /proc/self/cgroup)"
    printf '/sys/fs/cgroup%s\n' "${own_path%/}"
    return 0
  fi
  return 1
}

for required in unshare python3 gawk; do
  if ! command -v "$required" >/dev/null 2>&1; then
    echo "unshare_capabilities: falta '$required'; NO se emite ningun veredicto." >&2
    exit 2
  fi
done

_UNSHARE_CAP_WORK="$(mktemp -d)" || exit 2

if ! parent="$(_unshare_cap_pids_cgroup_parent)"; then
  echo "unshare_capabilities: no hay controlador cgroup 'pids' legible en /proc/self/cgroup; NO se emite ningun veredicto." >&2
  exit 2
fi
_UNSHARE_CAP_CGROUP="$parent/$_UNSHARE_CAP_CGROUP_NAME"
if ! mkdir "$_UNSHARE_CAP_CGROUP" 2>"$_UNSHARE_CAP_WORK/mkdir.err"; then
  echo "unshare_capabilities: no se pudo crear el cgroup $_UNSHARE_CAP_CGROUP: $(head -c 200 "$_UNSHARE_CAP_WORK/mkdir.err"); NO se emite ningun veredicto." >&2
  exit 2
fi

# --- el ayudante ---
#
# Un solo guion, por argv[1]:
#   run                sale 0 de inmediato — mide si el espacio de nombres corre.
#   fork <n>           intenta crear <n> hijos que viven un instante y espera a
#                      todos; imprime cuantos logro CREAR — la cuenta que
#                      pids.max acota. Los hijos no se cosechan entre forks:
#                      uno cosechado deja de contar contra el cgroup.
#   escape <marcador>  deja un hijo que llama a setsid() y duerme llevando el
#                      marcador en su linea de comando; el principal sale.
cat > "$_UNSHARE_CAP_WORK/helper.py" <<'HELPER_PY_EOF'
import os
import sys
import time

CHILD_LIFETIME_SECONDS = 1.0


def fork_children(wanted: int) -> int:
    created = 0
    for _ in range(wanted):
        try:
            pid = os.fork()
        except BlockingIOError:
            continue
        if pid == 0:
            time.sleep(CHILD_LIFETIME_SECONDS)
            os._exit(0)
        created += 1
    for _ in range(created):
        os.wait()
    return created


def leave_escapee(marker: str, seconds: str) -> None:
    if os.fork() == 0:
        os.setsid()
        os.execvp(sys.executable, [sys.executable, "-c", "import time; time.sleep(%s)" % seconds, marker])


mode = sys.argv[1]
if mode == "run":
    sys.exit(0)
if mode == "fork":
    print(fork_children(int(sys.argv[2])), flush=True)
    sys.exit(0)
if mode == "escape":
    leave_escapee(sys.argv[2], sys.argv[3])
    sys.exit(0)
sys.exit(1)
HELPER_PY_EOF

# _unshare_cap_run_item <modo> [args] — lanza el ayudante como init de un
# espacio de nombres nuevo, inscrito en el cgroup de la sonda. La inscripcion
# la hace el propio item antes de `exec`, con la forma de la referencia.
_unshare_cap_run_item() {
  unshare "${_UNSHARE_CAP_NAMESPACE_FLAGS[@]}" \
    sh -c '{ echo 0 > "$0"/cgroup.procs; } 2>/dev/null; exec "$@"' \
    "$_UNSHARE_CAP_CGROUP" python3 "$_UNSHARE_CAP_WORK/helper.py" "$@"
}

# --- capacidad: run ---
_unshare_cap_measure_run() {
  local rc
  _unshare_cap_run_item run >/dev/null 2>"$_UNSHARE_CAP_WORK/run.err"
  rc=$?
  if [[ "$rc" -eq 0 ]]; then
    printf 'run\tefectivo\tunshare %s corrio el ayudante y salio 0\n' "${_UNSHARE_CAP_NAMESPACE_FLAGS[*]}"
  else
    printf 'run\tno-efectivo\tunshare %s salio %s: %s\n' "${_UNSHARE_CAP_NAMESPACE_FLAGS[*]}" "$rc" \
      "$(head -c 200 "$_UNSHARE_CAP_WORK/run.err")"
  fi
}

# --- capacidad: pids_limit ---
#
# La escritura del limite vive en su propia funcion: un control de anulacion
# la sustituye por un no-op y la copia sigue siendo bash valido.
_unshare_cap_apply_pids_limit() {
  echo "$_UNSHARE_CAP_PIDS_LIMIT" > "$_UNSHARE_CAP_CGROUP/pids.max"
}

_unshare_cap_measure_pids_limit() {
  local out rc created
  if ! _unshare_cap_apply_pids_limit 2>"$_UNSHARE_CAP_WORK/limit.err"; then
    printf 'pids_limit\terror\tno se pudo escribir pids.max: %s\n' "$(head -c 200 "$_UNSHARE_CAP_WORK/limit.err")"
    return
  fi
  out="$(_unshare_cap_run_item fork "$_UNSHARE_CAP_FORK_ATTEMPTS" 2>"$_UNSHARE_CAP_WORK/fork.err")"
  rc=$?
  created="$(printf '%s' "$out" | tr -dc '0-9')"
  if [[ -z "$created" ]]; then
    printf 'pids_limit\terror\tsalida sin conteo legible (rc=%s): %s\n' "$rc" \
      "$(head -c 200 "$_UNSHARE_CAP_WORK/fork.err")"
    return
  fi
  if [[ "$created" -le "$_UNSHARE_CAP_PIDS_LIMIT" ]]; then
    printf 'pids_limit\tefectivo\tlogro %s/%s procesos con pids.max=%s\n' \
      "$created" "$_UNSHARE_CAP_FORK_ATTEMPTS" "$(cat "$_UNSHARE_CAP_CGROUP/pids.max")"
  else
    printf 'pids_limit\tno-efectivo\tlogro %s/%s procesos con pids.max=%s\n' \
      "$created" "$_UNSHARE_CAP_FORK_ATTEMPTS" "$(cat "$_UNSHARE_CAP_CGROUP/pids.max")"
  fi
}

# --- capacidad: escape_containment ---
#
# El patron de `pgrep` va con la clase de corchetes en su primer caracter
# —nunca desnudo— para no casar consigo mismo.
_unshare_cap_escapee_pids() {
  pgrep -f "[${_UNSHARE_CAP_ESCAPEE_MARKER:0:1}]${_UNSHARE_CAP_ESCAPEE_MARKER:1}" || true
}

_unshare_cap_measure_escape_containment() {
  local survivors
  _unshare_cap_run_item escape "$_UNSHARE_CAP_ESCAPEE_MARKER" "$_UNSHARE_CAP_ESCAPEE_SECONDS" \
    >/dev/null 2>"$_UNSHARE_CAP_WORK/escape.err"
  # Tras salir el init, el kernel retira a sus miembros de forma asincrona:
  # se le da el plazo de asentamiento antes de juzgar.
  _unshare_cap_wait_cgroup_empty || true
  survivors="$(_unshare_cap_escapee_pids | tr '\n' ' ')"
  if [[ -z "$survivors" ]]; then
    printf 'escape_containment\tefectivo\tel hijo con setsid() no sobrevivio a la salida del principal\n'
  else
    printf 'escape_containment\tno-efectivo\tel hijo con setsid() sobrevive al principal: pid %s\n' "${survivors% }"
  fi
}

# --- capacidad: cleanup ---
_unshare_cap_measure_cleanup() {
  local members
  members="$(_unshare_cap_cgroup_members | tr '\n' ' ')"
  if [[ -n "$members" ]]; then
    printf 'cleanup\tno-efectivo\tcgroup.procs aun lista %s tras salir el principal\n' "${members% }"
    return
  fi
  if rmdir "$_UNSHARE_CAP_CGROUP" 2>"$_UNSHARE_CAP_WORK/rmdir.err"; then
    printf 'cleanup\tefectivo\tcgroup.procs vacio tras salir el principal y rmdir salio 0\n'
  else
    printf 'cleanup\terror\tcgroup.procs vacio pero rmdir fallo: %s\n' "$(head -c 200 "$_UNSHARE_CAP_WORK/rmdir.err")"
  fi
}

_unshare_cap_measure_run
_unshare_cap_measure_pids_limit
_unshare_cap_measure_escape_containment
_unshare_cap_measure_cleanup

exit 0
