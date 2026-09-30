# verify-model-artifacts

## Qué se lanzó

```
bash -c bun install --frozen-lockfile >/dev/null 2>&1; echo install=$?; cd src/packages/model-artifacts && bun test 2>&1 | grep -E "^ *[0-9]+ (pass|fail|skip)|\(fail\)|\(skip\)"; cd ../../.. && bash bin/check_package_typecheck --strict model-artifacts 2>&1 | tail -2
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
