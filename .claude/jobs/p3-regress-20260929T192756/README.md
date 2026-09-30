# p3-regress

## Qué se lanzó

```
bash -c for t in tests/session/test-headless-pool.sh tests/session/test-headless-pool-worktree.sh tests/session/test-headless-pool-frozen-launcher.sh tests/session/test-headless-pool-item-drain.sh tests/session/test-headless-pool-lifecycle.sh tests/session/test-item-worktree-stash.sh; do echo "=== $t"; timeout 900 bash $t > /tmp/claude-0/-home-user/efec8688-6a45-5d65-b899-cd988aa8816f/scratchpad/$(basename $t).log 2>&1; echo "exit=$?"; grep -E "FAIL|FALLA" /tmp/claude-0/-home-user/efec8688-6a45-5d65-b899-cd988aa8816f/scratchpad/$(basename $t).log | head -12; tail -1 /tmp/claude-0/-home-user/efec8688-6a45-5d65-b899-cd988aa8816f/scratchpad/$(basename $t).log; done; echo "=== lint"; .venv/bin/python src/verify/check_lint_zero.py src/session/pool_lifecycle.py src/session/pool_history.py src/verify/step_report.py src/verify/tsc_cycle.py src/verify/pool_pipeline.py tests/session/test_pool_lifecycle.py tests/verify/test_step_report.py tests/verify/test_tsc_cycle.py tests/verify/test_pool_pipeline.py tests/session/test_pool_history.py src/session/headless-pool.sh src/session/pool_integrate.sh tests/session/test-headless-pool-lifecycle.sh tests/session/test-item-worktree-stash.sh tests/session/test-headless-pool-item-drain.sh
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
