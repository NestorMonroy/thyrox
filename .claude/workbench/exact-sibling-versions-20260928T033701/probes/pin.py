"""Sustituye `"<miembro>": "workspace:*"` por la versión que declara el miembro.

Edita el texto y no reserializa el JSON, para no tocar el formato. Rehúsa si
un hermano citado no existe o no declara versión.
"""
import json
import re
import sys
from pathlib import Path

root = Path(sys.argv[1])
manifests = [root / "package.json", *sorted((root / "src/packages").glob("*/package.json"))]
versions = {}
for path in manifests:
    data = json.loads(path.read_text())
    if path != root / "package.json" and data.get("name"):
        versions[data["name"]] = data.get("version")

SPEC = re.compile(r'("(@?[\w.-]+(?:/[\w.-]+)?)"\s*:\s*)"workspace:[^"]*"')
changed = 0
for path in manifests:
    text = path.read_text()

    def pin(m):
        version = versions.get(m.group(2))
        if not version:
            sys.exit(f"REHUSA — {path}: {m.group(2)} sin versión declarada")
        return f'{m.group(1)}"{version}"'

    new, n = SPEC.subn(pin, text)
    if n:
        path.write_text(new)
        changed += n
        print(f"{path.relative_to(root)}: {n}")
print(f"total: {changed}")
