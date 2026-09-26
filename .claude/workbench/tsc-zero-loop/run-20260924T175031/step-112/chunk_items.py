#!/usr/bin/env python3
"""Parte en trozos los ítems que un agente no pudo cerrar en su presupuesto.

Paso 106: todos los ítems que fallaron lo hicieron por `error_max_turns` (26
turnos) sin entregar nada, y son los archivos con más diagnósticos. Pedirle
al modelo que responda "al turno 20" no funciona: no cuenta sus turnos. Lo
que funciona es un ítem más chico: a lo sumo `size` diagnósticos por ítem.
Cada trozo lleva sus líneas encadenadas. El ensamblador junta después los
trozos del mismo archivo en UN candidato.
Uso: chunk_items.py <items.txt> <outputs> <out-dir> [size]
"""
import json, sys
from pathlib import Path

items, outputs, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
size = int(sys.argv[4]) if len(sys.argv) > 4 else 8
(out / "diag").mkdir(parents=True, exist_ok=True)
lines, n = [], 0
for index, item in enumerate(items.read_text().splitlines(), 1):
    file, diag = item.split()
    result = outputs / f"{index}.json"
    # Paso 112: una salida vacía o ilegible (el ítem murió por timeout) también
    # se reintenta; antes el json.loads de esa salida abortaba el guion entero.
    try:
        subtype = json.loads(result.read_text()).get("subtype") if result.exists() else None
    except ValueError:
        subtype = None
    if subtype not in (None, "error_max_turns"):
        continue
    blocks, current = [], None
    for line in Path(diag).read_text().splitlines():
        if line.startswith(" ") and current is not None:
            current.append(line)
        else:
            current = [line]
            blocks.append(current)
    for start in range(0, len(blocks), size):
        n += 1
        chunk = out / "diag" / f"{n}.txt"
        chunk.write_text("\n".join(l for b in blocks[start:start + size] for l in b) + "\n")
        lines.append(f"{file} {chunk}")
(out / "items.txt").write_text("\n".join(lines) + "\n")
print(f"{n} trozos de a lo sumo {size} diagnósticos")
