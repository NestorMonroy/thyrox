# exec-red

## Qué se lanzó

```
bash -c cd src/packages/podman-execution && timeout 60 bun test __tests__/podmanExecutor.test.ts 2>&1 | grep -E "^\(fail\)|^\(pass\)| pass$| fail$"; echo TEST_EXIT=${PIPESTATUS[0]}
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
