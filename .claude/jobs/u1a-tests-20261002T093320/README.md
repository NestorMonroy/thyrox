# u1a-tests

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0904 --kind test --attest .claude/workbench/embedding-route-and-local-workers-20261002T093053/outputs/executions.jsonl --env THYROX_EXECUTION_ENTRY -- bash -c cd src/packages/local-models && bun test __tests__/declaredCapabilities.test.ts __tests__/externalArtifact.test.ts && cd .. && bunx tsc --noEmit -p local-models/tsconfig.json
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
