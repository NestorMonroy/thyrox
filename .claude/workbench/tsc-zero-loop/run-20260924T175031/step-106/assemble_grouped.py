#!/usr/bin/env python3
"""Ensambla las propuestas del pool AGRUPADAS por archivo.

Con ítems partidos en trozos, varias salidas proponen sobre el mismo
archivo; como candidatos separados competirían en el paso (mismos archivos,
bases que se invalidan). Aquí se juntan: por archivo se aplican en orden las
ediciones de todas sus salidas (se descarta la que silencia o cuyo `old` ya
no es único tras las anteriores) y se emite UN candidato con agent_proposal,
que restaura el archivo. Filtra `as never` y no pasa `--run` (el gate 4 se
exige al cerrar).
Uso: assemble_grouped.py <log-partida> <candidatos.jsonl> <outputs> [<outputs> ...]
"""
import json, re, subprocess, sys
from collections import defaultdict
from pathlib import Path
before, out_path, dirs = sys.argv[1], Path(sys.argv[2]), [Path(d) for d in sys.argv[3:]]
SILENCE = re.compile(r"\bas any\b|:\s*any\b|<any>|as unknown as|\bas never\b|@ts-ignore|@ts-expect-error")
edits_by_file = defaultdict(list)
unreadable = []
for outputs in dirs:
    index = dict(l.split("\t", 1) for l in (outputs / "index.tsv").read_text().splitlines() if "\t" in l)
    for n, item in sorted(index.items(), key=lambda kv: int(kv[0])):
        file = item.split()[0]
        try:
            data = json.loads((outputs / f"{n}.json").read_text())
            block = re.search(r"\{.*\}", data.get("result", ""), re.S)
            proposal = json.loads(block.group(0)) if block else {"edits": []}
        except Exception as error:
            unreadable.append(f"{outputs.name}/{n}: {error.__class__.__name__}"); continue
        edits_by_file[file].extend(proposal.get("edits", []))
summary = []
with out_path.open("w") as out:
    for file, edits in sorted(edits_by_file.items()):
        path = Path(file); original = path.read_text(); text = original
        applied, dropped = 0, []
        for edit in edits:
            old, new = edit.get("old", ""), edit.get("new", "")
            if SILENCE.search(new) and not SILENCE.search(old):
                dropped.append("silencia"); continue
            if not old or text.count(old) != 1:
                dropped.append("old no único"); continue
            text = text.replace(old, new); applied += 1
        if not applied:
            summary.append(f"{file}: 0 aplicadas {dropped}"); continue
        path.write_text(text)
        res = subprocess.run([sys.executable, "src/verify/agent_proposal.py", "--before-log", before,
                              "--pattern", "^" + re.escape(file) + r": TS", "--id", f"pool:{file}", file],
                             capture_output=True, text=True, env={"PYTHONPATH": "src", "PATH": "/usr/bin:/bin"})
        if res.returncode == 0 and res.stdout.strip():
            out.write(res.stdout if res.stdout.endswith("\n") else res.stdout + "\n")
            summary.append(f"{file}: {applied} aplicadas, descartadas {dropped}")
        else:
            path.write_text(original)
            summary.append(f"{file}: agent_proposal rehusó ({res.returncode})")
print("\n".join(summary + [f"ilegible {u}" for u in unreadable]))
