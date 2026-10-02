# bg-stdin-green

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0706 --kind test --env THYROX_EXECUTION_ENTRY -- bash -c cd /home/user/thyrox/.thyrox/runtime/worktrees/bgstdin && timeout 300 bash tests/session/test-bg-stdin-source.sh > /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/bg-stdin-green.log 2>&1; echo green rc=$?; tail -1 /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/bg-stdin-green.log; for t in tests/session/test-bg-name-flag.sh tests/session/test-bg-managed-execution.sh tests/session/test-bg-grace-window.sh tests/session/test-bg-live-log.sh; do timeout 600 bash $t > /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/bg-consumer-$(basename $t .sh).log 2>&1; echo "$t rc=$? $(tail -1 /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/bg-consumer-$(basename $t .sh).log)"; done; bash /home/user/thyrox/bin/check_lint_zero --root /home/user/thyrox/.thyrox/runtime/worktrees/bgstdin src/session/bg.sh tests/session/test-bg-stdin-source.sh 2>&1 | tail -3
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
