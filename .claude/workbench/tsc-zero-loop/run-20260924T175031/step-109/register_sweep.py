#!/usr/bin/env python3
"""Memoria del barrido multi-patrón (paso 4).

Por cada salida del pool: los archivos que el paso conservó suman a
`applied` de los patrones que sus ediciones nombran; las instancias que el
agente declaró de OTRA causa (`skipped`) se registran como exclusión del
patrón en ese archivo, con su razón. Así el gate 4 ve una salida declarada
para cada instancia, en vez de bloquear para siempre por una señal que
también casa otra causa.
Uso: register_sweep.py <run> <items.txt> <outputs> <files_kept.txt> <gate4.json>
"""
import json, re, subprocess, sys
from pathlib import Path
run, items, outputs, kept_path, gate4 = (Path(a) for a in sys.argv[1:6])
kept = set(kept_path.read_text().split())
known = {json.loads(l)["name"] for l in (run / "patterns.jsonl").read_text().splitlines()}

def sweep(*args):
    subprocess.run(["bash", "bin/tsc_sweep", args[0], "--run", str(run), *args[1:]], check=True,
                   capture_output=True, text=True)

applied, excluded = {}, {}
for n, line in enumerate(items.read_text().splitlines(), 1):
    file = line.split()[0]
    try:
        data = json.loads((outputs / f"{n}.json").read_text())
        proposal = json.loads(re.search(r"\{.*\}", data.get("result", "") or "", re.S).group(0))
    except Exception:
        continue
    if file in kept:
        for name in {e.get("patron") for e in proposal.get("edits", []) if e.get("patron") in known}:
            applied.setdefault(name, []).append(file)
    for skip in proposal.get("skipped", []):
        name = skip.get("patron")
        if name in known and skip.get("razon"):
            excluded.setdefault(name, {})[file] = skip["razon"][:400]
for name, files in applied.items():
    sweep("applied", "--name", name, *files)
for name, files in excluded.items():
    for file, reason in files.items():
        sweep("exclude", "--name", name, "--reason", f"El barrido lo juzgó de otra causa: {reason}", file)
gate4.write_text(json.dumps({"reviewed": [{"pattern": k, "files": sorted(set(v))} for k, v in applied.items()]
                             + [{"pattern": k, "excluded": sorted(v)} for k, v in excluded.items()]},
                            ensure_ascii=False, indent=1))
print(f"aplicados: {sum(len(v) for v in applied.values())} pares · excluidos con razón: "
      f"{sum(len(v) for v in excluded.values())} pares")
