# verify-lock-collision

## Qué se lanzó

```
bash -c cd src/packages/podman-execution && bun test 2>&1 | tail -3; cd /home/user/thyrox; bash tests/lib/test-infrastructure.sh 2>&1 | tail -1; bash tests/session/test-infrastructure-ensure.sh 2>&1 | tail -1; bash bin/check_lint_zero src/lib/infrastructure.sh src/session/infrastructure_ensure.sh tests/lib/test-infrastructure.sh tests/session/test-infrastructure-ensure.sh 2>&1 | tail -2; bash bin/check_package_typecheck --strict podman-execution 2>&1 | tail -1
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
