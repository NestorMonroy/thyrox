# bench-regularize-acn3

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --work ai-course-notes:workbench/bench-convention --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/ai-course-notes && git config --global --add safe.directory /home/user/ai-course-notes >/dev/null 2>&1; B=/home/user/thyrox/.claude/workbench/bench-convention-20261002T062507/probes
python3 - "$B/regularize_benches.py" <<"EOF"
import sys
from pathlib import Path
p = Path(sys.argv[1]); t = p.read_text(encoding="utf-8")
old = """        hits = git(repo, "grep", "-l", "-F", old, "--", str(WORKBENCH)).split()\n"""
new = """        hits = grep_files(repo, old)\n"""
helper = """

def grep_files(repo: Path, text: str) -> list[str]:
    # git grep sale 1 cuando no hay coincidencias: eso es una lista vacia, no un fallo.
    found = subprocess.run(["git", "-C", str(repo), "grep", "-l", "-F", text, "--",
                            str(WORKBENCH)], capture_output=True, text=True)
    if found.returncode not in (0, 1):
        raise SystemExit(f"git grep fallo: {found.stderr.strip()}")
    return found.stdout.split()
"""
assert t.count(old) == 1
t = t.replace(old, new).replace("\n\ndef first_commit_moment", helper + "\n\ndef first_commit_moment", 1)
p.write_text(t, encoding="utf-8")
EOF
python3 -m py_compile $B/regularize_benches.py && rm -rf $B/__pycache__
cd $B && python3 -c "import json,regularize_benches as r; plan=json.load(open(\"plan.json\")); ren={e[\"old\"]: r.new_name(r.REPOS[e[\"repo\"]], e[\"old\"]) for e in plan}; print(r.rewrite_references(r.REPOS[\"ai-course-notes\"], ren))"; rm -rf $B/__pycache__; cd /home/user/ai-course-notes && git status --short | head
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
