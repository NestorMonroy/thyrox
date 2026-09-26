#!/usr/bin/env python3
"""Cubre en la memoria los archivos que el gate 3b declara sin patrón.

El agente del pool nombra patrones con una señal escrita a mano, y en 32 de
134 archivos del paso 110 esa señal no casaba con sus propios objetivos. Aquí
la señal se DERIVA de los objetivos: el mensaje de tsc con los literales
entre comillas y los números generalizados, anclado al código TS. Un patrón
por plantilla de mensaje, compartido entre archivos; el nombre es el que el
agente dio al archivo si lo dio, o uno derivado del código y el mensaje.
Uso: cover_uncovered.py <run> <batch-dir> <outputs> <archivo> [<archivo> ...]
"""
import json, re, subprocess, sys
from pathlib import Path

run, batch, outputs, files = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4:]
targets: dict[str, list[str]] = {}
for line in (batch / "candidates.jsonl").read_text().splitlines():
    cand = json.loads(line)
    file = cand["proposal_id"].split("pool:", 1)[-1]
    targets[file] = cand.get("targets", [])
names: dict[str, str] = {}
index = dict(l.split("\t", 1) for l in (outputs / "index.tsv").read_text().splitlines() if "\t" in l)
for n, item in index.items():
    try:
        block = re.search(r"\{.*\}", json.loads((outputs / f"{n}.json").read_text()).get("result", ""), re.S)
        pats = json.loads(block.group(0)).get("patterns", []) if block else []
    except Exception:
        continue
    if pats and pats[0].get("patron"):
        names.setdefault(item.split()[0], pats[0]["patron"])
known = {json.loads(l)["signal"]: json.loads(l)["name"]
         for l in (run / "patterns.jsonl").read_text().splitlines()}

def template(target: str) -> str:
    code, msg = re.match(r"^[^:]+: (TS\d+): (.*)$", target).groups()
    parts = re.split(r"('[^']*'|\"[^\"]*\"|\b\d+\b)", msg)
    body = "".join(".+?" if i % 2 else re.escape(p) for i, p in enumerate(parts))
    return f": {code}: {body}$"

def sweep(*args):
    subprocess.run(["bash", "bin/tsc_sweep", args[0], "--run", str(run), *args[1:]],
                   check=True, capture_output=True, text=True)

for file in files:
    for signal in sorted({template(t) for t in targets.get(file, [])}):
        name = known.get(signal)
        if name is None:
            base = names.get(file) or "ts" + re.search(r"TS(\d+)", signal).group(1) + "-" + "-".join(
                w.lower() for w in re.findall(r"[A-Za-z]{3,}", signal)[:5])
            name = base if base not in known.values() else f"{base}-{len(known)}"
            sweep("add-pattern", "--name", name, "--signal", signal,
                  "--fix", f"Derivado de los objetivos de {file}; ver su diff en el paso.")
            known[signal] = name
        sweep("applied", "--name", name, file)
    print(file, "cubierto")
