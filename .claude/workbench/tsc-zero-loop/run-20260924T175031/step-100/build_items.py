#!/usr/bin/env python3
"""Los N archivos con más diagnósticos del log dado, uno por ítem del pool.

Cada ítem lleva su bloque de diagnósticos (con las líneas de continuación)
en diag/<n>.txt. Se saltan los archivos de las exclusiones de la memoria
(patrones con `exclude`) y los que ya lleva otra candidata en vuelo.
Uso: build_items.py <run> <log> <banco> <n> [archivo-a-saltar ...]
"""
import json, re, sys
from collections import Counter
from pathlib import Path

run, log, bench, n = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), int(sys.argv[4])
skip = set(sys.argv[5:])
head = re.compile(r"^(src/[^(]+)\(\d+,\d+\): error TS\d+")
blocks: dict[str, list[str]] = {}
current = None
for line in log.read_text().splitlines():
    match = head.match(line)
    if match:
        current = match.group(1)
        blocks.setdefault(current, []).append(line)
    elif current and line.startswith(" "):
        blocks[current].append(line)
    else:
        current = None
counts = Counter({f: sum(1 for l in ls if head.match(l)) for f, ls in blocks.items()})
chosen = [f for f, _ in counts.most_common() if f not in skip][:n]
(bench / "diag").mkdir(parents=True, exist_ok=True)
with (bench / "items.txt").open("w") as out:
    for i, file in enumerate(chosen, 1):
        diag = bench / "diag" / f"{i}.txt"
        diag.write_text("\n".join(blocks[file]) + "\n")
        out.write(f"{file} {diag}\n")
print(f"{len(chosen)} ítems; diagnósticos cubiertos: {sum(counts[f] for f in chosen)} de {sum(counts.values())}")
