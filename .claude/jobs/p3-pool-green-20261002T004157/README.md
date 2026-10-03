# p3-pool-green

## Qué se lanzó

```
bun /home/user/thyrox/src/packages/podman-execution/bin/execute.ts run --task TASK-THYROX-0758 --kind test --network host --mount /home/user/ai-course-notes:/home/user/ai-course-notes:rw --mount /tmp/claude-0/-home-user/81a17524-87b5-5e9d-997b-0732e892d302/scratchpad:/scratch:ro -- bash -c cd /home/user/thyrox && git config --global --add safe.directory /home/user/thyrox >/dev/null 2>&1; python3 /scratch/p3/pool-impl.py && bash tests/session/test-headless-pool-model-policy.sh 2>&1 | tail -2; python3 tests/session/test_headless_pool_boundary.py 2>&1 | tail -1; W=.claude/workbench/execution-policy-20261002/outputs; python3 /tmp/annul-sh.py 2>/dev/null; cat > /tmp/annul-sh.py <<'PY2'
import subprocess, sys
from pathlib import Path
bench, cmd, *cases = sys.argv[1:]
for case in cases:
    name, rest = case.split('=', 1); path, old, new = rest.split('::')
    p = Path(path); o = p.read_text(); assert o.count(old) == 1, name
    p.write_text(o.replace(old, new))
    try: out = subprocess.run(['bash','-c',cmd], capture_output=True, text=True).stdout
    finally: p.write_text(o)
    Path(bench, f'annul-{name}.txt').write_text(out)
    print(f'== {name}:'); [print('   ', l[:100]) for l in out.splitlines() if 'FALLA' in l]
PY2
python3 /tmp/annul-sh.py $W 'bash tests/session/test-headless-pool-model-policy.sh 2>&1'  "pool-policy-arg=src/session/headless-pool.sh::\${MODEL_POLICY:+--policy \"\$MODEL_POLICY\"} --json::--json"  "pool-blocked=src/session/headless-pool.sh::    [[ \"\$rc\" -ne 3 ]] || rehusa::    true || rehusa"  "pool-ensure-guard=src/session/headless-pool.sh::    [[ \"\$POLICY_FALLBACK\" != false ]] \\::    true \\"  "pool-runtime-guard=src/session/headless-pool.sh::    [[ \"\$POLICY_FALLBACK\" != false || \"\$RUNTIME\" == \"\$LOCAL_RUNTIME\" ]] \\::    true \\"  "pool-fallback-declared=src/session/headless-pool.sh::    [[ \"\$POLICY_FALLBACK\" == true || \"\$POLICY_FALLBACK\" == false ]] \\::    true \\"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
