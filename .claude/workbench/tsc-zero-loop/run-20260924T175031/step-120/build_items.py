#!/usr/bin/env python3
"""Arma los ítems del pool (ruta 3) desde un log de tsc.

Toma cada diagnóstico con sus líneas encadenadas, descarta los archivos
excluidos, agrupa por archivo y parte en trozos de a lo sumo `size`
diagnósticos. Cada diagnóstico lleva ±10 líneas de código numeradas, con la
línea del error marcada con '>', como los ítems del paso 114.
Uso: build_items.py <log> <out-dir> <excluidos.txt> [size]
"""
import re
import sys
from collections import OrderedDict
from pathlib import Path

log, out, excluded_file = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
size = int(sys.argv[4]) if len(sys.argv) > 4 else 2
excluded = {line.strip() for line in excluded_file.read_text().splitlines() if line.strip()}
HEAD = re.compile(r"^(?P<file>[^\s(]+)\((?P<line>\d+),(?P<col>\d+)\): error TS\d+:")

diagnostics: "OrderedDict[str, list[tuple[int, list[str]]]]" = OrderedDict()
current = None
for raw in log.read_text().splitlines():
    match = HEAD.match(raw)
    if match:
        current = [raw]
        diagnostics.setdefault(match["file"], []).append((int(match["line"]), current))
    elif raw.startswith(" ") and current is not None:
        current.append(raw)
    else:
        current = None

(out / "diag").mkdir(parents=True, exist_ok=True)
items, n = [], 0
for file, entries in diagnostics.items():
    if file in excluded or not file.startswith("src/") or not Path(file).exists():
        continue
    source = Path(file).read_text().splitlines()
    for start in range(0, len(entries), size):
        n += 1
        blocks = []
        for line, lines in entries[start:start + size]:
            low, high = max(1, line - 10), min(len(source), line + 10)
            context = [f"  --- código {file}:{low}-{high} ---"]
            for number in range(low, high + 1):
                mark = ">" if number == line else " "
                context.append(f"  {number:5d}{mark} {source[number - 1]}")
            blocks.append("\n".join([lines[0], *context, *lines[1:]]))
        path = out / "diag" / f"{n}.txt"
        path.write_text("\n".join(blocks) + "\n")
        items.append(f"{file} {path}")
(out / "items.txt").write_text("\n".join(items) + "\n")
print(f"build_items: {n} ítems sobre {len({i.split()[0] for i in items})} archivos -> {out / 'items.txt'}")
