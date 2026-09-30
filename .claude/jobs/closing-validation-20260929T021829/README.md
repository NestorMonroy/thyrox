# closing-validation

## Qué se lanzó

```
bash -c bash bin/check_package_typecheck --strict agent provider config app-host && git ls-files "src/packages/agent/**.test.ts" "src/packages/provider/**.test.ts" "src/packages/config/**.test.ts" "src/packages/app-host/**.test.ts" "src/packages/app-host/**.test.tsx" | bash bin/run_ts_isolated
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
