"""annul.py <banco> <ruta-de-pruebas> <comando-de-prueba> <nombre>=<archivo>::<viejo>::<nuevo> ...
Retira cada guarda por separado, corre la prueba, restaura, y deja annul-<nombre>.txt."""
import subprocess, sys
from pathlib import Path
bench, cwd, cmd, *cases = sys.argv[1:]
for case in cases:
    name, rest = case.split('=', 1)
    path, old, new = rest.split('::')
    p = Path(path); original = p.read_text()
    assert original.count(old) == 1, (name, old)
    p.write_text(original.replace(old, new))
    try:
        out = subprocess.run(['bash', '-c', cmd], cwd=cwd, capture_output=True, text=True).stdout + ''
    finally:
        p.write_text(original)
    Path(bench, f'annul-{name}.txt').write_text(out)
    fails = [l for l in out.splitlines() if l.startswith('(fail)')]
    print(f'== {name}: {len(fails)} caen'); [print('   ', l[:150]) for l in dict.fromkeys(fails)]
