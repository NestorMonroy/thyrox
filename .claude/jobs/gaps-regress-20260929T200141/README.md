# gaps-regress

## Qué se lanzó

```
bash -c for t in tests/session/test-headless-pool-lifecycle.sh tests/session/test-headless-pool-worktree.sh tests/session/test-headless-pool.sh; do bash "$t" 2>&1 | tail -1 | sed "s|^|$t :: |"; done; for t in tests/session/test_pool_lifecycle.py tests/session/test_snapshot_recovery.py tests/verify/test_bench_untracked.py tests/verify/test_pool_pipeline.py; do timeout 600 uv run python "$t" 2>&1 | tail -1 | sed "s|^|$t :: |"; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
