#!/usr/bin/env python3
"""Convierte la salida del barrido (paso 4) de headless-pool en candidatos.

Variante de step-097/assemble_pool_candidates.py para el barrido: cada item
nombra UN patrón, así que los objetivos del candidato son las instancias de
ese patrón en su archivo (la señal de la memoria acotada al archivo), no
todos los diagnósticos del archivo. No pasa `--run` a agent_proposal: el
gate 4 por candidato bloquearía cada item por las instancias que viven en
los otros archivos del mismo barrido; el gate 4 se exige al cerrar el paso
(`tsc_reflect gate-sweep`). Filtra además `as never`, que el paso 097 dejó
pasar.
Uso: assemble_sweep_candidates.py <banco-del-barrido> <log-partida> <run>
"""
import json, re, subprocess, sys
from pathlib import Path
bench, before, run = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
SILENCE = re.compile(r"\bas any\b|:\s*any\b|<any>|as unknown as|\bas never\b|@ts-ignore|@ts-expect-error")
signals = {json.loads(l)["name"]: json.loads(l)["signal"] for l in (run / "patterns.jsonl").read_text().splitlines()}
index = dict(line.split("\t", 1) for line in (bench / "outputs/index.tsv").read_text().splitlines() if "\t" in line)
out = (bench / "candidates.jsonl").open("w")
summary = []
for n, item in sorted(index.items(), key=lambda kv: int(kv[0])):
    file, diag = item.split()[0], item.split()[1]
    header = Path(diag).read_text().splitlines()[0]
    name = header.split(":", 1)[1].strip() if header.startswith("patron:") else ""
    try:
        result = json.loads((bench / "outputs" / f"{n}.json").read_text()).get("result", "")
        block = re.search(r"\{.*\}", result, re.S)
        proposal = json.loads(block.group(0)) if block else {"edits": []}
    except Exception as error:
        summary.append(f"{file}: sin propuesta legible ({error.__class__.__name__})"); continue
    path = Path(file); text = path.read_text(); original = text
    applied, dropped = 0, []
    for edit in proposal.get("edits", []):
        old, new = edit.get("old", ""), edit.get("new", "")
        if SILENCE.search(new) and not SILENCE.search(old):
            dropped.append("silencia"); continue
        if not old or text.count(old) != 1:
            dropped.append("old no único"); continue
        text = text.replace(old, new); applied += 1
    if not applied:
        summary.append(f"{file}: 0 aplicadas, descartadas {dropped}"); continue
    path.write_text(text)
    pattern = "^" + re.escape(file) + r": (?=.*(?:" + signals[name] + "))" if name in signals else "^" + re.escape(file) + r": TS"
    res = subprocess.run([sys.executable, "src/verify/agent_proposal.py", "--before-log", before,
                          "--pattern", pattern, "--id", f"sweep:{name}:{file}", file],
                         capture_output=True, text=True, env={"PYTHONPATH": "src", "PATH": "/usr/bin:/bin"})
    if res.returncode == 0 and res.stdout.strip():
        out.write(res.stdout if res.stdout.endswith("\n") else res.stdout + "\n")
        summary.append(f"{file}: {applied} aplicadas, descartadas {dropped}")
    else:
        path.write_text(original)
        summary.append(f"{file}: agent_proposal rehusó ({res.returncode}): {res.stderr.strip().splitlines()[-1:]}")
out.close()
print("\n".join(summary))
