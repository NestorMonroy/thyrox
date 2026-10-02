# bench-regularize-acn2

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --work ai-course-notes:workbench/bench-convention --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/ai-course-notes && git config --global --add safe.directory /home/user/ai-course-notes >/dev/null 2>&1; B=/home/user/thyrox/.claude/workbench/bench-convention-20261002T062507/probes
python3 - "$B/regularize_benches.py" <<"EOF"
import sys
from pathlib import Path
p = Path(sys.argv[1]); t = p.read_text(encoding="utf-8")
old = """        hits = git(repo, "grep", "-l", "-F", old, "--", str(WORKBENCH)).split()\n"""
new = """        hits = grep_files(repo, old)\n"""
helper = 
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
