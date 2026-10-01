# boot-all

## Qué se lanzó

```
bash -c cd src/packages/infrastructure && bun test 2>&1 | grep -E "^\(fail\)| pass$| fail$"; echo TEST_EXIT=${PIPESTATUS[0]}; bunx tsc -p tsconfig.test.json --noEmit 2>&1 | tail -6; echo TSC_EXIT=${PIPESTATUS[0]}
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
