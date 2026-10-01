#!/usr/bin/env bash
# p1 — corre las suites de los cinco paquetes que p1 toca y los typecheck de
# build y test, cada uno con su código de salida. Regenera antes las
# declaraciones (`dist/`, no versionado) de los paquetes que otros importan
# por la condición `types`, para no medir declaraciones viejas.
# Uso: bash probes/p1_suites.sh <etiqueta> <dir de salida>
set -uo pipefail
label="$1" out="$2"
cd "$(git rev-parse --show-toplevel)"
tsc=node_modules/typescript/lib/tsc.js
for package in podman-execution model-scheduling; do
  (cd "src/packages/$package" && bun "../../../$tsc" -p tsconfig.build.json >/dev/null 2>&1)
done
echo "# $label HEAD $(git rev-parse --short HEAD) dirty=$(git status --short -- src | wc -l)"
for package in podman-execution model-scheduling local-models daemon provider; do
  log="$out/$label-$package.bun.log"
  (cd "src/packages/$package" && bun test > "../../../$log" 2>&1); code=$?
  counts="$(grep -E '^ *[0-9]+ (pass|fail)$' "$log" | tr -s ' \n' ' ')"
  fails="$(grep -E '^\(fail\)' "$log" | sort -u | wc -l)"
  echo "suite $package exit=$code $counts distinct_fail_lines=$fails"
  for config in tsconfig.build.json tsconfig.test.json; do
    [[ -f "src/packages/$package/$config" ]] || continue
    (cd "src/packages/$package" && bun "../../../$tsc" --noEmit -p "$config" > "../../../$out/$label-$package-$config.tsc.log" 2>&1)
    echo "tsc $package $config errors=$(grep -c 'error TS' "$out/$label-$package-$config.tsc.log")"
  done
done
