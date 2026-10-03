# recommend-probe

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0773 --kind probe --env THYROX_EXECUTION_ENTRY -- bash -c cd /home/user/thyrox/.thyrox/runtime/worktrees/e0b; export THYROX_EXECUTION_POLICY=/home/user/thyrox/.thyrox/runtime/worktrees/e0b/tests/fixtures/execution_policy_unrestricted.json; echo '== worktree'; bash bin/agent-recommend analisis; echo rc=$?; echo '== main'; cd /home/user/thyrox; bash bin/agent-recommend analisis; echo rc=$?
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
