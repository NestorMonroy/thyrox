# worktree-probe

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0769 --kind probe --env THYROX_EXECUTION_ENTRY -- bash -c set -x; t=/home/user/thyrox/.thyrox/runtime/continuation/worktrees/probe/wt-$$; mkdir -p "$(dirname "$t")"; git -C /home/user/thyrox worktree add -q --detach "$t" HEAD 2>&1; echo "git exit=$?"; id -u; git -C /home/user/thyrox rev-parse HEAD 2>&1 | head -2; ls -ld /home/user/thyrox/.git /home/user/thyrox/.git/worktrees 2>&1
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
