# acn-qual-green

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --work ai-course-notes:es-mx/qwen-qualification --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/ai-course-notes && git config --global --add safe.directory /home/user/ai-course-notes >/dev/null 2>&1; bash /home/user/ai-course-notes/.claude/workbench/qwen-qualification-20261002T074824/probes/green.sh; grep -E '^(FAILED|E  )' /home/user/ai-course-notes/.claude/workbench/qwen-qualification-20261002T074824/outputs/green.txt | head -8
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
