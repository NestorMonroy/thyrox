from pathlib import Path
t = Path('tests/session/test-headless-pool-execution-unit.sh'); s = t.read_text()
old = '\necho; echo "$PASS ok'
assert s.count(old) == 1
t.write_text(s.replace(old, Path('/scratch/p5b/identity-case.sh').read_text() + old)); print('ok')
