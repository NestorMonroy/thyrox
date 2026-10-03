#!/usr/bin/env bash
# Cualifica modelos locales con una suite de tarea a través del coordinador del
# anfitrión. Uso: run_qualification.sh <salida> <suite.json|-> <modelo>...
# Las cualificaciones van al archivo de la salida (THYROX_MODEL_QUALIFICATIONS).
set -uo pipefail
out="$1"; suite="$2"; shift 2; mkdir -p "$out"
root=/home/user/thyrox; sock=/root/.claude/model-scheduling/coordinator.sock
export THYROX_MODEL_QUALIFICATIONS="$out/qualifications.json"
cd "$root"
if [ ! -S "$sock" ]; then
  THYROX_CODE_DAEMON_TRANSIENT=1 setsid bun --feature=DAEMON --feature=UDS_INBOX \
    src/packages/cli/src/entry/cli.tsx daemon bg run > "$out/daemon.log" 2>&1 &
  for _ in $(seq 60); do [ -S "$sock" ] && break; sleep 1; done
fi
[ -S "$sock" ] || { echo "coordinator socket never appeared"; exit 2; }
for model in "$@"; do
  tag="${model%%:*}"; tag="${tag#thyrox-}"
  # Una suite "-" pide la cualificación de protocolo (tool-calling), sin suite de tarea.
  suite_args=(); [ "$suite" = "-" ] || suite_args=(--suite "$suite")
  /usr/bin/time -v -o "$out/$tag.time" bash bin/local-models-qualify "$model" "${suite_args[@]}" > "$out/$tag.log" 2>&1
  echo "$tag exit=$?" >> "$out/verdicts.txt"
done
echo "QUALIFICATION EXIT=0"
