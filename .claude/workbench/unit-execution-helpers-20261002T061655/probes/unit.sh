#!/usr/bin/env bash
# unit.sh <TASK> <nombre> <líneas de cola> <comando bash>: corre en una ExecutionUnit y muestra la cola.
set -u
task="$1" name="$2" lines="$3" cmd="$4"
cd /home/user/thyrox
out=$(bash bin/thyrox-bg start "$name" --grace 0 --task "$task" --kind test --network host \
  --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw \
  --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro \
  -- bash -c "cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; $cmd" 2>&1)
run=$(printf '%s\n' "$out" | gawk -F= '/^RUN=/{print $2}')
[[ -n "$run" ]] || { printf '%s\n' "$out"; exit 2; }
timeout 600 bash bin/thyrox-bg wait "$name" 590 >/dev/null 2>&1
echo "[$name] $(bash bin/thyrox-bg status "$name")"
tail -n "$lines" "$run/outputs/salida.log"
