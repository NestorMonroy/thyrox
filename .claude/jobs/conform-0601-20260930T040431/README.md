# conform-0601

## Qué se lanzó

```
bash -c set -o pipefail; for t in tests/session/test_pool_lifecycle.py tests/session/test_snapshot_recovery.py tests/session/test_process_ownership.py; do echo "== $t"; uv run python "$t" 2>&1 | tail -3; done; echo "== test-headless-pool-lifecycle.sh"; bash tests/session/test-headless-pool-lifecycle.sh 2>&1 | tail -3
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
