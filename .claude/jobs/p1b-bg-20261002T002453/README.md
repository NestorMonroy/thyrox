# p1b-bg

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0756 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; W=.claude/workbench/consumer-work-reference-20261002/outputs; git stash list >/dev/null; cp src/session/bg.sh /tmp/bg.orig; python3 - <<PY2
from pathlib import Path
t=Path("tests/session/test-bg-managed-execution.sh"); s=t.read_text(); t.write_text(s.replace("\nthyrox_summary", Path("/scratch/p1b/bg-case.sh").read_text()+"\nthyrox_summary",1))
PY2
bash tests/session/test-bg-managed-execution.sh > $W/red-bg.txt 2>&1; grep -cE "FALLA|^not ok|✗" $W/red-bg.txt; git checkout -- tests/session/test-bg-managed-execution.sh; python3 /scratch/p1b/bg-impl.py && bash tests/session/test-bg-managed-execution.sh 2>&1 | tail -3
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
