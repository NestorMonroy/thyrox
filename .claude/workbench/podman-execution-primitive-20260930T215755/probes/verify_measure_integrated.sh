#!/usr/bin/env bash
# Segunda etapa de verificacion del item measure: sus suites y las de sus
# consumidores derivados, ya en el arbol principal tras pool_integrate.
set -u
cd "$(git rev-parse --show-toplevel)"
fail=0
for t in $(grep -rlE "container_measure|pool_history|resource_admission|gpu_monitor" --include=*.py --include=*.sh tests/ | grep -v '/hardware/' | sort); do
  case "$t" in *.py) cmd=(python3 "$t");; *.sh) cmd=(bash "$t");; esac
  out=$(PYTHONDONTWRITEBYTECODE=1 "${cmd[@]}" 2>&1); rc=$?
  echo "== $t exit=$rc | $(printf '%s\n' "$out" | tail -1)"
  [ "$rc" -eq 0 ] || fail=1
done
bash tests/session/test-gpu-hardware-refusal.sh >/dev/null 2>&1; echo "== test-gpu-hardware-refusal exit=$?"
exit "$fail"
