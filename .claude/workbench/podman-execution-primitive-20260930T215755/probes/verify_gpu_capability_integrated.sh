#!/usr/bin/env bash
# Verificación en el árbol principal de TASK-THYROX-0691 integrado: las suites
# derivadas de los símbolos tocados (gpu_monitor, gpu_backend,
# resource_admission, gpuAdmission), parallel_map_history y los linters. Los
# rojos de parallel_map y parallel_map_history se comparan contra HEAD.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
export PYTHONDONTWRITEBYTECODE=1
suites=(tests/session/test-infrastructure-ensure.sh tests/session/test-parallel-map.sh
  tests/session/test_gpu_scenarios.py tests/session/test_gpu_monitor.py
  tests/session/test_resource_admission.py tests/session/test-gpu-admission-cli.sh
  tests/session/test_container_measure.py tests/session/test_gpu_backend.py
  tests/session/test-headless-pool.sh tests/verify/test_step_report.py
  tests/session/test_parallel_map_history.py)
for suite in "${suites[@]}"; do
  case "$suite" in
    *.py) result=$(python3 "$suite" 2>&1 | tail -1) ;;
    *.sh) result=$(bash "$suite" 2>&1 | tail -1) ;;
  esac
  printf '%s -> %s\n' "$suite" "$result"
done
(cd src/packages/config && bun test __tests__/gpuAdmission.test.ts 2>&1 | grep -E " pass| fail")
bash bin/check_lint_zero src/session/gpu_monitor.py src/session/gpu_backend.py src/session/resource_admission.py src/session/parallel_map_history.py 2>&1 | tail -2
bash bin/check_package_typecheck --strict config 2>&1 | tail -1
