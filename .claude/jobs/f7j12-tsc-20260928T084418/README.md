# f7j12-tsc

## Qué se lanzó

```
bash -c for p in mitm transparent-napi; do (cd src/packages/$p && bunx tsc -p tsconfig.build.json --noEmit; echo "$p BUILD=$?"; bunx tsc -p tsconfig.test.json --noEmit; echo "$p TEST=$?"); done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
