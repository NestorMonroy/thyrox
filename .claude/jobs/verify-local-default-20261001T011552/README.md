# verify-local-default

## Qué se lanzó

```
bash -c cd src/packages/provider && bun test __tests__/recommendExecution.test.ts src/proxy/__tests__/openaiCompatLocalProxy.test.ts src/proxy/__tests__/localProxyProcess.test.ts 2>&1 | grep -E " pass| fail"; cd /home/user/thyrox; python3 tests/agents/test_recommend_cli.py 2>&1 | tail -1; bash tests/session/test-headless-pool-runtime.sh 2>&1 | tail -1; bash tests/session/test-headless-pool.sh 2>&1 | grep -E "FALLA|aserciones"; bash bin/check_package_typecheck --strict provider agent 2>&1 | tail -1; bash bin/check_lint_zero src/session/headless-pool.sh tests/session/test-headless-pool-runtime.sh tests/agents/test_recommend_cli.py 2>&1 | tail -2; bash bin/agent-recommend mecanica 2>&1 | head -6
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
