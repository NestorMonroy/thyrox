# tsc-106d6b

## Qué se lanzó

```
bash -c bunx tsc -p tsconfig.build.json --noEmit 2>&1 | gawk '/error TS/' | cut -c1-220; echo BUILD_DONE; bunx tsc -p tsconfig.test.json --noEmit 2>&1 | gawk '/error TS/' | cut -c1-220; bun test __tests__/accounts 2>&1 | tail -2
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
