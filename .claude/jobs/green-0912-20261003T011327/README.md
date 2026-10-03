# green-0912

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0912 --kind test --workdir /home/user/thyrox/.thyrox/runtime/worktrees/declared-image-build --env THYROX_EXECUTION_ENTRY -- bash -c (cd src/packages/image-registry && bun test __tests__/declaredImageBuildCommand.test.ts; echo unit-exit=$?; cd ../podman-execution && bun test __tests__/executionCommand.test.ts; echo primitive-exit=$?) > /home/user/thyrox/.claude/workbench/publish-quantizer-image-20261003T005015/outputs/green-unit.txt 2>&1; bash tests/session/test-declared-image-build-entry.sh > /home/user/thyrox/.claude/workbench/publish-quantizer-image-20261003T005015/outputs/green-policy.txt 2>&1; echo exit=$? >> /home/user/thyrox/.claude/workbench/publish-quantizer-image-20261003T005015/outputs/green-policy.txt
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
