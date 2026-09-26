#!/usr/bin/env python3
"""Registra en la memoria los patrones que nombraron las salidas del pool
(plantilla v3) para cada archivo que el paso conservó, juntando las salidas
de la pasada completa y de los trozos. Un patrón ya registrado sólo suma el
archivo a `applied`. Escribe <banco>/gate4.json e imprime los archivos sin
patrón nombrado, que se clasifican a mano.
Uso: register_memory.py <run> <banco> <outputs> [<outputs> ...]
"""
import json, re, subprocess, sys
from pathlib import Path
run, bench, dirs = Path(sys.argv[1]), Path(sys.argv[2]), [Path(d) for d in sys.argv[3:]]
report = json.loads((bench / "report.json").read_text())
kept = {pid.split("pool:", 1)[1] for pid in report["accepted"] if "pool:" in pid}
known = {json.loads(l)["name"] for l in (run / "patterns.jsonl").read_text().splitlines()}
by_file: dict[str, list[dict]] = {}
for outputs in dirs:
    index = dict(l.split("\t", 1) for l in (outputs / "index.tsv").read_text().splitlines() if "\t" in l)
    for n, item in index.items():
        file = item.split()[0]
        try:
            block = re.search(r"\{.*\}", json.loads((outputs / f"{n}.json").read_text()).get("result", ""), re.S)
            by_file.setdefault(file, []).extend(json.loads(block.group(0)).get("patterns", []) if block else [])
        except Exception:
            continue
def sweep(*args):
    subprocess.run(["bash", "bin/tsc_sweep", *args[:1], "--run", str(run), *args[1:]], check=True,
                   capture_output=True, text=True)
reviewed: dict[str, list[str]] = {}
unclassified = []
for file in sorted(kept):
    patterns = [p for p in by_file.get(file, []) if p.get("patron") and p.get("senal_del_verificador")]
    if not patterns:
        unclassified.append(file); continue
    for p in patterns:
        name = p["patron"]
        # La memoria casa claves «archivo: TSnnnn: mensaje», sin la palabra
        # «error» de la línea del log; una señal escrita con ella nunca casa.
        p["senal_del_verificador"] = re.sub(r"(^|\|)error (TS\d)", r"\1\2", p["senal_del_verificador"])
        if name not in known:
            try:
                re.compile(p["senal_del_verificador"])
            except re.error:
                continue
            sweep("add-pattern", "--name", name, "--signal", p["senal_del_verificador"],
                  "--fix", p.get("fix_generico", ""))
            known.add(name)
        sweep("applied", "--name", name, file)
        reviewed.setdefault(name, []).append(file)
(bench / "gate4.json").write_text(json.dumps(
    {"reviewed": [{"pattern": k, "files": sorted(set(v))} for k, v in reviewed.items()]}, ensure_ascii=False, indent=1))
print(f"patrones revisados: {len(reviewed)} · sin patrón: {len(unclassified)}")
for f in unclassified:
    print("  sin patrón:", f)
