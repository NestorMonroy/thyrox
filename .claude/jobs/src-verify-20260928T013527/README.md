# src-verify

## Qué se lanzó

```
bash -c bash tests/session/test-wait-jobs-archive-dir.sh 2>&1 | tail -n 1; bash tests/session/test-wait-jobs-ledger-home.sh 2>&1 | tail -n 1; bash tests/session/test-wait-jobs.sh 2>&1 | tail -n 1; bash tests/agents/test-register-agent-session.sh 2>&1 | tail -n 1; python3 tests/paths/test_reach.py 2>&1 | tail -n 2
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
