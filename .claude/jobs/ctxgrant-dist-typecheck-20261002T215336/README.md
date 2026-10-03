# ctxgrant-dist-typecheck

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0706 --kind test --env THYROX_EXECUTION_ENTRY -- bash -c cd /home/user/thyrox/src/packages/model-scheduling && bunx tsc -p tsconfig.build.json > /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/grant-context-build-scheduling.log 2>&1; echo build rc=$?; cd ../local-models && bunx tsc --noEmit -p tsconfig.test.json > /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/grant-context-typecheck-main2-local-models.log 2>&1; echo local-models errors=$(grep -c 'error TS' /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/grant-context-typecheck-main2-local-models.log); grep -c 'grantEnvironment\|hostCoordinatorComposition' /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/grant-context-typecheck-main2-local-models.log
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
