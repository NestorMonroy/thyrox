"""Clasifica cada salida del pool de la ruta compartida (paso 134)."""
import json, pathlib, re, sys
here = pathlib.Path(__file__).resolve().parents[1]
items = (here / "items.txt").read_text().splitlines()
rows = []
for n, item in enumerate(items, 1):
    data = json.loads((here / "outputs" / f"{n}.json").read_text() or "{}")
    text = data.get("result") or ""
    edits = '"edits"' in text and '"edits": []' not in text
    distinct = bool(re.search(r"(?i)(distint|different|not the same|no son el mismo|otro tipo|unrelated|diverg)", text))
    kind = ("sin salida" if data.get("subtype") == "error_max_turns"
            else "propuso ediciones" if edits
            else "mismo nombre, otro tipo" if distinct else "sin ediciones, otra razón")
    rows.append((n, item, kind))
for r in rows:
    print(*r, sep="\t")
