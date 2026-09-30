# toolchain-suites

## Qué se lanzó

```
bash -c for t in tests/lib/test-toolchain-*.sh; do r=$(timeout 300 bash "$t" 2>&1 | tail -1); echo "$t :: $r"; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
