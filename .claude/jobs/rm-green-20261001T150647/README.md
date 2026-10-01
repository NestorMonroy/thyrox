# rm-green

## Qué se lanzó

```
bash -c cd src/packages/podman-execution && bun test 2>&1 | tail -40; echo TEST_EXIT=${PIPESTATUS[0]}; bunx tsc -p tsconfig.test.json --noEmit 2>&1 | tail -20; echo TSC_EXIT=${PIPESTATUS[0]}
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
