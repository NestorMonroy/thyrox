# verify-ollama-service

## Qué se lanzó

```
bash -c bash tests/lib/test-infrastructure.sh 2>&1 | tail -3; bash tests/session/test-infrastructure-ensure.sh 2>&1 | tail -3; bash bin/check_lint_zero src/lib/infrastructure.sh tests/lib/test-infrastructure.sh tests/session/test-infrastructure-ensure.sh 2>&1 | tail -3
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
