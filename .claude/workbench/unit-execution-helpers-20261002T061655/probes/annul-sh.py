"""annul-sh.py <banco> <comando> <nombre>=<archivo>::<viejo>::<nuevo>...: anula, corre, restaura; lista las FALLA."""
import subprocess, sys
from pathlib import Path
bench, cmd, *cases = sys.argv[1:]
for case in cases:
    name, rest = case.split('=', 1); path, old, new = rest.split('::')
    p = Path(path); o = p.read_text(); assert o.count(old) == 1, name
    p.write_text(o.replace(old, new))
    try: out = subprocess.run(['bash', '-c', cmd], capture_output=True, text=True).stdout
    finally: p.write_text(o)
    Path(bench, f'annul-{name}.txt').write_text(out)
    print(f'== {name}:'); [print('   ', l[:100]) for l in out.splitlines() if 'FALLA' in l]
