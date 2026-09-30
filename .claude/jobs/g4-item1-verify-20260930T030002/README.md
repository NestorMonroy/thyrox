# g4-item1-verify

## Qué se lanzó

```
bash -c bun src/verify/checkStartupModuleBudget.ts --strict; echo budget_rc=$?; (cd src/packages/app-host && bun test src/startup/__tests__/startupProfilerReport.test.ts 2>&1 | tail -4); bash bin/check_package_typecheck --strict app-host cli 2>&1 | tail -3
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
