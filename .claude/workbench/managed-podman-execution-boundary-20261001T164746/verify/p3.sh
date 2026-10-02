#!/usr/bin/env bash
# p3, fase del controlador: la implementación dentro de su alcance, con RED contra la base, y las
# suites del pool, del lifecycle y de la primitiva en verde, cada una con su código de salida.
# La fase de plano de control (unidades reales con dueño pool) la prueba
# probes/p3_control_plane.sh desde el anfitrión: sin ella P3 no está aceptado (bootstrap.md).
set -uo pipefail
wb="$(cd "$(dirname "$0")/.." && pwd)"; cd /home/user/thyrox; fail=0
owned=$(jq -r 'select(.id=="p3")|.owned|join(" ")' "$wb/plan.jsonl")
for suite in tests/session/test-headless-pool*.sh; do
  bash "$suite" > /dev/null 2>&1 || { echo "FALLA $suite"; fail=1; }
done
for suite in tests/session/test_pool_lifecycle.py tests/session/test_snapshot_recovery.py \
             tests/session/test_process_ownership.py tests/session/test_writer_inspector.py; do
  PYTHONDONTWRITEBYTECODE=1 uv run --frozen --no-sync python "$suite" > /dev/null 2>&1 || { echo "FALLA $suite"; fail=1; }
done
failed="$(cd src/packages/podman-execution && bun test 2>&1 | gawk '/^ *[0-9]+ fail$/ { print $1 }' | tail -1)"
[[ "$failed" == 0 ]] || { echo "FALLA suite podman-execution: ${failed:-?}"; fail=1; }
for gate in check_podman_materialization check_podman_access_ownership check_execution_authorization; do
  uv run --frozen --no-sync python "src/verify/$gate.py" --root /home/user/thyrox --strict > /dev/null 2>&1 || { echo "FALLA $gate"; fail=1; }
done
# Sin política nueva en el orquestador: headless-pool.sh no gana menciones de Podman, nvidia-smi ni
# cgroups respecto de la base. Las de nvidia-smi que ya tiene son deuda de TASK-THYROX-0691 (ítem B),
# no de P3, así que se mide el crecimiento y no el valor absoluto.
policy='\bpodman\b|nvidia-smi|/sys/fs/cgroup'
code_lines() { gawk '!/^[[:space:]]*#/' | grep -cE "$policy"; }
before="$(git show HEAD:src/session/headless-pool.sh | code_lines)"
after="$(code_lines < src/session/headless-pool.sh)"
(( after <= before )) || { echo "FALLA headless-pool.sh gana política de Podman, GPU o cgroups: $before -> $after"; fail=1; }
for log in red green annulment; do [[ -s "$wb/outputs/p3-$log.log" ]] || { echo "FALLA falta p3-$log"; fail=1; }; done
bash "$wb/verify/scope.sh" p3 $owned || fail=1
mapfile -t changed_tests < <(bash "$wb/verify/changed_tests.sh")
if (( ${#changed_tests[@]} == 0 )); then echo "FALLA p3 no añadió ni cambió ninguna prueba"; fail=1
else bash "$wb/verify/red_against_base.sh" p3 "${changed_tests[@]}" > /dev/null || { echo "FALLA RED/GREEN contra la base (outputs/p3-red-verified.log)"; fail=1; }; fi
exit "$fail"
