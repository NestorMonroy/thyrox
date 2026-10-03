# fresh-clone-suites

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0758 --kind test --workdir /home/user/thyrox --env THYROX_EXECUTION_ENTRY -- bash -c r=0; uv run --frozen --no-sync python tests/verify/test_commit_identity.py > .claude/logs/fresh-clone-commit-identity.log 2>&1 || r=1; bash tests/verify/test-toolchain-ready.sh > .claude/logs/fresh-clone-toolchain.log 2>&1 || r=$((r+2)); echo suites_exit=$r
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
