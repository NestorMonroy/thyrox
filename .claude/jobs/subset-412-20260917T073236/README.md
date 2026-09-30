# subset-412

## Qué se lanzó

```
bash -c set +e; for s in tests/verify/test-suite-discrimina.sh tests/verify/test-mutante-en-staging.sh; do echo "=== $s ==="; bash "$s"; echo "--- exit=$? ---"; done; for s in tests/hallazgo/test_finding_id_collision.py tests/verify/test_finding_id_unique.py; do echo "=== $s ==="; python3 "$s"; echo "--- exit=$? ---"; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
