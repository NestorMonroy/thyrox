# p3-consumers2

## Qué se lanzó

```
bash -c for t in tests/verify/test_pool_pipeline.py tests/verify/test_tsc_cycle.py; do echo "=== $t"; PYTHONPATH=src timeout 600 python3 $t 2>&1 | grep -E "FALL|Error|aserciones|falla" | tail -15; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
