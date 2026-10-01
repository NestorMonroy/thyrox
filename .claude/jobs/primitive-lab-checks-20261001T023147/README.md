# primitive-lab-checks

## Qué se lanzó

```
bash -c cd src/packages/local-models && bun test 2>&1 | tail -3; cd ../podman-execution && bun test 2>&1 | tail -3; cd ../../.. && bash bin/check_package_typecheck local-models podman-execution daemon 2>&1 | tail -5
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
