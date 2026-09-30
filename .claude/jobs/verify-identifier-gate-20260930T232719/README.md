# verify-identifier-gate

## Qué se lanzó

```
bash -c for t in tests/verify/test_identifier_language*.py; do printf "%s " $t; PYTHONDONTWRITEBYTECODE=1 python3 $t 2>&1 | tail -1; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
