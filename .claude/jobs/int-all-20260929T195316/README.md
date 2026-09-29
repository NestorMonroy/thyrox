# int-all

## Qué se lanzó

```
bash -c for t in tests/session/test-headless-pool.sh tests/session/test-headless-pool-worktree.sh tests/session/test-headless-pool-frozen-launcher.sh tests/session/test-headless-pool-item-drain.sh tests/session/test-headless-pool-lifecycle.sh tests/session/test-headless-pool-thyrox-p.sh tests/session/test-item-worktree-stash.sh; do bash "$t" 2>&1 | tail -1 | sed "s|^|$t :: |"; done; for t in tests/session/test_pool_lifecycle.py tests/session/test_snapshot_recovery.py tests/session/test_pool_history.py tests/session/test_writer_inspector.py tests/session/test_process_ownership.py tests/verify/test_step_report.py tests/verify/test_tsc_cycle.py tests/verify/test_pool_pipeline.py tests/verify/test_check_staged_live_writers.py; do timeout 900 uv run python "$t" 2>&1 | tail -1 | sed "s|^|$t :: |"; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
