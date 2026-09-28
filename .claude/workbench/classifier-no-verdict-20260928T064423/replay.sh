#!/usr/bin/env bash
# Reproduce el detector sobre el transcript REAL, cortado justo antes de cada
# llamada a Bash de la ventana de caída: la racha que habría visto en vivo.
set -u
T=${1:?transcript}; cd /home/user/thyrox
for cut in 2026-09-28T06:38:24 2026-09-28T06:38:54 2026-09-28T06:40:51 2026-09-28T06:42:08; do
  tail -c 60000000 "$T" | tail -n +2 | jq -Rc --arg c "$cut" 'fromjson? | select((.timestamp // "") < $c)' > .claude/cache/replay-cut.jsonl
  printf '%s  ' "$cut"
  PYTHONPATH=src python3 -c '
import json, sys
from hooks import detect_classifier_outage as g
n = g.detect({"tool_name": "Bash", "tool_input": {}, "transcript_path": sys.argv[1]})
print((n or "(silencio)").splitlines()[0])' .claude/cache/replay-cut.jsonl
done
rm -f .claude/cache/replay-cut.jsonl
