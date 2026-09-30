#!/usr/bin/env python3
"""Ítems de barrido del paso 4: UNO POR ARCHIVO con todos sus patrones.

El constructor anterior (step-097) daba un ítem por archivo y ronda, con el
primer patrón que lo reclamaba: un archivo con instancias de cinco patrones
necesitaba cinco rondas. Aquí cada ítem lleva todos los patrones abiertos
que siguen vivos en su archivo —nombre, señal, arreglo genérico— y sus
diagnósticos con el código alrededor, numerado.
Uso: build_sweep_items.py <run> <log> <out-dir> [radio]
"""
import json, re, sys
from collections import defaultdict
from pathlib import Path
sys.path.insert(0, "src")
from verify.tsc_reflect import blocking_pending, _read_jsonl, PATTERNS
from verify.analyze_typescript_diagnostics import DIAGNOSTIC, diagnostic_key

run, log, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
radius = int(sys.argv[4]) if len(sys.argv) > 4 else 10
lines = log.read_text().splitlines()
pending = blocking_pending(run, lines, [])
rows = {r["name"]: r for r in _read_jsonl(run / PATTERNS)}
by_file: dict[str, list[str]] = defaultdict(list)
for name, files in pending.items():
    for file in files:
        by_file[file].append(name)
(out / "diag").mkdir(parents=True, exist_ok=True)
items = []
for n, (file, names) in enumerate(sorted(by_file.items()), 1):
    code = Path(file).read_text().splitlines()
    parts = []
    for name in names:
        row = rows[name]
        parts += [f"patron: {name}", f"senal_del_verificador: {row['signal']}", f"fix_generico: {row['fix']}", ""]
    parts.append("diagnósticos de este archivo que casan alguna de esas señales:")
    signals = [re.compile(rows[name]["signal"]) for name in names]
    for line in lines:
        m = DIAGNOSTIC.match(line)
        if not m or m.group("file") != file or not any(s.search(diagnostic_key(m)) for s in signals):
            continue
        at = int(m.group("line"))
        lo, hi = max(1, at - radius), min(len(code), at + radius)
        parts.append(line)
        parts.append(f"  --- código {file}:{lo}-{hi} ---")
        parts += [f"  {i:>5}{'>' if i == at else ' '} {code[i - 1]}" for i in range(lo, hi + 1)]
    target = out / "diag" / f"{n}.txt"
    target.write_text("\n".join(parts) + "\n")
    items.append(f"{file} {target}")
(out / "items.txt").write_text("\n".join(items) + "\n")
print(f"{len(items)} ítems (uno por archivo) · {sum(len(v) for v in by_file.values())} pares patrón-archivo")
