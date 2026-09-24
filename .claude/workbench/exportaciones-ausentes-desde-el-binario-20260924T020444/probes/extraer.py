"""Recorta de un chunk del binario el cuerpo de cada nombre minificado dado.

    python3 probes/extraer.py <chunk.js> <salida-dir> <original>=<minificado> ...

Sonda de lectura: el cuerpo es evidencia del contrato, no código a portar.
"""
import pathlib
import re
import sys

source = pathlib.Path(sys.argv[1]).read_text(errors="ignore")
out = pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
for pair in sys.argv[3:]:
    name, mini = pair.split("=")
    m = re.search(r"(async\s+function\*?|function\*?)\s*" + re.escape(mini) + r"\s*\(", source)
    if not m:
        print(f"{name}\t{mini}\t0")
        continue
    start = source.find("{", m.start())
    depth, end = 0, start
    while end < len(source):
        depth += {"{": 1, "}": -1}.get(source[end], 0)
        if depth == 0:
            break
        end += 1
    body = source[m.start():end + 1]
    (out / f"{name}.min.js").write_text(body)
    print(f"{name}\t{mini}\t{len(body)}")
