#!/usr/bin/env bash
# Verificación de T001 (TASK-THYROX-0769), corrida por el controlador en el worktree del ítem.
# Mide por sí misma lo que el trabajador no puede declarar: las pruebas negativas del verificador de
# deriva sobre copias del registro, el contrato de la consulta, el alcance y el RED contra la base.
set -uo pipefail
wb="$(cd "$(dirname "$0")/.." && pwd)"; root="$(git -C "$wb" rev-parse --show-toplevel)"; cd "$root" || exit 2
bench="${wb#"$root"/}"; gates="$root/.claude/workbench/managed-podman-execution-boundary-20261001T164746/verify"
bash "$wb/verify/uv_env.sh" "$root" /home/user/thyrox || exit 2
py() { uv run --frozen --no-sync python "$@"; }
fail=0; registry=src/verify/mechanisms.tsv; scratch="$(mktemp -d)"; trap 'rm -rf "${scratch:?}"' EXIT
for suite in tests/verify/test_search_existing_mechanisms.py tests/verify/test_check_mechanism_registry.py tests/verify/test_runner.py; do
  PYTHONPATH=src PYTHONDONTWRITEBYTECODE=1 py "$suite" > /dev/null 2>&1 || { echo "FALLA $suite"; fail=1; }
done
bash bin/check_mechanism_registry --strict > "$scratch/check.out" 2>&1 || { echo "FALLA el registro real no pasa su verificador"; tail -5 "$scratch/check.out"; fail=1; }
bash bin/generate_bin --check > /dev/null 2>&1 || { echo "FALLA bin/ no está al día"; fail=1; }
for id in execution-authorization managed-execution podman-executor worker-resource-profile headless-pool-runner \
          item-worktree pool-lifecycle pool-integrate process-ownership writer-inspector resource-admission \
          assert-no-writes agent-recommend tsc-thompson-sampling; do
  gawk -F'\t' -v id="$id" '!/^#/ && $1 == id { found = 1 } END { exit !found }' "$registry" || { echo "FALLA falta la fila $id"; fail=1; }
done
# Deriva: cada copia rompe UNA cosa de la primera fila y el verificador tiene que fallar nombrándola.
first="$(gawk -F'\t' '!/^#/ && NF >= 8 { print NR; exit }' "$registry")"
broken() { gawk -F'\t' -v OFS='\t' -v n="$first" -v col="$1" -v value="$2" 'NR == n { $col = value } { print }' "$registry" > "$scratch/$3.tsv"
           bash bin/check_mechanism_registry --registry "$scratch/$3.tsv" --strict > "$scratch/$3.out" 2>&1
           [[ $? -eq 1 ]] || { echo "FALLA el verificador no detecta $3"; fail=1; }; }
broken 3 src/no/such/authority.py authority
broken 4 no_such_symbol_zzq symbol
broken 5 no-such-entry-zzq entry
broken 6 tests/no/such/test.py tests
# La consulta: FOUND exacto, NONE sin coincidencias, nunca la decisión, y nunca NONE con el registro roto.
bash bin/search_existing_mechanisms "process drain" > "$scratch/q1" 2>&1
head -1 "$scratch/q1" | grep -q '^FOUND process-ownership' || { echo "FALLA «process drain» no da FOUND process-ownership"; head -3 "$scratch/q1"; fail=1; }
bash bin/search_existing_mechanisms zzq-no-such-concept-zzq > "$scratch/q2" 2>&1; code=$?
[[ $code -eq 1 ]] && grep -qx NONE "$scratch/q2" || { echo "FALLA una consulta sin coincidencias no da NONE con exit 1 (exit $code)"; fail=1; }
cat "$scratch/q1" "$scratch/q2" | grep -qE '\b(REUSE|EXTEND|MISSING)\b' && { echo "FALLA la consulta emite una decisión"; fail=1; }
bash bin/search_existing_mechanisms --registry "$scratch/absent.tsv" process > "$scratch/q3" 2>&1; code=$?
[[ $code -eq 2 ]] && ! grep -qx NONE "$scratch/q3" || { echo "FALLA un registro ilegible no sale 2 sin NONE (exit $code)"; fail=1; }
mkdir -p "$scratch/bank/outputs"; bash bin/search_existing_mechanisms --bench "$scratch/bank" "process drain" > /dev/null 2>&1
jq -e 'select(.query and .result == "FOUND" and (.ids | length > 0) and .registrySha256)' "$scratch/bank/outputs/mechanism-search.jsonl" > /dev/null 2>&1 \
  || { echo "FALLA --bench no deja la evidencia de la búsqueda"; fail=1; }
for log in red green annulment; do [[ -s "$wb/outputs/T001-$log.log" ]] || { echo "FALLA falta outputs/T001-$log.log"; fail=1; }; done
owned=(src/verify/mechanisms.tsv src/verify/search_existing_mechanisms.py src/verify/check_mechanism_registry.py src/verify/registry.py
       tests/verify/test_search_existing_mechanisms.py tests/verify/test_check_mechanism_registry.py
       bin/search_existing_mechanisms bin/check_mechanism_registry "$bench")
bash "$gates/scope.sh" T001-0769 "${owned[@]}" || fail=1
mapfile -t changed_tests < <(bash "$gates/changed_tests.sh")
if (( ${#changed_tests[@]} == 0 )); then echo "FALLA T001 no añadió ninguna prueba"; fail=1
else bash "$gates/red_against_base.sh" T001-0769 "${changed_tests[@]}" > /dev/null || { echo "FALLA RED/GREEN contra la base"; fail=1; }; fi
exit "$fail"
