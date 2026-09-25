#!/usr/bin/env python3
"""Adjunta a cada diagnóstico del ítem el código que lo rodea.

Paso 106: 19 de 29 trozos (≤8 diagnósticos) agotaron sus 25 turnos, uno en
58 s, sin ninguna denegación de permisos: los turnos se van en EXPLORAR —leer
un archivo grande en tramos, perseguir tipos por otros paquetes—, no en
decidir. Partir más fino no lo arregla porque el costo es el contexto, no la
cantidad de diagnósticos. Aquí el contexto viaja en el ítem: ±`radius`
líneas numeradas alrededor de cada diagnóstico, para que el agente sólo
salga a leer lo que de verdad falta.
Uso: enrich_items.py <items.txt> <out-dir> [radius]
"""
import re, sys
from pathlib import Path

items, out = Path(sys.argv[1]), Path(sys.argv[2])
radius = int(sys.argv[3]) if len(sys.argv) > 3 else 12
head = re.compile(r"^(?P<file>[^(]+)\((?P<line>\d+),\d+\): error ")
(out / "diag").mkdir(parents=True, exist_ok=True)
lines = []
for n, item in enumerate(items.read_text().splitlines(), 1):
    file, diag = item.split()
    code = Path(file).read_text().splitlines()
    parts = []
    for line in Path(diag).read_text().splitlines():
        parts.append(line)
        match = head.match(line)
        if match:
            at = int(match.group("line"))
            lo, hi = max(1, at - radius), min(len(code), at + radius)
            parts.append(f"  --- código {file}:{lo}-{hi} ---")
            parts += [f"  {i:>5}{'>' if i == at else ' '} {code[i - 1]}" for i in range(lo, hi + 1)]
    target = out / "diag" / f"{n}.txt"
    target.write_text("\n".join(parts) + "\n")
    lines.append(f"{file} {target}")
(out / "items.txt").write_text("\n".join(lines) + "\n")
print(f"{len(lines)} ítems con contexto de ±{radius} líneas")
