#!/usr/bin/env bash
# Suites y tsc de los cuatro paquetes que toca la integración de pending-six.
set -u
cd "$THYROX_ROOT"
out="$1"
find src/packages/agent src/packages/provider src/packages/config src/packages/app-host \
  -path '*/node_modules' -prune -o -name '*.test.ts' -print \
  | bash bin/run_ts_isolated > "$out/suites.log" 2>&1
echo "suites exit=$?" > "$out/summary.txt"
tail -1 "$out/suites.log" >> "$out/summary.txt"
bash bin/parallel_map --width 2 'cd src/packages/{} && bunx tsc --noEmit -p tsconfig.test.json > ../../../'"$out"'/tsc-{}.log 2>&1; echo "tsc {} exit=$? errors=$(grep -c "error TS" ../../../'"$out"'/tsc-{}.log)"' ::: agent provider config app-host >> "$out/summary.txt" 2>&1
