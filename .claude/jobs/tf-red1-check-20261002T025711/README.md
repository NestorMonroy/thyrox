# tf-red1-check

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0761 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; cd src/packages/model-scheduling && bun test __tests__/podmanModelUnitMaterializer.test.ts 2>&1 | grep -E "0761|pass$|fail$|error" | head -10
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
