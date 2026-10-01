# exec-green

## Qué se lanzó

```
bash -c cd src/packages/podman-execution && timeout 60 bun test __tests__/podmanExecutor.test.ts 2>&1 | grep -E "^\(fail\)| pass$| fail$"; echo TEST_EXIT=${PIPESTATUS[0]}; bunx tsc -p tsconfig.test.json --noEmit 2>&1 | tail -5; echo TSC_EXIT=${PIPESTATUS[0]}
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
