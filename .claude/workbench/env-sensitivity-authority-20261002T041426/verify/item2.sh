#!/usr/bin/env bash
# Verificación declarada de TASK-THYROX-0766: las fronteras ya no clasifican por
# regex, consultan la autoridad; la suite del paquete y las de sus consumidores
# en verde; sin errores de tipos nuevos en los archivos del ítem.
set -uo pipefail
root="$(git rev-parse --show-toplevel)"
package="$root/src/packages/podman-execution"
cd "$package" || exit 1
test -f envSensitivity.ts && test -f __tests__/envSensitivity.test.ts || { echo "verify: falta envSensitivity" >&2; exit 1; }
if grep -n "CREDENTIAL_NAME_PATTERN" imageStore.ts workerResourceProfile.ts; then
  echo "verify: una frontera sigue clasificando por regex" >&2; exit 1
fi
grep -q "envSensitivity" imageStore.ts && grep -q "envSensitivity" workerResourceProfile.ts \
  || { echo "verify: una frontera no consulta la autoridad" >&2; exit 1; }
git -C "$root" diff --quiet -- src/verify/env_sensitivity.tsv || { echo "verify: la autoridad se editó" >&2; exit 1; }
passed() { gawk '/^ *[0-9]+ fail$/ { fails = $1 } END { exit !(fails == "0") }' "$1"; }
log="$(mktemp)"; trap 'rm -f "$log"' EXIT
bun test > "$log" 2>&1; passed "$log" || { tail -40 "$log"; exit 1; }
cd "$root"
mapfile -t consumers < <(git grep -l -e "workerResourceProfile" -e "imageStore" -- \
  'src/packages/*/__tests__/*.test.ts' 'src/packages/*/src/__tests__/*.test.ts' | grep -v '^src/packages/podman-execution/')
for test_file in "${consumers[@]}"; do
  package_root="$(printf '%s\n' "$test_file" | gawk -F/ '{ print $1"/"$2"/"$3 }')"
  (cd "$package_root" && bun test "${test_file#"$package_root"/}") > "$log" 2>&1
  passed "$log" || { echo "verify: consumidor rojo: $test_file" >&2; tail -30 "$log"; exit 1; }
done
bash bin/check_package_typecheck --strict podman-execution > "$log" 2>&1
if grep -E "envSensitivity|imageStore|workerResourceProfile" "$log"; then
  echo "verify: errores de tipos en los archivos del ítem" >&2; exit 1
fi
exit 0
