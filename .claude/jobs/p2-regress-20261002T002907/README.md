# p2-regress

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0757 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; W=.claude/workbench/pool-execution-unit-20261002/outputs; ls tests/session/test-headless-pool*.sh tests/session/test-gnu-time-launchers.sh tests/session/test-item-worktree-stash.sh | grep -v execution-unit | parallel -j4 -k --tag "bash {} > $W/regress-\$(basename {} .sh).txt 2>&1; echo exit=\$?"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
