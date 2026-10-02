# e0-rename-suites

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0773 --kind test --env THYROX_EXECUTION_ENTRY -- bash -c for s in execution-unit local-model-e2e model-policy; do echo "== $s"; bash tests/session/test-headless-pool-$s.sh 2>&1 | tail -4; echo "exit=${PIPESTATUS[0]}"; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
