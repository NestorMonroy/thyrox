# ctx-tsc

## Qué se lanzó

```
bash -c cd src/packages/provider && for c in tsconfig.json tsconfig.test.json; do echo "== $c"; timeout 300 bunx tsc --noEmit -p $c 2>&1 | grep -E "error" | head -20; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
