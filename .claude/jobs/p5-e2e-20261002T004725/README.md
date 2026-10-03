# p5-e2e

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0759 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; W=.claude/workbench/unit-to-coordinator-20261002/outputs; mkdir -p tests/session/doubles; cp /scratch/p5/fake-model-coordinator.ts tests/session/doubles/; chmod +x tests/session/doubles/fake-model-coordinator.ts; cp /scratch/p5/test-headless-pool-local-model-e2e.sh tests/session/; bash tests/session/test-headless-pool-local-model-e2e.sh > $W/e2e-first.txt 2>&1; tail -28 $W/e2e-first.txt
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
