# tsc-106d6c3

## Qué se lanzó

```
bash -c cd src/packages/provider && bunx tsc -p tsconfig.build.json --noEmit | gawk "/error TS/"; echo BUILD_DONE; bunx tsc -p tsconfig.test.json --noEmit | gawk "/error TS/"; echo TEST_DONE; bun test __tests__/accounts 2>&1 | tail -2
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
