# p3-consumers

## Qué se lanzó

```
bash -c for t in tests/verify/test_step_report.py tests/verify/test_step_close.py tests/verify/test_pool_pipeline.py tests/verify/test_tsc_cycle.py; do echo "=== $t"; PYTHONPATH=src timeout 600 python3 $t 2>&1 | grep -E "FALL|FAIL|Error|resultado|ok, |passed|failed" | tail -15; echo "exit=$?"; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
