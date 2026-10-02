# policy-red

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0763 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; cat .claude/workbench/policy-source-selector-20261002T070024/probes/tests.ts >> src/packages/provider/__tests__/recommendExecution.test.ts && cd src/packages/provider && bun test __tests__/recommendExecution.test.ts 2>&1 | tee /home/user/thyrox/.claude/workbench/policy-source-selector-20261002T070024/outputs/red.txt | grep -E '^\(fail\)|pass|fail|error' | tail -12
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
