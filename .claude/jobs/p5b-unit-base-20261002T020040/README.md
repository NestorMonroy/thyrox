# p5b-unit-base

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --work ai-course-notes:es-mx/execution-image --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/ai-course-notes && git config --global --add safe.directory /home/user/ai-course-notes >/dev/null 2>&1; W=.claude/workbench/execution-image-equivalence-20261002/outputs; uv run --locked pytest -q -rf tests/test_translation_loop.py > $W/annul-base-image.txt 2>&1; echo EXIT=$? >> $W/annul-base-image.txt; grep -E "passed|failed" $W/annul-base-image.txt | tail -1; echo "por hunspell: $(grep -c "falta hunspell" $W/annul-base-image.txt) · por xelatex: $(grep -ciE "xelatex.*(not found|No such)|FileNotFoundError.*xelatex" $W/annul-base-image.txt)"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
