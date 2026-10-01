# finding-pkg

## Qué se lanzó

```
bash -c cd src/packages && bun install 2>&1 | tail -3 && cd finding && bunx tsc -p tsconfig.test.json --noEmit 2>&1 | grep -v node_modules | head -20; echo tsc=$?; bun test 2>&1 | tail -3; cd ../../.. && bash bin/check_package_typecheck finding 2>&1 | tail -3
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
