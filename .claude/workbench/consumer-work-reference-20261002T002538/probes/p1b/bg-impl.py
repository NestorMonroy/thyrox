from pathlib import Path
t = Path('tests/session/test-bg-managed-execution.sh'); s = t.read_text()
s = s.replace('\nthyrox_summary', Path('/scratch/p1b/bg-case.sh').read_text() + '\nthyrox_summary', 1); t.write_text(s)
b = Path('src/session/bg.sh'); s = b.read_text()
pairs = [
 ('local task="" kind="" network=""', 'local task="" work="" kind="" network=""'),
 ('            --task) task="${2:-}"; shift 2 ;;\n', '            --task) task="${2:-}"; shift 2 ;;\n            --work) work="${2:-}"; shift 2 ;;\n'),
 ('    if [[ -n "$task" ]]; then\n        [[ -n "$kind" ]] || { echo "bg.sh start: --task exige --kind (el tipo de ejecución de la autorización)." >&2; exit 2; }\n        local runner=() authorization=(run --task "$task" --kind "$kind") item',
  '    # --work cita el trabajo de un consumidor con su propia identidad; --task, una tarea de thyrox.\n    if [[ -n "$task" && -n "$work" ]]; then echo "bg.sh start: --task y --work van por separado." >&2; exit 2; fi\n    if [[ -n "$task" || -n "$work" ]]; then\n        [[ -n "$kind" ]] || { echo "bg.sh start: --task/--work exige --kind (el tipo de ejecución de la autorización)." >&2; exit 2; }\n        local runner=() authorization=(run) item\n        if [[ -n "$task" ]]; then authorization+=(--task "$task"); else authorization+=(--work "$work"); fi\n        authorization+=(--kind "$kind")'),
]
for old, new in pairs:
    assert s.count(old) == 1, old[:60]; s = s.replace(old, new)
b.write_text(s); print('ok')
