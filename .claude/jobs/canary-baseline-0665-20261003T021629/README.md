# canary-baseline-0665

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0665 --kind test --workdir /home/user/thyrox --env THYROX_EXECUTION_ENTRY -- bash -c timeout 300 bash tests/session/test-pool-calibrate.sh > /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/canary-baseline-test-pool-calibrate.txt 2>&1; echo exit=$? >> /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/canary-baseline-test-pool-calibrate.txt; python3 src/verify/check_identifier_language.py tests/session/test-pool-calibrate.sh > /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/canary-baseline-gate.txt 2>&1; echo exit=$? >> /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/canary-baseline-gate.txt
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
