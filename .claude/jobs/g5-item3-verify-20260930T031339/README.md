# g5-item3-verify

## Qué se lanzó

```
bash -c cd src/packages/daemon && bun test src/__tests__/workerContainerLifecycle.test.ts 2>&1 | tail -5; cd ../../.. && bash bin/check_package_typecheck --strict daemon 2>&1 | tail -2
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
