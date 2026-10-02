#!/usr/bin/env bash
# LB2: cualifica cada modelo local materializado con la suite de protocolo
# (tool-calling@1) a contextos crecientes, por `local-models-qualify` y el
# coordinador del daemon; se detiene en el primer contexto que falla o que la
# admisión rehúsa. Las cualificaciones van al almacén real (el que lee el
# recomendador); la salida de cada paso queda en el banco.
# Uso: qualify_progressive.sh <salida> <modelo>...
set -uo pipefail
out="$1"; shift; mkdir -p "$out"
root=/home/user/thyrox; sock="$(bash "$root/bin/model-scheduling-socket-path")"
cd "$root" || exit 2
if [ ! -S "$sock" ]; then
  THYROX_CODE_DAEMON_TRANSIENT=1 setsid bun --feature=DAEMON --feature=UDS_INBOX \
    src/packages/cli/src/entry/cli.tsx daemon bg run > "$out/daemon.log" 2>&1 &
  for _ in $(seq 90); do [ -S "$sock" ] && break; sleep 1; done
fi
[ -S "$sock" ] || { echo "coordinator socket never appeared"; exit 2; }
for model in "$@"; do
  tag="${model%%:*}"; tag="${tag#thyrox-}"
  for context in 8192 16384 32768 65536; do
    /usr/bin/time -v -o "$out/$tag-$context.time" \
      bash bin/local-models-qualify "$model" --context "$context" --isolated > "$out/$tag-$context.log" 2>&1
    rc=$?
    printf '%s\t%s\texit=%s\n' "$tag" "$context" "$rc" >> "$out/verdicts.tsv"
    [ "$rc" -eq 0 ] || break
  done
done
echo "QUALIFICATION EXIT=0"
