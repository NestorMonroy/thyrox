#!/usr/bin/env python3
"""Gate 3b para un paso de propuestas del pool: la memoria de lo conservado.

Por cada propuesta `pool:<archivo>` aceptada lee la salida de su item:
- con `patterns` (plantilla v3): registra cada patrón con sus 4 campos
  (`tsc_sweep add-pattern`) y el archivo en su `applied`;
- con `pattern` (plantilla de barrido): marca el archivo como aplicado en
  ese patrón, que ya está en la memoria;
- sin ninguno (plantilla v1): NO inventa un patrón; lo lista para que se
  clasifique a mano antes de cerrar (el gate 3b lo bloquearía igual).
Escribe <banco>/gate4.json con los patrones revisados en el paso.
Uso: register_pool_memory.py <run> <banco>
"""
import json, re, subprocess, sys
from pathlib import Path
run, bench = Path(sys.argv[1]), Path(sys.argv[2])
report = json.loads((bench / "report.json").read_text())
index = dict(l.split("\t", 1) for l in (bench / "outputs/index.tsv").read_text().splitlines() if "\t" in l)
by_file = {item.split()[0]: n for n, item in index.items()}
def sweep(command, *args):
    subprocess.run(["bash", "bin/tsc_sweep", command, "--run", str(run), *args],
                   check=True, capture_output=True, text=True)
reviewed, unclassified = {}, []
for pid in report.get("accepted", []):
    file = pid.split(":", 1)[1] if pid.startswith("pool:") else None
    if not file or file not in by_file:
        continue
    out = json.loads((bench / "outputs" / f"{by_file[file]}.json").read_text())
    proposal = json.loads(re.search(r"\{.*\}", out.get("result", ""), re.S).group(0))
    if proposal.get("patterns"):
        for p in proposal["patterns"]:
            sweep("add-pattern", "--name", p["patron"], "--signal", p["senal_del_verificador"], "--fix", p["fix_generico"])
            sweep("applied", "--name", p["patron"], file)
            reviewed.setdefault(p["patron"], []).append(file)
    elif proposal.get("pattern"):
        sweep("applied", "--name", proposal["pattern"], file)
        reviewed.setdefault(proposal["pattern"], []).append(file)
    else:
        unclassified.append(file)
record = bench / "gate4.json"
previous = json.loads(record.read_text()).get("reviewed", []) if record.exists() else []
merged = {r["pattern"]: set(r["files"]) for r in previous}
for name, files in reviewed.items():
    merged.setdefault(name, set()).update(files)
record.write_text(json.dumps({"reviewed": [{"pattern": k, "files": sorted(v)} for k, v in merged.items()]},
                             ensure_ascii=False, indent=1))
print(f"patrones revisados: {len(merged)} · archivos sin patrón (clasificar a mano): {len(unclassified)}")
for f in unclassified:
    print("  sin patrón:", f)
