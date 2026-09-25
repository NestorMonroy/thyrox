#!/usr/bin/env python3
"""Convierte la salida de headless-pool (una propuesta de ediciones por
archivo) en candidatos del lazo tsc cero.

Por item: extrae el bloque JSON de `result`, descarta las ediciones que
silencian (`any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error`) o cuyo
`old` no aparece exactamente una vez, aplica las demás sobre el archivo y
llama a `agent_proposal.py`, que emite el candidato con sus objetivos (los
diagnósticos del archivo en el log de partida) y restaura el archivo.
Publica por item: aplicadas, descartadas y su razón.
Uso: assemble_pool_candidates.py <banco> <log-partida> <run>
"""
import json, re, subprocess, sys
from pathlib import Path
bench, before, run = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
SILENCE = re.compile(r"\bas any\b|:\s*any\b|<any>|as unknown as|\bas never\b|@ts-ignore|@ts-expect-error")
index = dict(line.split("\t", 1) for line in (bench / "outputs/index.tsv").read_text().splitlines() if "\t" in line)
out = (bench / "candidates.jsonl").open("w")
summary = []
for n, item in sorted(index.items(), key=lambda kv: int(kv[0])):
    file = item.split()[0]
    raw = bench / "outputs" / f"{n}.json"
    try:
        result = json.loads(raw.read_text()).get("result", "")
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
    pattern = "^" + re.escape(file) + r": TS"
    res = subprocess.run([sys.executable, "src/verify/agent_proposal.py", "--before-log", before,
                          "--pattern", pattern, "--id", f"pool:{file}", file],
                         capture_output=True, text=True, env={"PYTHONPATH": "src", "PATH": "/usr/bin:/bin"})
    if res.returncode == 0 and res.stdout.strip():
        out.write(res.stdout if res.stdout.endswith("\n") else res.stdout + "\n")
        summary.append(f"{file}: {applied} aplicadas, descartadas {dropped}")
    else:
        path.write_text(original)
        summary.append(f"{file}: agent_proposal rehusó ({res.returncode}): {res.stderr.strip().splitlines()[-1:]}")
out.close()
print("\n".join(summary))
