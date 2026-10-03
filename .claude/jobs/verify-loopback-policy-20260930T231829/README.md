# verify-loopback-policy

## Qué se lanzó

```
bash -c cd src/packages/provider && bun test __tests__/localProxyProcess.test.ts __tests__/proxyNetGuards.test.ts __tests__/proxyStartServer.test.ts __tests__/storeCredentialProxyProcess.test.ts src/proxy/__tests__/claudeCliUpstream.test.ts src/proxy/__tests__/connectionRefresh.test.ts src/proxy/__tests__/openaiCompatDeclaration.test.ts src/proxy/__tests__/openaiCompatLocalProxy.test.ts src/proxy/__tests__/openaiCompatUpstream.test.ts src/proxy/__tests__/startServerSharedState.test.ts  2>&1 | grep -E '^ *[0-9]+ (pass|fail)|\(fail\)|error:' ; cd ../../.. && bash bin/check_package_typecheck --strict provider 2>&1 | tail -4
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
