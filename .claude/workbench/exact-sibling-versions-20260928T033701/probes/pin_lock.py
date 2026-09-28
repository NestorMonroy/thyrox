"""Lleva a `bun.lock` los especificadores que ya declaran los manifiestos.

Bun 1.3.11 no reescribe la sección `workspaces` del lock cuando un hermano
pasa de `workspace:*` a versión exacta (ni con `--force`), y regenerarlo
desde cero re-resuelve dependencias externas. Esta sustitución toca sólo los
especificadores `"<miembro>": "workspace:*"` de esa sección; lo valida
`bun install --frozen-lockfile`.
"""
import json
import re
import sys
from pathlib import Path

root = Path(sys.argv[1])
versions = {}
for path in sorted((root / "src/packages").glob("*/package.json")):
    data = json.loads(path.read_text())
    if data.get("name"):
        versions[data["name"]] = data.get("version")

lock = root / "bun.lock"
text = lock.read_text()
SPEC = re.compile(r'("(@?[\w.-]+(?:/[\w.-]+)?)"\s*:\s*)"workspace:[^"]*"')
new, n = SPEC.subn(lambda m: f'{m.group(1)}"{versions[m.group(2)]}"', text)
lock.write_text(new)
print(f"bun.lock: {n}")
