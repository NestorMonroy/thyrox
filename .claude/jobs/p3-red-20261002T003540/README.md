# p3-red

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0758 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; python3 /scratch/p3/apply-red.py; W=.claude/workbench/execution-policy-20261002/outputs; mkdir -p $W; (cd src/packages/provider && bun test __tests__/recommendExecution.test.ts) > $W/red-ts.txt 2>&1; grep -E "error:|pass$|fail$" $W/red-ts.txt | head -3; python3 tests/agents/test_recommend_cli.py > $W/red-cli.txt 2>&1; grep -E "FAIL" $W/red-cli.txt | head -5
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
