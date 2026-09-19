"""El verdadero ANTES: specifiers de HEAD resueltos contra el manifiesto de HEAD.

Reusa el desempate de la sonda. Mide el mismo instrumento en los dos estados,
que es lo que la comparacion 136 -> 120 NO hacia.
"""
import json
import pathlib
import re
import subprocess
import sys

sys.path.insert(0, '.claude/workbench/subpath-sin-declarar-config-20260919T091703/probes')
from census_unresolved_subpaths import resolve  # noqa: E402

SPECIFIER = re.compile(r"['\"]@thyrox/([a-z0-9-]+)/([A-Za-z0-9_./-]+)['\"]")
state = sys.argv[1]


def read(path: str) -> str | None:
    if state == 'head':
        blob = subprocess.run(["git", "show", f"HEAD:{path}"], capture_output=True, text=True)
        return None if blob.returncode else blob.stdout
    try:
        return pathlib.Path(path).read_text(errors="ignore")
    except OSError:
        return None


listing = subprocess.run(["git", "ls-files", "src/", "tests/"],
                         capture_output=True, text=True, check=True).stdout.split()
subpaths = set()
for path in listing:
    if not path.endswith(('.ts', '.tsx')):
        continue
    text = read(path)
    if text is None:
        continue
    for package, subpath in SPECIFIER.findall(text):
        if package == 'config':
            subpaths.add(subpath)

manifest = json.loads(read('src/packages/config/package.json'))['exports']
exports = {k: v for k, v in manifest.items() if isinstance(v, str)}
root = pathlib.Path('src/packages/config')

unresolved = []
for subpath in sorted(subpaths):
    target = resolve(subpath, exports)
    if target is None or not (root / target).exists():
        unresolved.append((subpath, target))

print(f"estado: {state} | specifiers: {len(subpaths)} | entradas exports: {len(exports)} | sin resolver: {len(unresolved)}")
for subpath, target in unresolved:
    print(f"  {subpath} -> {target or '(ninguna entrada lo alcanza)'}")
