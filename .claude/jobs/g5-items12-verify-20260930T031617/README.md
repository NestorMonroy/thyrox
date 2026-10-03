# g5-items12-verify

## Qué se lanzó

```
bash -c cd src/packages/daemon && bun test src/__tests__/daemonCli.test.ts 2>&1 | tail -4; bun test 2>&1 | tail -4; cd ../config && bun test __tests__/policyRescue.test.ts __tests__/policySources.test.ts 2>&1 | tail -4; cd ../../.. && bash bin/check_package_typecheck --strict daemon config 2>&1 | tail -3
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
