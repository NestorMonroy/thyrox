cd /home/user/thyrox; export PYTHONPATH=src; rc=0
for t in tests/session/test_gpu_scenarios.py tests/session/test_gpu_trace.py tests/verify/test_step_report.py; do
  echo "== $t"; python3 "$t" 2>&1 | tail -1; [[ ${PIPESTATUS[0]} -eq 0 ]] || rc=1; done
for t in tests/session/test-gpu-admission-cli.sh tests/session/test-gnu-time-launchers.sh tests/session/test-hardware-inventory.sh tests/lib/test-toolchain-gnu-time.sh; do
  echo "== $t"; bash "$t" 2>&1 | tail -1; [[ ${PIPESTATUS[0]} -eq 0 ]] || rc=1; done
echo "== gpuAdmission.test.ts"; (cd src/packages/config && bun test __tests__/gpuAdmission.test.ts 2>&1 | grep -E " pass$| fail$")
echo "== generate_bin"; python3 src/session/generate_bin.py --check 2>&1 | tail -1; python3 tests/session/test_generate_bin.py 2>&1 | tail -1
echo "SUBSET_RC=$rc"
