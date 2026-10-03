# ctxgrant-main-typecheck

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0706 --kind test --env THYROX_EXECUTION_ENTRY -- bash -c for p in model-scheduling local-models; do (cd /home/user/thyrox/src/packages/$p && bunx tsc --noEmit -p tsconfig.test.json) > /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/grant-context-typecheck-main-$p.log 2>&1; echo "$p errors=$(grep -c 'error TS' /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/grant-context-typecheck-main-$p.log)"; done; cd /home/user/thyrox/src/packages/model-scheduling && bun test > /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/grant-context-main-scheduling-all.log 2>&1; echo scheduling-all rc=$? $(grep -E '^ *[0-9]+ (pass|fail)$' /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/grant-context-main-scheduling-all.log | tr '\n' ' ')
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
