# p7-annul-rerun

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --work ai-course-notes:es-mx/executor-qwen --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/ai-course-notes && git config --global --add safe.directory /home/user/ai-course-notes >/dev/null 2>&1; python3 /scratch/annul-sh.py /tmp 'uv run --locked pytest -q tests/test_translation_loop.py -k "consumer_policy or readable_policy" 2>&1 | sed "s/^FAILED/  FALLA/"' "loop-policy-readable=tools/scripts/translation_loop.py::    if not Path(args.model_policy).is_file():::    if False:"; grep -E 'passed|failed' /tmp/annul-loop-policy-readable.txt
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
