#!/usr/bin/env bash
# Verificación de T002 (TASK-THYROX-0769) en el worktree del ítem: la sección del README de un banco
# nuevo, y el verificador de evidencia de búsqueda probado por este guion contra bancos de prueba.
set -uo pipefail
wb="$(cd "$(dirname "$0")/.." && pwd)"; root="$(git -C "$wb" rev-parse --show-toplevel)"; cd "$root" || exit 2
bench="${wb#"$root"/}"; gates="$root/.claude/workbench/managed-podman-execution-boundary-20261001T164746/verify"
bash "$wb/verify/uv_env.sh" "$root" /home/user/thyrox || exit 2
py() { uv run --frozen --no-sync python "$@"; }
fail=0; scratch="$(mktemp -d)"; trap 'rm -rf "${scratch:?}"' EXIT
for suite in tests/verify/test_check_mechanism_search_evidence.py tests/verify/test_runner.py; do
  PYTHONPATH=src PYTHONDONTWRITEBYTECODE=1 py "$suite" > /dev/null 2>&1 || { echo "FALLA $suite"; fail=1; }
done
bash bin/generate_bin --check > /dev/null 2>&1 || { echo "FALLA bin/ no está al día"; fail=1; }
# Banco con una búsqueda registrada de verdad y su fila: pasa. Sin la línea del jsonl, o MISSING sin
# contraprueba adversarial: falla nombrando la fila.
make_bank() { mkdir -p "$scratch/$1/outputs"; printf '# banco\n\n## Búsqueda de mecanismos existentes\n\n| consulta | resultado | autoridades inspeccionadas | decisión | evidencia |\n|---|---|---|---|---|\n| %s | %s | %s | %s | outputs/mechanism-search.jsonl |\n' "$2" "$3" "$4" "$5" > "$scratch/$1/README.md"; }
make_bank ok "process drain" FOUND src/session/process_ownership.py REUSE
bash bin/search_existing_mechanisms --bench "$scratch/ok" "process drain" > /dev/null 2>&1
bash bin/check_mechanism_search_evidence "$scratch/ok" > "$scratch/ok.out" 2>&1 || { echo "FALLA un banco con evidencia real no pasa"; tail -3 "$scratch/ok.out"; fail=1; }
make_bank unrecorded "process drain" FOUND src/session/process_ownership.py REUSE
bash bin/check_mechanism_search_evidence "$scratch/unrecorded" > /dev/null 2>&1; [[ $? -eq 1 ]] || { echo "FALLA una fila sin búsqueda registrada no falla"; fail=1; }
make_bank missing "zzq-no-such-concept-zzq" NONE - MISSING
bash bin/search_existing_mechanisms --bench "$scratch/missing" zzq-no-such-concept-zzq > /dev/null 2>&1
bash bin/check_mechanism_search_evidence "$scratch/missing" > /dev/null 2>&1; [[ $? -eq 1 ]] || { echo "FALLA MISSING sin contraprueba adversarial no falla"; fail=1; }
# Un banco nuevo trae la sección.
fresh="$(bash bin/manifest --base "$scratch" scaffold probe-section 2>/dev/null | tail -1)"
grep -q "Búsqueda de mecanismos existentes" "$fresh/README.md" 2>/dev/null || { echo "FALLA un banco nuevo no trae la sección"; fail=1; }
for log in red green annulment; do [[ -s "$wb/outputs/T002-$log.log" ]] || { echo "FALLA falta outputs/T002-$log.log"; fail=1; }; done
owned=(src/workbench/manifest.py src/verify/check_mechanism_search_evidence.py tests/verify/test_check_mechanism_search_evidence.py
       src/verify/registry.py bin/check_mechanism_search_evidence tests/workbench/test_manifest.py "$bench")
bash "$gates/scope.sh" T002-0769 "${owned[@]}" || fail=1
mapfile -t changed_tests < <(bash "$gates/changed_tests.sh")
if (( ${#changed_tests[@]} == 0 )); then echo "FALLA T002 no añadió ninguna prueba"; fail=1
else bash "$gates/red_against_base.sh" T002-0769 "${changed_tests[@]}" > /dev/null || { echo "FALLA RED/GREEN contra la base"; fail=1; }; fi
exit "$fail"
