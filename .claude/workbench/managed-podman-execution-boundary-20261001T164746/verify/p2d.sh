#!/usr/bin/env bash
# p2d: la entrada canónica deja "entry":"thyrox-bg" y una unidad por clase usada por p3-p5.
set -uo pipefail
wb="$(cd "$(dirname "$0")/.." && pwd)"; cd /home/user/thyrox; fail=0
lines="$(jq -c 'select(.item == "p2d" and .entry == "thyrox-bg")' "$wb/manifest.jsonl")"
classes="$(jq -r '.step' <<<"$lines" | sort -u | grep -cE '^(maintenance|test|probe)$')"
containers="$(jq -r '.containerId' <<<"$lines" | sort -u | grep -c .)"
echo "p2d: clases=$classes contenedores=$containers"
(( classes == 3 && containers >= 3 )) || { echo "FALLA unidades por clase"; fail=1; }
bash tests/session/test-bg-managed-execution.sh >/dev/null 2>&1 || { echo "FALLA test-bg-managed-execution"; fail=1; }
python3 "$wb/tests/test_manifest_identity.py" >/dev/null 2>&1 || { echo "FALLA test_manifest_identity"; fail=1; }
for log in red green annulment; do [[ -s "$wb/outputs/p2d-$log.log" ]] || { echo "FALLA falta p2d-$log"; fail=1; }; done
# Gates del verificador, no del trabajador (ejecutor 2026-10-02): alcance y RED contra la base.
bash "$wb/verify/scope.sh" p2d src/lib/managed_execution.sh src/session/bg.sh tests/session/test-bg-managed-execution.sh .env.example || fail=1
mapfile -t changed_tests < <(bash "$wb/verify/changed_tests.sh")
if (( ${#changed_tests[@]} == 0 )); then echo "FALLA p2d no añadió ni cambió ninguna prueba"; fail=1
else bash "$wb/verify/red_against_base.sh" p2d "${changed_tests[@]}" > /dev/null || { echo "FALLA RED/GREEN contra la base (outputs/p2d-red-verified.log)"; fail=1; }; fi
exit "$fail"
