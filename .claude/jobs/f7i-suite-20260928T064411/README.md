# f7i-suite

## Qué se lanzó

```
bash -c cd src/packages/mitm && bun test 2>&1 | tail -4; echo tsc-build=$(bunx tsc -p tsconfig.build.json --noEmit | grep -c 'error TS'); echo tsc-test=$(bunx tsc -p tsconfig.test.json --noEmit | grep -c 'error TS'); true
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
