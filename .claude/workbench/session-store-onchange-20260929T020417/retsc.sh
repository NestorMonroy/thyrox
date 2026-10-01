#!/usr/bin/env bash
# Reconstruye las declaraciones de agent y repite tsc de app-host y provider.
set -u
cd "$THYROX_ROOT"; out="$1"
(cd src/packages/agent && bunx tsc -p tsconfig.build.json) > "$out/build-agent.log" 2>&1
echo "build agent exit=$? errors=$(grep -c 'error TS' "$out/build-agent.log")" > "$out/summary2.txt"
for p in app-host provider; do
  (cd src/packages/$p && bunx tsc --noEmit -p tsconfig.test.json) > "$out/tsc2-$p.log" 2>&1
  echo "tsc $p exit=$? errors=$(grep -c 'error TS' "$out/tsc2-$p.log")" >> "$out/summary2.txt"
done
