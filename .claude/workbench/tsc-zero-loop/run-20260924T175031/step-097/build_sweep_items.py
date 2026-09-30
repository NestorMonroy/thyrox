#!/usr/bin/env python3
"""Items del paso 4 (barrido): un patrón abierto de la memoria y un archivo
donde su señal sigue viva, con los diagnósticos que la casan.

Usa `tsc_reflect.blocking_pending`, el mismo cálculo que el gate 4: lo que
este barrido no cubra lo verá el gate al cerrar. Un archivo entra una sola
vez por ronda (con el primer patrón que lo reclama), para que dos items no
editen el mismo archivo. Escribe <out>/diag/<n>.txt e imprime una línea
`archivo diag` por item.
Uso: build_sweep_items.py <run> <log> <out>
"""
import json, re, sys
from pathlib import Path
sys.path.insert(0, "src")
from verify.tsc_reflect import blocking_pending, _read_jsonl, PATTERNS
from verify.analyze_typescript_diagnostics import DIAGNOSTIC, diagnostic_key
run, log, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
lines = log.read_text().splitlines()
rows = {r["name"]: r for r in _read_jsonl(run / PATTERNS)}
pending = blocking_pending(run, lines, [])
(out / "diag").mkdir(parents=True, exist_ok=True)
taken, n, items = set(), 0, []
for name, found in pending.items():
    row = rows[name]; signal = re.compile(row["signal"])
    for file in sorted(found):
        if file in taken:
            continue
        taken.add(file); n += 1
        diag = [f"patron: {name}", f"senal_del_verificador: {row['signal']}",
                f"fix_generico: {row['fix']}", "", "diagnósticos de este archivo que casan la señal:"]
        for i, line in enumerate(lines):
            m = DIAGNOSTIC.match(line)
            if m and m.group("file") == file and signal.search(diagnostic_key(m)):
                diag.append(line)
                j = i + 1
                while j < len(lines) and lines[j].startswith("  "):
                    diag.append(lines[j]); j += 1
        path = out / "diag" / f"{n}.txt"
        path.write_text("\n".join(diag) + "\n")
        items.append({"n": n, "file": file, "pattern": name, "instances": found[file]})
        print(f"{file} {path}")
(out / "sweep-items.json").write_text(json.dumps(items, ensure_ascii=False, indent=1))
print(f"# items={n} patrones={len(pending)}", file=sys.stderr)
