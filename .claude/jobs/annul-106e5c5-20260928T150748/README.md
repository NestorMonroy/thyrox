# annul-106e5c5

## Qué se lanzó

```
bash -c bash .claude/workbench/accounts-106e5c5-cookie-daemon-20260928T150643/annul-106e5c5.sh; cd src/packages/provider && bunx tsc -p tsconfig.build.json --noEmit | gawk '/error TS/'; echo BUILD_DONE; bunx tsc -p tsconfig.test.json --noEmit | gawk '/error TS/'; echo TEST_DONE; bun test __tests__/accounts __tests__/concurrency 2>&1 | tail -3
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
