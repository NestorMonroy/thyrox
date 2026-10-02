# bg-stdin-annul

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0706 --kind test --env THYROX_EXECUTION_ENTRY -- bash -c cd /home/user/thyrox/.thyrox/runtime/worktrees/bgstdin && timeout 300 bash tests/session/test-bg-stdin-source.sh > /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/bg-stdin-green2.log 2>&1; echo green2 rc=$? $(tail -1 /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/bg-stdin-green2.log); bash /home/user/thyrox/bin/check_lint_zero --root /home/user/thyrox/.thyrox/runtime/worktrees/bgstdin src/session/bg.sh tests/session/test-bg-stdin-source.sh 2>&1 | head -2; C=$(mktemp -d); cp -r src tests $C/; OLD='< "$stdin_source" > "$LOG"' NEW='> "$LOG"' bash /home/user/thyrox/bin/replace_literal $C/src/session/bg.sh; (cd $C && THYROX_ROOT=$C timeout 300 bash tests/session/test-bg-stdin-source.sh) > /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/bg-stdin-annul.log 2>&1; echo annul rc=$? $(grep FAIL /home/user/thyrox/.claude/workbench/thyrox-p-local-required-a6-20261002T203222/outputs/bg-stdin-annul.log | tr '\n' ';'); rm -rf "${C:?}"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
