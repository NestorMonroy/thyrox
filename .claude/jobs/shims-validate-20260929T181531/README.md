# shims-validate

## Qué se lanzó

```
bash -c bun test tests/verify/expandStarShims.test.ts 2>&1 | tail -3; timeout 1200 bash bin/typescript-build-javascript agent cli permission provider 2>&1 | tail -4; bash bin/parallel_map "cd src/packages/{} && bun test 2>&1 | tail -3 | sed s/^/{}:\ /" ::: app-host storage command-runtime repl
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
