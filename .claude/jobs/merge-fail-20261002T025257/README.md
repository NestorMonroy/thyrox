# merge-fail

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0756 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; cd src/packages/podman-execution && bun test 2>&1 | grep -E "^\(fail\)" | sort -u; bun test 2>&1 | grep -B2 -A12 "^\(fail\)" | grep -E "error:|Expected|Received|at .*test" | head -8
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
