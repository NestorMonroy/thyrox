cd /home/user/thyrox
export PYTHONPATH=src
rc=0
for t in tests/session/test_gpu_monitor.py tests/session/test_gpu_scenarios.py tests/session/test_gpu_trace.py tests/session/test_pool_history.py tests/verify/test_step_report.py; do
  echo "== $t"; python3 "$t" 2>&1 | tail -1; [[ ${PIPESTATUS[0]} -eq 0 ]] || rc=1
done
for t in tests/session/test-gpu-admission-cli.sh tests/session/test-gpu-hardware-refusal.sh; do
  echo "== $t"; bash "$t" 2>&1 | tail -1; [[ ${PIPESTATUS[0]} -eq 0 ]] || rc=1
done
echo "== gpuAdmission.test.ts"; (cd src/packages/config && bun test __tests__/gpuAdmission.test.ts 2>&1 | grep -E " pass$| fail$"); [[ ${PIPESTATUS[0]} -eq 0 ]] || rc=1
echo "== generate_bin --check"; python3 src/session/generate_bin.py --check 2>&1 | tail -1
echo "SUBSET_RC=$rc"
