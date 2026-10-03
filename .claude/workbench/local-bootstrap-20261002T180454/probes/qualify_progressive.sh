#!/usr/bin/env bash
# LB2/A4: cualifica cada modelo local materializado con la suite de protocolo
# (tool-calling@1) a contextos crecientes, por `local-models-qualify` y el
# coordinador del daemon; se detiene en el primer contexto que falla o que la
# admisión rehúsa. Las cualificaciones van al almacén real (el que lee el
# recomendador); la salida de cada paso queda en <salida>.
#
# El coordinador se arranca con --origin shell: con origin transient el
# watchdog de inactividad no cuenta las residencias del coordinador y lo
# detiene a mitad de una cualificación. La sonda lo detiene al salir.
#
# Uso: QUALIFY_CONTEXTS="16384 32768" qualify_progressive.sh <salida> <modelo>...
set -uo pipefail
out="$1"; shift; mkdir -p "$out"
contexts="${QUALIFY_CONTEXTS:-8192 16384 32768 65536}"
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
sock="$(bash "$root/bin/model-scheduling-socket-path")"
cd "$root" || exit 2
daemon_pid=""
stop_daemon() { [ -n "$daemon_pid" ] && kill -TERM "$daemon_pid" 2>/dev/null && wait "$daemon_pid" 2>/dev/null; }
trap stop_daemon EXIT
if [ ! -S "$sock" ]; then
  setsid bun --feature=DAEMON --feature=UDS_INBOX \
    src/packages/cli/src/entry/cli.tsx daemon bg run --origin shell > "$out/daemon.log" 2>&1 &
  daemon_pid=$!
  for _ in $(seq 90); do [ -S "$sock" ] && break; sleep 1; done
fi
[ -S "$sock" ] || { echo "coordinator socket never appeared"; exit 2; }
for model in "$@"; do
  tag="${model%%:*}"; tag="${tag#thyrox-}"
  for context in $contexts; do
    /usr/bin/time -v -o "$out/$tag-$context.time" \
      bash bin/local-models-qualify "$model" --context "$context" --isolated > "$out/$tag-$context.log" 2>&1
    rc=$?
    printf '%s\t%s\texit=%s\n' "$tag" "$context" "$rc" >> "$out/verdicts.tsv"
    [ "$rc" -eq 0 ] || break
  done
done
echo "QUALIFICATION EXIT=0"
