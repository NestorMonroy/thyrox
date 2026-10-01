# mitm-f7e2d-check

## Qué se lanzó

```
bash -c cd src/packages/mitm && bun test 2>&1 | grep -E "^\(fail\)|^ *[0-9]+ (pass|fail)$|^Ran"; bunx tsc -p tsconfig.build.json --noEmit 2>&1 | tail -8; echo BUILD_TSC_EXIT=${PIPESTATUS[0]}; bunx tsc -p tsconfig.test.json --noEmit 2>&1 | tail -8; echo TEST_TSC_EXIT=${PIPESTATUS[0]}
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
