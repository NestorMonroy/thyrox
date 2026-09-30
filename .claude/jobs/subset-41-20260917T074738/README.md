# subset-41

## Qué se lanzó

```
bash -c set +e
for p in observability cli tools; do echo "=== bun $p ==="; (cd src/packages/$p && bun test) 2>&1 | tail -6; done
for s in tests/lib/test-toolchain-parallel.sh tests/session/test-wait-jobs.sh; do
  test -e "$s" && { echo "=== $s ==="; bash "$s" 2>&1 | tail -4; }
done
for f in tests/agents/*.py; do echo "=== $f ==="; python3 "$f" 2>&1 | tail -3; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
