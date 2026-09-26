"""Parte el porte de `getAttachments` en ítems de pool que no chocan.

Cada función que falta va en su propio ítem, salvo los ayudantes pequeños con
un solo llamador, que viajan con él. Las declaraciones de nivel superior
(tipos y constantes) van en un ítem aparte: si cada ítem las portara, se
duplicarían. Cada ítem tiene su ancla en `attachments.ts`, así que las
ediciones nunca se pisan.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

SMALL = 20  # líneas: por debajo, un ayudante de un solo llamador viaja con él

bench = Path(sys.argv[1])
graph = json.loads((bench / "outputs/call-graph.json").read_text())
ranges = {n: (int(a), int(b)) for n, a, b in
          (l.split("\t") for l in (bench / "outputs/functions.tsv").read_text().splitlines())}
missing = set(graph["missing"])
callers = {k: set(v) for k, v in graph["callers"].items()}

owner: dict[str, str] = {}
for name in missing:
    parents = callers.get(name, set()) & missing
    size = ranges[name][1] - ranges[name][0] + 1
    if len(parents) == 1 and size < SMALL:
        owner[name] = next(iter(parents))
# un ayudante absorbido por otro absorbido sube hasta un dueño que no lo está
def root(name: str) -> str:
    seen = set()
    while name in owner and name not in seen:
        seen.add(name)
        name = owner[name]
    return name

items: dict[str, list[str]] = {}
for name in sorted(missing):
    items.setdefault(root(name), []).append(name)
items["__declarations__"] = []
print(json.dumps({"items": len(items), "functions": len(missing),
                  "absorbed": len(missing) - (len(items) - 1)}))
(bench / "outputs/items.json").write_text(json.dumps(items, indent=1))
