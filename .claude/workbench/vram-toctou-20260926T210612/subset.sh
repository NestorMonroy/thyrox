cd /home/user/thyrox
export PYTHONPATH=src
rc=0
for t in tests/session/test_gpu_monitor.py tests/session/test_pool_history.py tests/verify/test_step_report.py tests/verify/test_tsc_cycle.py tests/hooks/test_detect_agent_dispatch.py; do
  echo "== $t"; python3 "$t" 2>&1 | tail -2; [[ ${PIPESTATUS[0]} -eq 0 ]] || rc=1
done
for t in tests/session/test-gpu-admission-cli.sh tests/session/test-headless-pool.sh tests/session/test-gnu-time-launchers.sh; do
  echo "== $t"; bash "$t" 2>&1 | tail -2; [[ ${PIPESTATUS[0]} -eq 0 ]] || rc=1
done
echo "SUBSET_RC=$rc"
