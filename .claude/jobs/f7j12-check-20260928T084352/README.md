# f7j12-check

## Qué se lanzó

```
bash -c (cd src/packages/cli && bun test __tests__/mitmCommands.test.ts __tests__/mitmStateVerbs.test.ts __tests__/mitmPrivilegedVerbs.test.ts 2>&1 | tail -4); (cd src/packages/mitm && bunx tsc -p tsconfig.json --noEmit; echo MITM_TSC=$?); (cd src/packages/transparent-napi && bunx tsc -p tsconfig.json --noEmit; echo NAPI_TSC=$?)
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
